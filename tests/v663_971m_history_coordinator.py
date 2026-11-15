import ast
import asyncio
import warnings
from pathlib import Path

source = Path("server.py").read_text(encoding="utf-8-sig")

with warnings.catch_warnings():
    warnings.simplefilter("ignore", SyntaxWarning)
    tree = ast.parse(source)

names = {
    "_ksn_v663_971g_history_league_candidates",
    "_ksn_v663_971h_verify_history_membership",
    "_ksn_v663_971i_history_recovery_plan",
    "_ksn_v663_971m_history_recovery_coordinator",
}

nodes = [
    node for node in tree.body
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
    and node.name in names
]

assert len(nodes) == 4

module = ast.fix_missing_locations(
    ast.Module(body=nodes, type_ignores=[])
)

def valid(row):
    if not isinstance(row, dict):
        return False

    keys = (
        "played", "wins", "draws", "losses",
        "goalsFor", "goalsAgainst", "points"
    )

    return (
        all(type(row.get(k)) is int for k in keys)
        and row["played"] > 0
        and row["wins"] + row["draws"] + row["losses"]
            == row["played"]
    )

def read_history(team, season, snapshot):
    data = snapshot.get("data") or {}

    if data.get("teamId") != team or data.get("season") != season:
        return None

    return {
        **(data.get("summary") or {}),
        "points": data.get("points"),
    }

ns = {
    "_ksn_v663_history_complete": valid,
    "_ksn_v614_history_row": read_history,
}

exec(compile(module, "history-coordinator", "exec"), ns)

coordinate = ns["_ksn_v663_971m_history_recovery_coordinator"]

catalogue = {
    "response": [
        {
            "league": {"id": 207, "type": "League"},
            "country": {"name": "Switzerland"},
            "seasons": [{"year": 2023}],
        },
        {
            "league": {"id": 208, "type": "League"},
            "country": {"name": "Switzerland"},
            "seasons": [{"year": 2023}, {"year": 2024}],
        },
    ]
}

def table(lid, year):
    rows = [
        {
            "team": {"id": 999},
            "rank": 1,
            "points": 80,
            "all": {
                "played": 36, "win": 25,
                "draw": 5, "lose": 6,
                "goals": {"for": 70, "against": 25},
            },
        }
    ]

    if lid == 208:
        rows.append({
            "team": {"id": 1012},
            "rank": 2,
            "points": 76,
            "all": {
                "played": 36, "win": 23,
                "draw": 7, "lose": 6,
                "goals": {"for": 65, "against": 30},
            },
        })

    return {"response": [{
        "league": {
            "id": lid,
            "season": year,
            "standings": [rows],
        }
    }]}

calls = []
written = set()

async def fetch(lid, year):
    calls.append((lid, year))
    return table(lid, year)

def writer(item):
    key = item["key"]

    if key in written:
        return {"status": "exists"}

    written.add(key)
    return {"status": "inserted"}

def execute(years, **kwargs):
    return asyncio.run(coordinate(
        1012, years, catalogue, fetch, **kwargs
    ))

print("=== V663 STEP 971M: COORDINATOR REGRESSIONS ===")

dry = execute([2024, 2023])
assert len(dry["planned"]) == 2
assert dry["writes"] == 0
assert dry["writeResults"] == []
assert dry["dryRun"] is True
assert not written
print("PASS: Dry-run never writes")

calls.clear()
saved = execute(
    [2024, 2023],
    write_enabled=True,
    writer=writer,
)
assert saved["writes"] == 2
assert len(saved["writeResults"]) == 2
assert saved["requests"] == 3
assert len(written) == 2
print("PASS: Verified records passed to writer")

repeat = execute(
    [2024, 2023],
    write_enabled=True,
    writer=writer,
)
assert repeat["writes"] == 0
assert all(
    row["status"] == "exists"
    for row in repeat["writeResults"]
)
assert len(written) == 2
print("PASS: Existing keys never counted as new writes")

calls.clear()
limited = execute([2024, 2023], max_requests=1)
assert len(limited["planned"]) == 1
assert limited["unresolved"][2023] == "request-budget-insufficient"
assert len(calls) == 1
assert limited["writes"] == 0
print("PASS: Request budget enforced")

calls.clear()
async def unavailable(lid, year):
    calls.append((lid, year))
    raise TimeoutError("simulated timeout")

failed = asyncio.run(coordinate(
    1012, [2024], catalogue, unavailable
))
assert failed["planned"] == []
assert failed["unresolved"][2024] == "provider-incomplete"
assert failed["writes"] == 0
print("PASS: Provider failure produces no writes")

missing_writer = execute(
    [2024], write_enabled=True, writer=None
)
assert missing_writer["error"] == "writer-required"
assert missing_writer["requests"] == 0
print("PASS: Writer required before write-enabled mode")

def broken_writer(item):
    raise RuntimeError("simulated writer failure")

broken = execute(
    [2024],
    write_enabled=True,
    writer=broken_writer,
)
assert broken["writes"] == 0
assert broken["writeResults"][0]["status"] == "writer-error"
print("PASS: Database write failure does not report success")

valid_existing = {
    "data": {
        "teamId": 1012,
        "season": 2024,
        "leagueId": 208,
        "rank": 1,
        "points": 72,
        "summary": {
            "played": 36, "wins": 21,
            "draws": 9, "losses": 6,
            "goalsFor": 66, "goalsAgainst": 30,
        },
    }
}

preserved = execute(
    [2024],
    existing={2024: valid_existing},
    write_enabled=True,
    writer=writer,
)
assert preserved["preserved"] == [2024]
assert preserved["planned"] == []
assert preserved["writes"] == 0
print("PASS: Valid existing snapshot preserved")

print("=== STEP 971M: 8 PASS ===")
print("Real provider requests: 0")
print("Real database connections: 0")
print("Real database writes: 0")
print("Deployments: 0")
