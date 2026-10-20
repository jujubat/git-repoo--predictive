"""v655 staging-only isolated PostgreSQL integration test."""
import ast
import copy
import os
import uuid
import warnings
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace

# These guards execute before any database connection.
if os.getenv("KSN_STAGING_SEO_TEST_MODE") != "1":
    raise SystemExit("STOP: staging offline mode required")

if "staging" not in os.getenv(
    "RENDER_SERVICE_NAME", ""
).lower():
    raise SystemExit("STOP: Render staging service required")

if os.getenv("KSN_V655_PG_TEST_APPROVED") != "1":
    raise SystemExit("STOP: explicit test approval required")

for flag in (
    "KSN_PROVIDER_LEDGER_ENABLED",
    "KSN_LEDGER_RETENTION_ENABLED",
    "KSN_LEDGER_SCHEDULER_ENABLED",
):
    if os.getenv(flag, "0") != "0":
        raise SystemExit("STOP: " + flag + " must be disabled")

url = os.getenv("DATABASE_URL", "").strip()
if not url:
    raise SystemExit("STOP: staging DATABASE_URL missing")

import psycopg2
from psycopg2 import sql

source = Path("server.py").read_text(encoding="utf-8")

with warnings.catch_warnings():
    warnings.simplefilter("ignore", SyntaxWarning)
    tree = ast.parse(source)

names = {
    "_ksn654_ledger_cleanup_sync",
    "_ksn655_scheduler_allowed",
    "_ksn655_run_once_sync",
}

nodes = [
    copy.deepcopy(node)
    for node in tree.body
    if isinstance(node, ast.FunctionDef)
    and node.name in names
]
assert {node.name for node in nodes} == names

unit = ast.fix_missing_locations(
    ast.Module(body=nodes, type_ignores=[])
)

schema = "ksn_v655_test_" + uuid.uuid4().hex[:16]


class IsolatedDriver:
    @staticmethod
    def connect(*args, **kwargs):
        conn = psycopg2.connect(*args, **kwargs)
        try:
            with conn.cursor() as cur:
                cur.execute(
                    sql.SQL("SET search_path TO {}").format(
                        sql.Identifier(schema)
                    )
                )
                cur.execute("SELECT current_schema()")
                assert cur.fetchone()[0] == schema
            conn.commit()
            return conn
        except Exception:
            conn.close()
            raise


# Override the gate ONLY inside this extracted,
# isolated test namespace. The real Render environment
# remains in staging offline mode with every flag off.
test_os = SimpleNamespace(
    getenv=lambda key, default=None: (
        "0" if key == "KSN_STAGING_SEO_TEST_MODE"
        else os.getenv(key, default)
    )
)

namespace = {
    "os": test_os,
    "DATABASE_URL": url,
    "psycopg2": IsolatedDriver,
    "datetime": datetime,
    "timezone": timezone,
    "_KSN655_SCHEDULER_ENABLED": True,
    "_KSN652_LEDGER_ENABLED": True,
    "_KSN654_RETENTION_ENABLED": True,
}

exec(
    compile(unit, "<isolated-v655-test>", "exec"),
    namespace,
)

cleanup = namespace["_ksn654_ledger_cleanup_sync"]
run_once = namespace["_ksn655_run_once_sync"]

admin = psycopg2.connect(url, connect_timeout=4)
admin.autocommit = True

# Verify the database independently of the Render
# service name, before any schema or table mutation.
try:
    with admin.cursor() as cur:
        cur.execute("SELECT current_database()")
        actual_database_name = cur.fetchone()[0]

    if "staging" not in actual_database_name.lower():
        raise RuntimeError(
            "STOP: connected PostgreSQL database "
            "is not identified as staging"
        )
except BaseException:
    admin.close()
    raise

print("PASS: staging database identity verified")
created = False


def table(name):
    return sql.SQL("{}.{}").format(
        sql.Identifier(schema),
        sql.Identifier(name),
    )


def count(name):
    with admin.cursor() as cur:
        cur.execute(
            sql.SQL("SELECT COUNT(*) FROM {}").format(
                table(name)
            )
        )
        return cur.fetchone()[0]


