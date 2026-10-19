"""v652 staging-only PostgreSQL tests. No API-Football calls."""
import ast
import copy
import os
import re
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace

if os.getenv("KSN_STAGING_SEO_TEST_MODE") != "1":
    raise SystemExit("STOP: staging offline mode is not enabled")
if os.getenv("KSN_V652_PG_TEST_APPROVED") != "1":
    raise SystemExit("STOP: explicit test approval required")

url = os.getenv("DATABASE_URL", "").strip()
if not url:
    raise SystemExit("STOP: staging DATABASE_URL is missing")

import psycopg2
from psycopg2 import sql

source = Path("server.py").read_text(encoding="utf-8")
module = ast.parse(source)
found = [
    n for n in module.body
    if isinstance(n, ast.FunctionDef)
    and n.name == "_ksn652_ledger_reserve_sync"
]
assert len(found) == 1, "Ledger function not found exactly once"

function = copy.deepcopy(found[0])
function.decorator_list = []
unit = ast.fix_missing_locations(
    ast.Module(body=[function], type_ignores=[])
)

class FakeHTTPException(Exception):
    def __init__(self, status_code, detail):
        super().__init__(str(detail))
        self.status_code = status_code
        self.detail = detail

schema = "ksn_v652_test_" + uuid.uuid4().hex[:16]
assert re.fullmatch(r"ksn_v652_test_[a-f0-9]{16}", schema)

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
            conn.commit()
            return conn
        except Exception:
            conn.close()
            raise

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
    "_KSN652_SCHEMA_READY": False,
    "log": SimpleNamespace(error=lambda *a: None),
}

exec(compile(unit, "<staging-test-ledger>", "exec"), ns)
reserve = ns["_ksn652_ledger_reserve_sync"]

def attempt(path):
    try:
        reserve(path)
        return "allowed"
    except FakeHTTPException as exc:
        return exc.detail["code"]

def scalar(table, field):
    conn = psycopg2.connect(url, connect_timeout=4)
    try:
        with conn.cursor() as cur:
            cur.execute(
                sql.SQL(
                    "SELECT COALESCE(SUM({}), 0) FROM {}.{}"
                ).format(
                    sql.Identifier(field),
                    sql.Identifier(schema),
                    sql.Identifier(table),
                )
            )
            return int(cur.fetchone()[0])
    finally:
        conn.close()

admin = psycopg2.connect(url, connect_timeout=4)
admin.autocommit = True
created = False

try:
    with admin.cursor() as cur:
        cur.execute(
            sql.SQL("CREATE SCHEMA {}").format(
                sql.Identifier(schema)
            )
        )
    created = True
    print("PASS: temporary staging schema created")

    with ThreadPoolExecutor(max_workers=8) as pool:
        outcomes = list(
            pool.map(attempt, ["/fixtures"] * 16)
        )

    assert outcomes.count("allowed") == 5, outcomes
    assert outcomes.count(
        "KSN652_PROVIDER_BUDGET_EXHAUSTED"
    ) == 11, outcomes

    assert scalar(
        "ksn_afoot_daily_v652", "reserved_calls"
    ) == 5
    assert scalar(
        "ksn_afoot_paths_v652", "reserved_calls"
    ) == 5

    print("PASS: 16 attempts -> 5 allowed, 11 blocked")

    ns["_KSN652_SCHEMA_READY"] = False
    assert attempt("/fixtures") == (
        "KSN652_PROVIDER_BUDGET_EXHAUSTED"
    )
    assert scalar(
        "ksn_afoot_daily_v652", "reserved_calls"
    ) == 5

    print("PASS: usage persists after process-state reset")

    with admin.cursor() as cur:
        cur.execute(
            sql.SQL(
                "TRUNCATE {}.{}, {}.{}, {}.{}"
            ).format(
                sql.Identifier(schema),
                sql.Identifier("ksn_afoot_daily_v652"),
                sql.Identifier(schema),
                sql.Identifier("ksn_afoot_paths_v652"),
                sql.Identifier(schema),
                sql.Identifier("ksn_afoot_minute_v652"),
            )
        )

    assert attempt("/teams") == "allowed"
    assert attempt("/teams") == "allowed"
    assert attempt("/teams") == (
        "KSN652_TEAM_SEARCH_RATE_LIMIT"
    )

    assert scalar(
        "ksn_afoot_daily_v652", "reserved_calls"
    ) == 2

    assert attempt("/fixtures") == "allowed"
    assert scalar(
        "ksn_afoot_daily_v652", "reserved_calls"
    ) == 3

    print("PASS: team limit and transaction rollback")

    def failed_connection(*args, **kwargs):
        raise OSError("simulated database failure")

    ns["psycopg2"] = SimpleNamespace(
        connect=failed_connection
    )

    assert attempt("/fixtures") == (
        "KSN652_LEDGER_UNAVAILABLE"
    )

    print("PASS: database failure fails closed")
    print("ALL POSTGRESQL TESTS PASSED")
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
            print("PASS: temporary schema removed")
    finally:
        admin.close()
