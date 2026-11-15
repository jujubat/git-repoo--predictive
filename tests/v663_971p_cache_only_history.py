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
    "_ksn_v663_971p_cached_history_dry_run",
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

def complete(r):
    return (
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
    )

ns = {
    "_ksn_v663_history_complete": complete,
    "_ksn_v614_history_row": lambda t, y, s: {
        **s["data"]["summary"],
        "points": s["data"]["points"],
    },
}
exec(compile(module, "cache-history-test", "exec"), ns)

recover = ns["_ksn_v663_971p_cached_history_dry_run"]

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
            "seasons": [
                {"year": 2023},
                {"year": 2024}
            ],
        },
    ]
}

def standings(league, year):
    rows = [{
        "team": {"id": 999},
        "rank": 1,
        "points": 80,
        "all": {
            "played": 36, "win": 25,
            "draw": 5, "lose": 6,
            "goals": {"for": 70, "against": 25},
        },
    }]

    if league == 208:
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

    return {
        "response": [{
            "league": {
                "id": league,
                "season": year,
                "standings": [rows],
            },
        }]
    }

calls = []

def cache(path, params):
    calls.append((path, dict(params)))

    if path == "/leagues":
        return catalogue

    return standings(params["league"], params["season"])

def execute(years, reader=cache, **kwargs):
    return asyncio.run(
        recover(
            1012, years, reader, **kwargs
        )
    )

print("=== V663 STEP 971P: CACHE-ONLY REGRESSIONS ===")

out = execute([2024, 2023], max_lookups=4)
assert out["status"] == "planned", out
assert len(out["planned"]) == 2, out
assert out["cacheLookups"] == 4, out
assert out["writes"] == 0
assert out["dryRun"] is True
assert {
    x["data"]["leagueId"]
    for x in out["planned"]
} == {208}
print("PASS: One catalogue and three standings lookups")

calls.clear()
limited = execute([2024, 2023], max_lookups=2)
assert len(limited["planned"]) == 1, limited
assert limited["cacheLookups"] == 2, limited
assert limited["unresolved"][2023] == "request-budget-insufficient"
print("PASS: One shared lookup budget enforced")

calls.clear()
missing = execute(
    [2024],
    reader=lambda path, params: None
)
assert missing["status"] == "catalogue-cache-miss"
assert missing["cacheLookups"] == 1
assert missing["writes"] == 0
print("PASS: Missing catalogue makes no upstream request")

calls.clear()
zero = execute([2024], max_lookups=0)
assert zero["status"] == "budget-exhausted"
assert zero["cacheLookups"] == 0
assert not calls
print("PASS: Zero lookup budget enforced")

calls.clear()
def partial_cache(path, params):
    calls.append((path, dict(params)))
    if path == "/leagues":
        return catalogue
    return None

partial = execute([2024], reader=partial_cache)
assert partial["planned"] == []
assert partial["unresolved"][2024] == "provider-incomplete"
assert partial["writes"] == 0
print("PASS: Missing standings fails closed")

calls.clear()
invalid = execute([2024], max_lookups=99)
assert invalid["status"] == "invalid-input"
assert not calls
print("PASS: Invalid budget rejected before lookup")

print("=== STEP 971P: 6 PASS ===")
print("Real provider requests: 0")
print("Real database connections: 0")
print("Real database writes: 0")
print("Deployments: 0")
