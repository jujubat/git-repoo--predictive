import ast
import json
import logging
import warnings
from pathlib import Path

source = Path("server.py").read_text(encoding="utf-8-sig")

with warnings.catch_warnings():
    warnings.simplefilter("ignore", SyntaxWarning)
    tree = ast.parse(source)

node = next(
    n for n in tree.body
    if isinstance(n, ast.FunctionDef)
    and n.name == "_ksn_v663_971l_history_insert_if_absent"
)

module = ast.fix_missing_locations(
    ast.Module(body=[node], type_ignores=[])
)

class FakeCursor:
    def __init__(self, state):
        self.state = state

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def execute(self, sql, params):
        normalized = " ".join(sql.upper().split())
        assert "ON CONFLICT (K) DO NOTHING" in normalized
        assert "RETURNING K" in normalized
        assert "DO UPDATE" not in normalized
        assert len(params) == 3

        key, payload, updated = params
        parsed = json.loads(payload)

        assert parsed["data"]["teamId"] == 1012
        assert key == "team_history_v614:1012:2024"
        assert isinstance(updated, float)

        self.state["sql_calls"] += 1

        if self.state["fail"]:
            raise RuntimeError("simulated connection failure")

        self.state["inserted"] = key not in self.state["keys"]

        if self.state["inserted"]:
            self.state["keys"].add(key)

    def fetchone(self):
        return ("inserted",) if self.state["inserted"] else None

class FakeConnection:
    def __init__(self, state):
        self.state = state

    def cursor(self):
        return FakeCursor(self.state)

    def commit(self):
        self.state["commits"] += 1

    def rollback(self):
        self.state["rollbacks"] += 1

    def close(self):
        self.state["closes"] += 1

class FakeDriver:
    def __init__(self, state):
        self.state = state

    def connect(self, *args, **kwargs):
        self.state["connections"] += 1
        return FakeConnection(self.state)

def history_row(team, year, snapshot):
    d = snapshot["data"]
    if d.get("teamId") != team or d.get("season") != year:
        return None

    return {
        **d["summary"],
        "points": d["points"],
        "rank": d["rank"],
    }

def complete(row):
    if not isinstance(row, dict):
        return False

    fields = (
        "played", "wins", "draws", "losses",
        "goalsFor", "goalsAgainst", "points"
    )

    return (
        all(type(row.get(k)) is int for k in fields)
        and row["played"] > 0
        and row["wins"] + row["draws"] + row["losses"]
            == row["played"]
    )

state = {
    "keys": set(),
    "connections": 0,
    "sql_calls": 0,
    "commits": 0,
    "rollbacks": 0,
    "closes": 0,
    "inserted": False,
    "fail": False,
    "staging": False,
}

ns = {
    "DATABASE_URL": "fake-postgres-for-test-only",
    "psycopg2": FakeDriver(state),
    "log": logging.getLogger("v663-971l"),
    "_ksn_v663_staging_football_only": lambda: state["staging"],
    "_ksn_v614_history_row": history_row,
    "_ksn_v663_history_complete": complete,
}

exec(compile(module, "atomic-history-writer", "exec"), ns)

write = ns["_ksn_v663_971l_history_insert_if_absent"]

item = {
    "key": "team_history_v614:1012:2024",
    "data": {
        "teamId": 1012,
        "season": 2024,
        "leagueId": 208,
        "rank": 1,
        "points": 72,
        "summary": {
            "played": 36,
            "wins": 21,
            "draws": 9,
            "losses": 6,
            "goalsFor": 66,
            "goalsAgainst": 30,
        }
    },
}

print("=== V663 STEP 971L: ATOMIC WRITER REGRESSIONS ===")

result = write(item)
assert result["status"] == "inserted", result
assert state["commits"] == 1
assert state["sql_calls"] == 1
print("PASS: Verified missing record inserted")

result = write(item)
assert result["status"] == "exists", result
assert state["sql_calls"] == 2
assert len(state["keys"]) == 1
print("PASS: Existing key never overwritten")

bad = {
    **item,
    "key": "team_history_v614:999:2024",
}
before = state["connections"]
assert write(bad)["status"] == "invalid"
assert state["connections"] == before
print("PASS: Wrong team key rejected before SQL")

bad = {
    **item,
    "data": {
        **item["data"],
        "summary": {
            **item["data"]["summary"],
            "losses": 5,
        },
    },
}
assert write(bad)["status"] == "invalid"
assert state["connections"] == before
print("PASS: Inconsistent season totals rejected")

state["staging"] = True
assert write(item)["status"] == "blocked-staging"
assert state["connections"] == before
state["staging"] = False
print("PASS: Football-only staging has no DB access")

ns["DATABASE_URL"] = ""
assert write(item)["status"] == "unavailable"
assert state["connections"] == before
ns["DATABASE_URL"] = "fake-postgres-for-test-only"
print("PASS: Missing PostgreSQL configuration fails closed")

state["fail"] = True
assert write(item)["status"] == "error"
assert state["rollbacks"] == 1
state["fail"] = False
print("PASS: SQL errors trigger rollback")

assert state["connections"] == state["closes"]
print("PASS: All connections closed")

print("=== STEP 971L: 8 PASS ===")
print("Real database connections: 0")
print("Real database writes: 0")
print("Provider requests: 0")
print("Deployments: 0")
