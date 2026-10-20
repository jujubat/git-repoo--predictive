"""Isolated v654 PostgreSQL tests. No external provider calls."""
import ast
import copy
import os
import uuid
import warnings
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace

if os.getenv("KSN_STAGING_SEO_TEST_MODE") != "1":
    raise SystemExit("STOP: staging offline mode required")

if os.getenv("KSN_V654_PG_TEST_APPROVED") != "1":
    raise SystemExit("STOP: explicit test approval required")

if os.getenv("KSN_PROVIDER_LEDGER_ENABLED", "0") != "0":
    raise SystemExit("STOP: provider ledger must remain disabled")

if os.getenv("KSN_LEDGER_RETENTION_ENABLED", "0") != "0":
    raise SystemExit("STOP: retention must remain disabled")

url = os.getenv("DATABASE_URL", "").strip()
if not url:
    raise SystemExit("STOP: staging database not configured")

import psycopg2
from psycopg2 import sql

source = Path("server.py").read_text(encoding="utf-8")
with warnings.catch_warnings():
    warnings.simplefilter("ignore", SyntaxWarning)
    module = ast.parse(source)

wanted = {
    "_ksn654_ledger_cleanup_sync",
    "_ksn652_ledger_reserve_sync",
}
functions = [
    copy.deepcopy(node)
    for node in module.body
    if isinstance(node, ast.FunctionDef)
    and node.name in wanted
]
assert {node.name for node in functions} == wanted

for function in functions:
    function.decorator_list = []

unit = ast.fix_missing_locations(
    ast.Module(body=functions, type_ignores=[])
)

schema = "ksn_v654_test_" + uuid.uuid4().hex[:16]


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


class FakeHTTPException(Exception):
    def __init__(self, status_code, detail):
        super().__init__(str(detail))
        self.status_code = status_code
        self.detail = detail


ns = {
    "DATABASE_URL": url,
    "psycopg2": IsolatedDriver,
    "HTTPException": FakeHTTPException,
    "datetime": datetime,
    "timezone": timezone,
    "KASISCORE_DAILY_BUDGET": 5,
    "KASISCORE_PROVIDER_RESERVE": 1,
    "_quota_state": {"dailyLimit": 6},
    "_KSN652_TEAM_MISS_PER_MINUTE": 2,
    "_KSN652_SCHEMA_READY": True,
    "log": SimpleNamespace(error=lambda *args: None),
}

exec(compile(unit, "<v654-pg-test>", "exec"), ns)

cleanup = ns["_ksn654_ledger_cleanup_sync"]
reserve = ns["_ksn652_ledger_reserve_sync"]

tables = {
    "minute": "ksn_afoot_minute_v652",
    "daily": "ksn_afoot_daily_v652",
    "paths": "ksn_afoot_paths_v652",
}

admin = psycopg2.connect(url, connect_timeout=4)
admin.autocommit = True
created = False


