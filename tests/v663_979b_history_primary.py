
import ast
import warnings
from pathlib import Path

source = Path("server.py").read_text(encoding="utf-8")

with warnings.catch_warnings():
    warnings.simplefilter("ignore", SyntaxWarning)
    tree = ast.parse(source)

route = next(
    n for n in tree.body
    if isinstance(n, ast.FunctionDef)
    and n.name == "_ksn_v663_973s_player_matches"
)

body = ast.get_source_segment(source, route)

assert "recover_historical_player_matches" in body
print("PASS: Historical PostgreSQL is primary source")

calls = [
    n.func.id
    for n in ast.walk(route)
    if isinstance(n, ast.Call)
    and isinstance(n.func, ast.Name)
]

assert "collect_cached_player_matches" not in calls
print("PASS: Per-fixture collector no longer called")

assert "combined_records" in body
assert "paginate_player_matches" in body
print("PASS: Existing season and competition pagination")

assert "status_code=503" in body
assert "log.exception(" in body
print("PASS: Recovery errors not disguised as empty seasons")

assert "if player != 19465:" in body
print("PASS: Reference-player isolation preserved")

assert "_ksn_v663_staging_football_only()" in body
print("PASS: Staging isolation preserved")

assert "cacheOnly" in body
assert "partial_verified_postgresql_match_index" in body
print("PASS: Partial cache coverage remains explicit")

assert "_dashboard_snapshot_put(" not in body
assert "_afoot_get(" not in body
print("PASS: No new provider or snapshot-write calls")

print("=== STEP 979B: 8 STATIC REGRESSIONS PASS ===")
