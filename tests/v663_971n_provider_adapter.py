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
    "_ksn_v663_971n_history_provider_adapter",
}

nodes = [
    n for n in tree.body
    if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))
    and n.name in names
]

assert len(nodes) == len(names)

module = ast.fix_missing_locations(
    ast.Module(body=nodes, type_ignores=[])
)

def valid(row):
    return (
        isinstance(row, dict)
        and all(
            type(row.get(k)) is int
            for k in (
                "played", "wins", "draws", "losses",
                "goalsFor", "goalsAgainst", "points"
            )
        )
        and row["played"] > 0
        and row["wins"] + row["draws"] + row["losses"]
        == row["played"]
    )

ns = {
    "_ksn_v663_history_complete": valid,
    "_ksn_v614_history_row": lambda team, year, snap: {
        **snap["data"]["summary"],
        "points": snap["data"]["points"],
    },
}

exec(compile(module, "history-provider-adapter", "exec"), ns)
adapter = ns["_ksn_v663_971n_history_provider_adapter"]

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

def standings(lid, year):
    rows = [{
        "team": {"id": 999},
        "rank": 1,
        "points": 80,
        "all": {
            "played": 36, "win": 25, "draw": 5, "lose": 6,
            "goals": {"for": 70, "against": 25},
        },
    }]

    if lid == 208:
        rows.append({
            "team": {"id": 1012},
            "rank": 2,
            "points": 76,
            "all": {
                "played": 36, "win": 23, "draw": 7, "lose": 6,
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
locked = False
fail_catalogue = False

async def provider(path, params):
    calls.append((path, dict(params)))

    if path == "/leagues":
        if fail_catalogue:
            raise TimeoutError("simulated catalogue timeout")
        return catalogue

    return standings(params["league"], params["season"])

def is_locked():
    return locked

def execute(years, **kwargs):
    return asyncio.run(adapter(
        1012, years, provider, is_locked, **kwargs
    ))

print("=== V663 STEP 971N: PROVIDER ADAPTER REGRESSIONS ===")

result = execute([2024, 2023])
assert result["status"] == "disabled"
assert result["catalogueRequests"] == 0
assert not calls
print("PASS: Adapter disabled by default")

locked = True
result = execute([2024, 2023], enabled=True)
assert result["status"] == "provider-locked"
assert not calls
locked = False
print("PASS: Quota lock blocks catalogue access")

result = execute([2024, 2023], enabled=True)
assert result["status"] == "planned", result
assert len(result["planned"]) == 2
assert result["requests"] == 3
assert result["catalogueRequests"] == 1
assert result["writes"] == 0
assert result["dryRun"] is True
assert {
    p["data"]["leagueId"] for p in result["planned"]
} == {208}
print("PASS: Exact season and league verified, dry-run only")

calls.clear()
result = execute(
    [2024, 2023], enabled=True, max_requests=1
)
assert len(result["planned"]) == 1
assert result["unresolved"][2023] == "request-budget-insufficient"
assert result["requests"] == 1
assert len(calls) == 2
print("PASS: Standings request limit enforced")

calls.clear()
fail_catalogue = True
result = execute([2024], enabled=True)
assert result["status"] == "catalogue-unavailable"
assert result["writes"] == 0
assert len(calls) == 1
fail_catalogue = False
print("PASS: Catalogue failure fails closed")

calls.clear()
result = execute([2024], enabled=True, max_requests=0)
assert result["planned"] == []
assert result["requests"] == 0
assert len(calls) == 1
print("PASS: Zero standings budget blocks recovery")

calls.clear()
result = execute([2024], enabled=True, existing={
    2024: {"data": {
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
        },
    }}
})
assert result["preserved"] == [2024]
assert result["requests"] == 0
assert result["writes"] == 0
print("PASS: Existing verified season preserved")

calls.clear()
result = execute([2024], enabled=True, max_requests=99)
assert result["status"] == "invalid-input"
assert not calls
print("PASS: Invalid budget rejected before provider access")

print("=== STEP 971N: 8 PASS ===")
print("Real provider requests: 0")
print("Real database connections: 0")
print("Real database writes: 0")
print("Deployments: 0")
