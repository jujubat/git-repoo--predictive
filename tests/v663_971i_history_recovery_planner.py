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
}

nodes = [
    n for n in tree.body
    if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))
    and n.name in names
]

assert len(nodes) == 3

module = ast.fix_missing_locations(
    ast.Module(body=nodes, type_ignores=[])
)

ns = {
    "_ksn_v663_history_complete": lambda r: (
        isinstance(r, dict)
        and all(
            type(r.get(k)) is int
            for k in (
                "played", "wins", "draws", "losses",
                "goalsFor", "goalsAgainst", "points"
            )
        )
        and r["played"] > 0
        and r["wins"] + r["draws"] + r["losses"] == r["played"]
    ),
    "_ksn_v614_history_row": lambda tid, yr, snap: (
        {
            "played": snap["data"]["summary"]["played"],
            "wins": snap["data"]["summary"]["wins"],
            "draws": snap["data"]["summary"]["draws"],
            "losses": snap["data"]["summary"]["losses"],
            "goalsFor": snap["data"]["summary"]["goalsFor"],
            "goalsAgainst": snap["data"]["summary"]["goalsAgainst"],
            "points": snap["data"]["points"],
        }
    ),
}

exec(compile(module, "recovery-planner", "exec"), ns)
planner = ns["_ksn_v663_971i_history_recovery_plan"]

def catalogue_entry(lid, years):
    return {
        "league": {"id": lid, "type": "League"},
        "country": {"name": "Switzerland"},
        "seasons": [{"year": y} for y in years],
    }

catalogue = {"response": [
    catalogue_entry(207, [2023, 2025, 2026]),
    catalogue_entry(208, [2021, 2022, 2023, 2024]),
]}

def table(lid, year, contains_team=True):
    rows = [{
        "team": {"id": 999},
        "rank": 1, "points": 80,
        "all": {
            "played": 36, "win": 25, "draw": 5, "lose": 6,
            "goals": {"for": 70, "against": 25}
        }
    }]
    if contains_team:
        rows.append({
            "team": {"id": 1012},
            "rank": 2, "points": 76,
            "all": {
                "played": 36, "win": 23, "draw": 7, "lose": 6,
                "goals": {"for": 65, "against": 30}
            }
        })
    return {"response": [{"league": {
        "id": lid, "season": year,
        "standings": [rows]
    }}]}

calls = []

async def fetch(lid, year):
    calls.append((lid, year))
    return table(
        lid, year,
        contains_team=not (lid == 207 and year == 2023)
    )

print("=== V663 STEP 971I: RECOVERY PLANNER TESTS ===")

out = asyncio.run(planner(
    1012, [2024, 2023, 2022, 2021],
    catalogue, fetch, max_requests=5
))

assert len(out["planned"]) == 4, out
assert out["requests"] == 5, out
assert out["writes"] == 0
assert not out["unresolved"]
assert {
    x["data"]["season"]: x["data"]["leagueId"]
    for x in out["planned"]
} == {
    2024: 208, 2023: 208, 2022: 208, 2021: 208
}
print("PASS: FC Thun four historical years correctly planned")

calls.clear()
limited = asyncio.run(planner(
    1012, [2024, 2023], catalogue, fetch,
    max_requests=1
))
assert len(limited["planned"]) == 1
assert limited["unresolved"][2023] == "request-budget-insufficient"
assert len(calls) == 1
print("PASS: Provider budget enforced without partial league selection")

calls.clear()
old = {"data": {
    "teamId": 1012, "season": 2024, "leagueId": 208,
    "points": 72,
    "summary": {
        "played": 36, "wins": 21, "draws": 9,
        "losses": 6, "goalsFor": 66,
        "goalsAgainst": 30,
    }
}}
preserved = asyncio.run(planner(
    1012, [2024], catalogue, fetch,
    existing={2024: old}
))
assert preserved["preserved"] == [2024]
assert preserved["planned"] == []
assert preserved["requests"] == 0
assert not calls
print("PASS: Existing verified history preserved")

calls.clear()
async def unavailable(lid, year):
    calls.append((lid, year))
    raise TimeoutError("provider unavailable")

failed = asyncio.run(planner(
    1012, [2024], catalogue, unavailable
))
assert failed["planned"] == []
assert failed["unresolved"][2024] == "provider-incomplete"
assert failed["writes"] == 0
print("PASS: Provider failure fails closed")

invalid = asyncio.run(planner(
    0, [2024], catalogue, fetch
))
assert invalid["error"] == "invalid-input"
print("PASS: Invalid identity rejected")

print("=== V663 STEP 971I: 5 PASS ===")
print("Provider requests: 0 (all simulated)")
print("Database writes: 0")
print("Deployments: 0")