try:
    with admin.cursor() as cur:
        cur.execute(
            sql.SQL("CREATE SCHEMA {}").format(
                sql.Identifier(schema)
            )
        )
    created = True

    with admin.cursor() as cur:
        cur.execute(
            sql.SQL(
                "CREATE TABLE {} ("
                "minute_utc TIMESTAMPTZ PRIMARY KEY,"
                "team_search_misses INTEGER NOT NULL)"
            ).format(table("ksn_afoot_minute_v652"))
        )
        cur.execute(
            sql.SQL(
                "CREATE TABLE {} ("
                "utc_day DATE PRIMARY KEY,"
                "reserved_calls INTEGER NOT NULL,"
                "updated_at TIMESTAMPTZ DEFAULT now())"
            ).format(table("ksn_afoot_daily_v652"))
        )
        cur.execute(
            sql.SQL(
                "CREATE TABLE {} ("
                "utc_day DATE NOT NULL,"
                "path TEXT NOT NULL,"
                "reserved_calls INTEGER NOT NULL,"
                "PRIMARY KEY (utc_day, path))"
            ).format(table("ksn_afoot_paths_v652"))
        )

        cur.execute(
            "SELECT now(), "
            "(now() AT TIME ZONE 'UTC')::date"
        )
        now, today = cur.fetchone()

        for timestamp in (
            now - timedelta(hours=49),
            now - timedelta(hours=47),
        ):
            cur.execute(
                sql.SQL(
                    "INSERT INTO {} VALUES (%s, 1)"
                ).format(table("ksn_afoot_minute_v652")),
                (timestamp.replace(second=0, microsecond=0),)
            )

        for day in (
            today - timedelta(days=91),
            today - timedelta(days=90),
            today,
        ):
            cur.execute(
                sql.SQL(
                    "INSERT INTO {} "
                    "(utc_day, reserved_calls) "
                    "VALUES (%s, 4)"
                ).format(table("ksn_afoot_daily_v652")),
                (day,)
            )
            cur.execute(
                sql.SQL(
                    "INSERT INTO {} "
                    "(utc_day, path, reserved_calls) "
                    "VALUES (%s, '/fixtures', 4)"
                ).format(table("ksn_afoot_paths_v652")),
                (day,)
            )

    print("PASS: isolated schema and test rows created")

    # A separate PostgreSQL session holds the scheduler
    # lock. Our v655 worker must skip without cleanup.
    holder = psycopg2.connect(url, connect_timeout=4)
    holder.autocommit = True
    try:
        with holder.cursor() as cur:
            cur.execute(
                "SELECT pg_try_advisory_lock(655001)"
            )
            assert cur.fetchone()[0] is True

        assert run_once()["status"] == (
            "another_worker_running"
        )
        assert count("ksn_afoot_minute_v652") == 2
    finally:
        with holder.cursor() as cur:
            cur.execute(
                "SELECT pg_advisory_unlock(655001)"
            )
        holder.close()

    print("PASS: PostgreSQL worker lock enforced")

    first = run_once()
    assert first["status"] == "completed"
    assert (
        first["minute"],
        first["daily"],
        first["paths"],
    ) == (1, 1, 1)

    assert count("ksn_afoot_minute_v652") == 1
    assert count("ksn_afoot_daily_v652") == 2
    assert count("ksn_afoot_paths_v652") == 2

    print("PASS: expired rows deleted safely")
    print("PASS: current and boundary rows preserved")

    second = run_once()
    assert second["status"] == "already_completed"

    assert count("ksn_afoot_minute_v652") == 1

    print("PASS: duplicate daily execution prevented")

    with admin.cursor() as cur:
        cur.execute(
            sql.SQL(
                "SELECT minute_deleted, daily_deleted, "
                "paths_deleted FROM {} "
                "WHERE utc_day = %s"
            ).format(
                table("ksn_afoot_retention_runs_v655")
            ),
            (today,)
        )
        assert cur.fetchone() == (1, 1, 1)

    print("PASS: PostgreSQL completion journal persisted")

    # Simulate cleanup committing before a subsequent
    # journal failure. The next attempt must safely retry.
    with admin.cursor() as cur:
        cur.execute(
            sql.SQL(
                "DELETE FROM {} WHERE utc_day = %s"
            ).format(
                table("ksn_afoot_retention_runs_v655")
            ),
            (today,)
        )

    def cleanup_then_fail(batch_size):
        cleanup(batch_size)
        raise RuntimeError("simulated journal-stage failure")

    namespace["_ksn654_ledger_cleanup_sync"] = (
        cleanup_then_fail
    )

    try:
        run_once()
    except RuntimeError:
        pass
    else:
        raise AssertionError(
            "Expected simulated failure"
        )

    assert count("ksn_afoot_retention_runs_v655") == 0

    namespace["_ksn654_ledger_cleanup_sync"] = cleanup

    retry = run_once()
    assert retry["status"] == "completed"
    assert (
        retry["minute"],
        retry["daily"],
        retry["paths"],
    ) == (0, 0, 0)

    print("PASS: retry after journal-stage failure")
    print("ALL V655 POSTGRESQL TESTS PASSED")
    print("API-FOOTBALL CALLS: 0")

finally:
    try:
        if created:
            with admin.cursor() as cur:
                cur.execute(
                    sql.SQL("DROP SCHEMA {} CASCADE").format(
                        sql.Identifier(schema)
                    )
                )
            print("PASS: isolated test schema removed")
    finally:
        admin.close()
