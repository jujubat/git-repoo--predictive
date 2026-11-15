import ast
import warnings
from pathlib import Path

source = Path("server.py").read_text(encoding="utf-8-sig")

with warnings.catch_warnings():
    warnings.simplefilter("ignore", SyntaxWarning)
    tree = ast.parse(source)

route = next(
    node for node in tree.body
    if isinstance(node, ast.AsyncFunctionDef)
    and node.name == "team_seasons_history"
)

nodes = list(ast.walk(route))

def name(node):
    return ast.unparse(node)

print("=== V663 STEP 971Y: LEGACY ISOLATION REGRESSIONS ===")

assignments = [
    n for n in nodes
    if isinstance(n, ast.Assign)
    and any(name(t) == "cache_only_active" for t in n.targets)
]

assert len(assignments) == 2
assert {name(n.value) for n in assignments} == {"False", "True"}
print("PASS: Cache-only mode defaults off")

cache_gate = next(
    n for n in nodes
    if isinstance(n, ast.If)
    and "KSN_V663_HISTORY_CACHE_READ_PRODUCTION"
    in name(n.test)
)

assert any(
    isinstance(n, ast.Assign)
    and any(name(t) == "cache_only_active" for t in n.targets)
    and name(n.value) == "True"
    for n in ast.walk(cache_gate)
)
print("PASS: Cache mode enabled only inside feature gate")

legacy = [
    n for n in nodes
    if isinstance(n, ast.If)
    and "miss and league_hint" in name(n.test)
]

assert len(legacy) == 1
assert "not cache_only_active" in name(legacy[0].test)
print("PASS: Legacy provider fill isolated")

calls = [
    n for n in nodes
    if isinstance(n, ast.Call)
    and name(n.func) == "_dashboard_snapshot_put"
]

assert len(calls) == 1
assert any(n is call for n in ast.walk(legacy[0]) for call in calls)
print("PASS: Legacy canonical writer guarded")

schedule = next(
    n for n in nodes
    if isinstance(n, ast.Assign)
    and any(name(t) == "cs_scheduled" for t in n.targets)
)

assert isinstance(schedule.value, ast.IfExp)
assert "not cache_only_active" in name(schedule.value.test)
print("PASS: Clean-sheet scheduler guarded")

assert "_sql_team_profile" in source
assert "_ksn_v663_971p_cached_history_dry_run" in source
print("PASS: Existing recovery and profile paths retained")

print("=== STEP 971Y: 6 PASS ===")
print("Real provider requests: 0")
print("Database writes: 0")
print("Deployments: 0")
