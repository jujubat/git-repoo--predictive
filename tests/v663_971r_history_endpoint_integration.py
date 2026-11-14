import ast
import asyncio
import os
import warnings
from pathlib import Path
from unittest.mock import patch

source = Path("server.py").read_text(encoding="utf-8-sig")

with warnings.catch_warnings():
    warnings.simplefilter("ignore", SyntaxWarning)
    tree = ast.parse(source)

route = next(
    n for n in tree.body
    if isinstance(n, ast.AsyncFunctionDef)
    and n.name == "team_seasons_history"
)

integration = next(
    n for n in ast.walk(route)
    if isinstance(n, ast.If)
    and "KSN_V663_HISTORY_CACHE_READ"
    in ast.get_source_segment(source, n.test)
)

module = ast.fix_missing_locations(
    ast.Module(
        body=[
            ast.AsyncFunctionDef(
                name="run_integration",
                args=ast.arguments(
                    posonlyargs=[], args=[], kwonlyargs=[],
                    kw_defaults=[], defaults=[]
                ),
                body=[integration, ast.Return(value=ast.Name(
                    id="out", ctx=ast.Load()
                ))],
                decorator_list=[],
                returns=None,
                type_comment=None
            )
        ],
        type_ignores=[]
    )
)

calls = []
rows = [{
    "key": "team_history_v614:1012:2024",
    "data": {
        "teamId": 1012,
        "season": 2024,
        "leagueId": 208,
        "rank": 1,
        "points": 72,
        "summary": {
            "played": 36, "wins": 21, "draws": 9,
            "losses": 6, "goalsFor": 66,
            "goalsAgainst": 30
        }
    }
}]

async def recovery(team, years, cache, **kwargs):
    calls.append((team, years, kwargs))
    return {"planned": rows, "writes": 0}

def make_context():
    return {
        "os": os,
        "asyncio": asyncio,
        "team": 1012,
        "years": [2026, 2025, 2024],
        "sources": {
            2026: "verified",
            2025: "verified",
            2024: "none"
        },
        "out": [],
        "snaps": {},
        "_ksn_v663_staging_football_only": lambda: False,
        "_ksn_v663_971p_cached_history_dry_run": recovery,
        "_persistent_cache_get": lambda *args: None,
        "_ksn_v614_history_row": (
            lambda team, year, snap: {
                "season": year,
                "played": snap["data"]["summary"]["played"],
                "points": snap["data"]["points"]
            }
        ),
        "_ksn_v663_history_complete": lambda row: (
            isinstance(row, dict)
            and row.get("played", 0) > 0
        ),
        "log": __import__("logging").getLogger("v663-971r"),
    }

print("=== V663 STEP 971R INTEGRATION TESTS ===")

ctx = make_context()
exec(compile(module, "971r-route", "exec"), ctx)

with patch.dict(os.environ, {
    "KSN_ENVIRONMENT": "production",
    "KSN_V663_HISTORY_CACHE_READ": "1"
}):
    assert asyncio.run(ctx["run_integration"]()) == []
    assert not calls
print("PASS: Production gate blocks recovery")

with patch.dict(os.environ, {
    "KSN_ENVIRONMENT": "staging",
    "KSN_V663_HISTORY_CACHE_READ": "0"
}):
    assert asyncio.run(ctx["run_integration"]()) == []
    assert not calls
print("PASS: Staging disabled by default")

with patch.dict(os.environ, {
    "KSN_ENVIRONMENT": "staging",
    "KSN_V663_HISTORY_CACHE_READ": "1"
}):
    out = asyncio.run(ctx["run_integration"]())

assert len(out) == 1
assert out[0]["season"] == 2024
assert ctx["sources"][2024] == "verified-cache-only"
assert len(calls) == 1
assert calls[0][2]["max_lookups"] == 4
print("PASS: Verified missing season integrated")

ctx["out"] = []
ctx["sources"][2024] = "verified"
with patch.dict(os.environ, {
    "KSN_ENVIRONMENT": "staging",
    "KSN_V663_HISTORY_CACHE_READ": "1"
}):
    assert asyncio.run(ctx["run_integration"]()) == []
assert len(calls) == 1
print("PASS: Existing seasons preserved")

ctx = make_context()
ctx["_ksn_v663_staging_football_only"] = lambda: True
exec(compile(module, "971r-staging-isolation", "exec"), ctx)

with patch.dict(os.environ, {
    "KSN_ENVIRONMENT": "staging",
    "KSN_V663_HISTORY_CACHE_READ": "1"
}):
    assert asyncio.run(ctx["run_integration"]()) == []
print("PASS: Football-only staging isolation retained")

guard = (
    "if yr==current and league_hint is not None "
    "and int(league_hint)==39:"
)
assert guard in source
print("PASS: Missing EPL league hint guarded")

print("=== STEP 971R: 6 PASS ===")
print("Real provider requests: 0")
print("Real database writes: 0")
print("Deployments: 0")
