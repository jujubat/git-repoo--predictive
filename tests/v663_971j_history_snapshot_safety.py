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

def valid(row):
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

def read_history(tid, year, snapshot):
    d = snapshot.get("data") or {}
    if (
        d.get("teamId") != tid
        or d.get("season") != year
    ):
        return None

    return {
        **(d.get("summary") or {}),
        "points": d.get("points"),
    }

ns = {
    "_ksn_v663_history_complete": valid,
    "_ksn_v614_history_row": read_history,
}

exec(compile(module, "history-safety", "exec"), ns)

plan = ns["_ksn_v663_971i_history_recovery_plan"]

catalogue = {
    "response": [{
        "league": {
            "id": 208,
            "type": "League",
            "name": "Challenge League",
        },
        "country": {"name": "Switzerland"},
        "seasons": [{"year": 2024}],
    }]
}

calls = []

async def fetch(lid, year):
    calls.append((lid, year))

    return {
        "response": [{
            "league": {
                "id": lid,
                "season": year,
                "standings": [[{
                    "team": {"id": 1012},
                    "rank": 1,
                    "points": 72,
                    "all": {
                        "played": 36,
                        "win": 21,
                        "draw": 9,
                        "lose": 6,
                        "goals": {
                            "for": 66,
                            "against": 30,
                        },
                    },
                }]],
            }
        }]
    }

def execute(existing):
    calls.clear()
    return asyncio.run(
        plan(
            1012,
            [2024],
            catalogue,
            fetch,
            existing=existing,
            max_requests=2,
        )
    )

print("=== V663 STEP 971J: SNAPSHOT SAFETY TESTS ===")

missing = execute({})
assert len(missing["planned"]) == 1
assert missing["requests"] == 1
assert missing["writes"] == 0
print("PASS: Missing snapshot may be recovered")

corrupt = {
    "data": {
        "teamId": 1012,
        "season": 2024,
        "leagueId": 208,
        "points": 72,
        "summary": {
            "played": 36,
            "wins": 21,
            "draws": 9,
            "losses": 5,
            "goalsFor": 66,
            "goalsAgainst": 30,
        },
    }
}

blocked = execute({2024: corrupt})

assert blocked["planned"] == []
assert blocked["unresolved"][2024] == "existing-snapshot-conflict"
assert blocked["requests"] == 0
assert not calls
print("PASS: Conflicting snapshot cannot be overwritten")

wrong_team = {
    "data": {
        **corrupt["data"],
        "teamId": 999,
    }
}

blocked = execute({2024: wrong_team})
assert blocked["planned"] == []
assert blocked["unresolved"][2024] == "existing-snapshot-conflict"
assert not calls
print("PASS: Wrong-team snapshot blocked")

valid_existing = {
    "data": {
        **corrupt["data"],
        "summary": {
            **corrupt["data"]["summary"],
            "losses": 6,
        },
    }
}

preserved = execute({2024: valid_existing})
assert preserved["preserved"] == [2024]
assert preserved["planned"] == []
assert not calls
print("PASS: Valid existing season preserved")

print("=== STEP 971J: 4 PASS ===")
print("Provider requests: 0, simulated only")
print("Database writes: 0")
print("Deployments: 0")