def count(table):
    with admin.cursor() as cur:
        cur.execute(
            sql.SQL("SELECT COUNT(*) FROM {}.{}").format(
                sql.Identifier(schema),
                sql.Identifier(tables[table]),
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

    definitions = {
        "minute": (
            "minute_utc TIMESTAMPTZ PRIMARY KEY, "
            "team_search_misses INTEGER NOT NULL"
        ),
        "daily": (
            "utc_day DATE PRIMARY KEY, "
            "reserved_calls INTEGER NOT NULL, "
            "updated_at TIMESTAMPTZ NOT NULL DEFAULT now()"
        ),
        "paths": (
            "utc_day DATE NOT NULL, "
            "path TEXT NOT NULL, "
            "reserved_calls INTEGER NOT NULL, "
            "PRIMARY KEY (utc_day, path)"
        ),
    }

    with admin.cursor() as cur:
        for key, definition in definitions.items():
            cur.execute(
                sql.SQL("CREATE TABLE {}.{} ({})").format(
                    sql.Identifier(schema),
                    sql.Identifier(tables[key]),
                    sql.SQL(definition),
                )
            )

        cur.execute(
            "SELECT now(), "
            "(now() AT TIME ZONE 'UTC')::date"
        )
        now, today = cur.fetchone()

        fresh = (
            now - timedelta(hours=47)
        ).replace(second=0, microsecond=0)

        old_minutes = [
            (
                (
                    now - timedelta(hours=49, minutes=i)
                ).replace(second=0, microsecond=0),
                1,
            )
            for i in range(205)
        ]

        old_days = [
            today - timedelta(days=91 + i)
            for i in range(205)
        ]

        cur.executemany(
            sql.SQL(
                "INSERT INTO {}.{} "
                "(minute_utc, team_search_misses) "
                "VALUES (%s, %s)"
            ).format(
                sql.Identifier(schema),
                sql.Identifier(tables["minute"]),
            ).as_string(admin),
            old_minutes + [(fresh, 1)],
        )

        cur.executemany(
            sql.SQL(
                "INSERT INTO {}.{} "
                "(utc_day, reserved_calls) "
                "VALUES (%s, %s)"
            ).format(
                sql.Identifier(schema),
                sql.Identifier(tables["daily"]),
            ).as_string(admin),
            [(day, 1) for day in old_days] + [
                (today - timedelta(days=90), 2),
                (today, 4),
            ],
        )

        cur.executemany(
            sql.SQL(
                "INSERT INTO {}.{} "
                "(utc_day, path, reserved_calls) "
                "VALUES (%s, %s, %s)"
            ).format(
                sql.Identifier(schema),
                sql.Identifier(tables["paths"]),
            ).as_string(admin),
            [
                (day, f"/historical/{i}", 1)
                for i, day in enumerate(old_days)
            ] + [
                (
                    today - timedelta(days=90),
                    "/boundary",
                    1,
                ),
                (today, "/today", 4),
            ],
        )

    assert (
        count("minute"),
        count("daily"),
        count("paths"),
    ) == (206, 207, 207)

    print("PASS: isolated staging schema created")

    holder = psycopg2.connect(url, connect_timeout=4)
    try:
        with holder:
            with holder.cursor() as cur:
                cur.execute(
                    "SELECT pg_advisory_xact_lock(654001)"
                )

                result = cleanup(batch_size=200)

                assert result["skipped"] == (
                    "cleanup_lock_busy"
                )

                assert (
                    count("minute"),
                    count("daily"),
                    count("paths"),
                ) == (206, 207, 207)
    finally:
        holder.close()

    print("PASS: competing cleanup skips safely")

    first = cleanup(batch_size=999)

    assert (
        first["minute"],
        first["daily"],
        first["paths"],
    ) == (200, 200, 200)

    assert (
        count("minute"),
        count("daily"),
        count("paths"),
    ) == (6, 7, 7)

    print("PASS: batch limit of 200 enforced")

    second = cleanup()

    assert (
        second["minute"],
        second["daily"],
        second["paths"],
    ) == (5, 5, 5)

    third = cleanup()

    assert (
        third["minute"],
        third["daily"],
        third["paths"],
    ) == (0, 0, 0)

    assert (
        count("minute"),
        count("daily"),
        count("paths"),
    ) == (1, 2, 2)

    print("PASS: expired rows deleted")
    print("PASS: retention boundaries preserved")

    with admin.cursor() as cur:
        cur.execute(
            sql.SQL(
                "SELECT reserved_calls FROM {}.{} "
                "WHERE utc_day = %s"
            ).format(
                sql.Identifier(schema),
                sql.Identifier(tables["daily"]),
            ),
            (today,),
        )
        assert cur.fetchone()[0] == 4

    reserve("/fixtures")

    try:
        reserve("/fixtures")
    except FakeHTTPException as exc:
        assert exc.status_code == 429
        assert exc.detail["code"] == (
            "KSN652_PROVIDER_BUDGET_EXHAUSTED"
        )
    else:
        raise AssertionError(
            "Daily quota should be exhausted"
        )

    print("PASS: today's quota remains protected")
    print("ALL V654 POSTGRESQL TESTS PASSED")
    print("API-FOOTBALL CALLS: 0")

finally:
    try:
        if created:
            with admin.cursor() as cur:
                cur.execute(
                    sql.SQL(
                        "DROP SCHEMA {} CASCADE"
                    ).format(sql.Identifier(schema))
                )
            print("PASS: test schema removed")
    finally:
        admin.close()
