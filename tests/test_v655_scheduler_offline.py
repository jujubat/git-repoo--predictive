"""Offline v655 scheduler tests. No network or database."""
import ast
import copy
import warnings
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace

source = Path("server.py").read_text(encoding="utf-8")

with warnings.catch_warnings():
    warnings.simplefilter("ignore", SyntaxWarning)
    tree = ast.parse(source)

names = {
    "_ksn655_scheduler_allowed",
    "_ksn655_next_run_utc",
    "_ksn655_run_once_sync",
}

nodes = [
    copy.deepcopy(n) for n in tree.body
    if isinstance(n, ast.FunctionDef)
    and n.name in names
]
assert {n.name for n in nodes} == names

module = ast.fix_missing_locations(
    ast.Module(body=nodes, type_ignores=[])
)


class MockDB:
    def __init__(self):
        self.today = date(2026, 10, 20)
        self.rows = {}
        self.lock = True
        self.opens = 0
        self.closes = 0
        self.fail_journal = False

    def connect(self, *args, **kwargs):
        self.opens += 1
        return MockConnection(self)


class MockConnection:
    def __init__(self, db):
        self.db = db

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def cursor(self):
        return MockCursor(self.db)

    def close(self):
        self.db.closes += 1


class MockCursor:
    def __init__(self, db):
        self.db = db
        self.result = None

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def execute(self, query, params=None):
        sql = " ".join(query.split())

        if "pg_try_advisory_lock(655001)" in sql:
            self.result = (self.db.lock,)
        elif "CREATE TABLE IF NOT EXISTS" in sql:
            self.result = None
        elif "SELECT (now() AT TIME ZONE 'UTC')::date" in sql:
            self.result = (self.db.today,)
        elif "SELECT 1 FROM ksn_afoot_retention_runs_v655" in sql:
            self.result = (
                (1,) if params[0] in self.db.rows
                else None
            )
        elif "INSERT INTO ksn_afoot_retention_runs_v655" in sql:
            if self.db.fail_journal:
                raise RuntimeError("Mock journal failure")
            day = params[0]
            if day in self.db.rows:
                self.result = None
            else:
                self.db.rows[day] = params[1:]
                self.result = (day,)
        else:
            raise AssertionError("Unexpected SQL: " + sql)

    def fetchone(self):
        return self.result


db = MockDB()
env = {"KSN_STAGING_SEO_TEST_MODE": "1"}
cleanup_calls = []


def cleanup(batch_size):
    cleanup_calls.append(batch_size)
    return {
        "skipped": None,
        "minute": 3,
        "daily": 4,
        "paths": 5,
    }


ns = {
    "os": SimpleNamespace(
        getenv=lambda key, default=None: env.get(key, default)
    ),
    "datetime": datetime,
    "timedelta": timedelta,
    "timezone": timezone,
    "DATABASE_URL": "offline-mock-only",
    "psycopg2": db,
    "_KSN655_SCHEDULER_ENABLED": True,
    "_KSN652_LEDGER_ENABLED": True,
    "_KSN654_RETENTION_ENABLED": True,
    "_KSN655_RUN_HOUR_UTC": 3,
    "_KSN655_RUN_MINUTE_UTC": 15,
    "_ksn654_ledger_cleanup_sync": cleanup,
}

exec(compile(module, "<v655-offline>", "exec"), ns)

allowed = ns["_ksn655_scheduler_allowed"]
next_run = ns["_ksn655_next_run_utc"]
run_once = ns["_ksn655_run_once_sync"]

assert not allowed()
assert run_once()["status"] == "disabled"
assert db.opens == 0
print("PASS: Staging offline mode blocks execution")

env["KSN_STAGING_SEO_TEST_MODE"] = "0"

for flag in (
    "_KSN655_SCHEDULER_ENABLED",
    "_KSN652_LEDGER_ENABLED",
    "_KSN654_RETENTION_ENABLED",
):
    ns[flag] = False
    assert not allowed()
    assert run_once()["status"] == "disabled"
    ns[flag] = True

assert db.opens == 0
print("PASS: All activation flags required")

before = datetime(2026, 10, 20, 3, 14,
                  tzinfo=timezone.utc)
at_time = datetime(2026, 10, 20, 3, 15,
                   tzinfo=timezone.utc)

assert next_run(before) == at_time
assert next_run(at_time) == (
    at_time + timedelta(days=1)
)
print("PASS: UTC scheduling boundaries")

db.lock = False
assert run_once()["status"] == "another_worker_running"
assert cleanup_calls == []
db.lock = True
print("PASS: Competing worker rejected")

first = run_once()
assert first["status"] == "completed"
assert db.rows[db.today] == (3, 4, 5)
assert cleanup_calls == [200]

second = run_once()
assert second["status"] == "already_completed"
assert cleanup_calls == [200]
print("PASS: One successful completion per day")

db.today = date(2026, 10, 21)

def failed_cleanup(batch_size):
    raise RuntimeError("Mock cleanup failure")

ns["_ksn654_ledger_cleanup_sync"] = failed_cleanup

try:
    run_once()
except RuntimeError:
    pass
else:
    raise AssertionError("Cleanup error not propagated")

assert db.today not in db.rows
print("PASS: Failed cleanup not recorded")

ns["_ksn654_ledger_cleanup_sync"] = cleanup
assert run_once()["status"] == "completed"
print("PASS: Failed cleanup can retry")

db.today = date(2026, 10, 22)
ns["_ksn654_ledger_cleanup_sync"] = (
    lambda batch_size: {"skipped": "cleanup_lock_busy"}
)

assert run_once()["status"] == "cleanup_skipped"
assert db.today not in db.rows
print("PASS: Skipped cleanup not recorded")

db.today = date(2026, 10, 23)
ns["_ksn654_ledger_cleanup_sync"] = cleanup
db.fail_journal = True

try:
    run_once()
except RuntimeError:
    pass
else:
    raise AssertionError("Journal failure not propagated")

assert db.today not in db.rows
db.fail_journal = False
print("PASS: Journal failure exposed for retry")

assert db.opens == db.closes
print("PASS: All mock connections closed")
print("ALL V655 OFFLINE TESTS PASSED")
print("Real database connections: 0")
print("API-Football calls: 0")
