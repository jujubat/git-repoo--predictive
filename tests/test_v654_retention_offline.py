"""Offline v654 retention contract tests. No database or provider I/O."""
import ast
import asyncio
import copy
import warnings
from pathlib import Path

source = Path("server.py").read_text(encoding="utf-8")
with warnings.catch_warnings():
    warnings.simplefilter("ignore", SyntaxWarning)
    module = ast.parse(source)

wanted = {
    "_ksn654_ledger_cleanup_sync",
    "_ksn654_ledger_cleanup",
}
functions = [
    copy.deepcopy(node) for node in module.body
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
    and node.name in wanted
]
assert {node.name for node in functions} == wanted

for function in functions:
    function.decorator_list = []

unit = ast.fix_missing_locations(
    ast.Module(body=functions, type_ignores=[])
)


class FakeCursor:
    def __init__(self, db):
        self.db = db
        self.rowcount = 0
        self.answer = None

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def execute(self, query, params=None):
        normalized = " ".join(query.split())
        self.db.statements.append((normalized, params))

        if "pg_try_advisory_xact_lock(654001)" in normalized:
            self.answer = (self.db.lock_available,)
            return

        assert "WITH candidates AS" in normalized
        assert "FOR UPDATE SKIP LOCKED" in normalized

        for table, count in self.db.rowcounts.items():
            if f"DELETE FROM {table} AS target" in normalized:
                self.rowcount = count
                return

        raise AssertionError("Unexpected SQL issued by cleanup")

    def fetchone(self):
        return self.answer


class FakeConnection:
    def __init__(self, db):
        self.db = db

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def cursor(self):
        return FakeCursor(self.db)

    def close(self):
        self.db.closed += 1


class FakeDatabase:
    def __init__(self):
        self.statements = []
        self.connections = 0
        self.closed = 0
        self.lock_available = True
        self.rowcounts = {
            "ksn_afoot_minute_v652": 3,
            "ksn_afoot_daily_v652": 4,
            "ksn_afoot_paths_v652": 5,
        }

    def connect(self, *args, **kwargs):
        self.connections += 1
        return FakeConnection(self)


db = FakeDatabase()
namespace = {
    "DATABASE_URL": "mock-only-not-a-real-database",
    "psycopg2": db,
    "asyncio": asyncio,
    "_KSN652_LEDGER_ENABLED": False,
    "_KSN654_RETENTION_ENABLED": False,
}

exec(
    compile(unit, "<v654-retention-offline>", "exec"),
    namespace,
)

cleanup = namespace["_ksn654_ledger_cleanup"]

result = asyncio.run(cleanup())
assert result["skipped"] == "retention_disabled"
assert db.connections == 0
print("PASS: Both feature flags must be enabled")

namespace["_KSN652_LEDGER_ENABLED"] = True
namespace["_KSN654_RETENTION_ENABLED"] = True

result = asyncio.run(cleanup(999))

assert result == {
    "skipped": None,
    "minute": 3,
    "daily": 4,
    "paths": 5,
}
assert db.connections == db.closed == 1
assert len(db.statements) == 4

lock_sql, minute_sql, daily_sql, paths_sql = [
    statement for statement, _ in db.statements
]

assert "pg_try_advisory_xact_lock(654001)" in lock_sql
assert "now() - INTERVAL '48 hours'" in minute_sql

utc_cutoff = (
    "WHERE utc_day < "
    "(now() AT TIME ZONE 'UTC')::date - 90"
)
assert utc_cutoff in daily_sql
assert utc_cutoff in paths_sql

for statement in (minute_sql, daily_sql, paths_sql):
    assert "FOR UPDATE SKIP LOCKED" in statement

assert all(
    params == (200,)
    for _, params in db.statements[1:]
)

assert all(
    "TRUNCATE" not in statement
    and "DROP TABLE" not in statement
    for statement, _ in db.statements
)

print("PASS: 48-hour and UTC 90-day SQL cutoffs")
print("PASS: Three-table scope and 200-row batch limit")

db.statements.clear()
db.lock_available = False

result = asyncio.run(cleanup())

assert result == {
    "skipped": "cleanup_lock_busy",
    "minute": 0,
    "daily": 0,
    "paths": 0,
}
assert len(db.statements) == 1
assert db.connections == db.closed == 2

print("PASS: Advisory lock contention skips cleanup")


class FailedDatabase:
    @staticmethod
    def connect(*args, **kwargs):
        raise OSError("mock database unavailable")


namespace["psycopg2"] = FailedDatabase()

try:
    namespace["_ksn654_ledger_cleanup_sync"]()
except OSError:
    print("PASS: Database failures propagate")
else:
    raise AssertionError("Database failure was ignored")

print("ALL V654 OFFLINE CONTRACT TESTS PASSED")
print("API-Football calls: 0")
print("Real database connections: 0")
