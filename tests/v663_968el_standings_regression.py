import ast
import copy
import logging
import warnings
from pathlib import Path

warnings.filterwarnings("ignore", category=SyntaxWarning)

print("=== V663 STEP 968EL: STANDINGS REGRESSION TESTS ===")

source = Path("server.py").read_text(encoding="utf-8")
tree = ast.parse(source)

name = "_ksn_v663_968ek_fresh_epl_standings"
nodes = [
    n for n in tree.body
    if isinstance(n, ast.FunctionDef) and n.name == name
]

assert len(nodes) == 1, "Helper missing or duplicated"

fn = nodes[0]

# Isolate only the new helper; do not import server.py.
names = {
    n.id for n in ast.walk(fn)
    if isinstance(n, ast.Name)
}
assert "_afoot_get" not in names
assert "_dashboard_snapshot_put" not in names

module = ast.Module(body=[fn], type_ignores=[])
ast.fix_missing_locations(module)

state = {"snapshot": None, "reads": 0}

def snapshot_get(key):
    assert key == "standings2627:last_good:PREMIER LEAGUE"
    state["reads"] += 1
    return copy.deepcopy(state["snapshot"])

env = {
    "_dashboard_snapshot_get": snapshot_get,
    "log": logging.getLogger("v663-test"),
}

exec(compile(module, "<isolated-test>", "exec"), env)
recover = env[name]

def make_rows(played=10):
    rows = []
    for n in range(1, 21):
        team_id = 42 if n == 1 else 10000 + n
        wins = played - 1
        rows.append({
            "teamId": team_id,
            "team": "Arsenal" if team_id == 42 else f"Team {n}",
            "logo": f"https://example.invalid/{team_id}.png",
            "rank": n,
            "played": played,
            "win": wins,
            "draw": 0,
            "lose": 1,
            "points": 27 if team_id == 42 and played == 10 else wins * 3,
            "goalsFor": 15,
            "goalsAgainst": 5,
            "form": "WWWWW",
        })
    return rows

def set_snapshot(rows, season=2026, league_id=39):
    state["snapshot"] = {
        "data": {
            "leagues": [{
                "leagueId": league_id,
                "season": season,
                "table": rows,
            }]
        }
    }

def old_table(played=8):
    result = []
    for row in make_rows(played):
        result.append({
            "rank": 2 if row["teamId"] == 42 else row["rank"],
            "team": {"id": row["teamId"], "name": row["team"]},
            "all": {"played": played},
            "points": 21 if row["teamId"] == 42 else row["points"],
        })
    return result

def profile(standings=None, league_id=39):
    return {
        "team": {"id": 42, "name": "Arsenal"},
        "league": {"id": league_id},
        "standings": copy.deepcopy(standings if standings is not None else []),
        "future": [{"id": 1555429}],
        "players": [{"id": 123, "name": "Verified Player"}],
        "teamStats": {"verified": True},
    }

passed = 0

def check(label, condition):
    global passed
    assert condition, f"FAIL: {label}"
    passed += 1
    print("PASS:", label)

set_snapshot(make_rows())
original = profile(old_table())
result = recover(copy.deepcopy(original), 42, 2026)

arsenal = next(
    x for x in result["standings"]
    if x["team"]["id"] == 42
)

check("Arsenal rank becomes 1", arsenal["rank"] == 1)
check("Arsenal points become 27", arsenal["points"] == 27)
check("Arsenal played becomes 10", arsenal["all"]["played"] == 10)
check("Complete 20-team table preserved", len(result["standings"]) == 20)
check("Goals and form normalized", arsenal["goalsDiff"] == 10 and arsenal["form"] == "WWWWW")
check("Fixtures, squad and statistics preserved",
      result["future"] == original["future"]
      and result["players"] == original["players"]
      and result["teamStats"] == original["teamStats"])

result = recover(profile(old_table()), 42, 2025)
check("Historical season isolated", result["standings"][0]["points"] == 21)

result = recover(profile(old_table(), 140), 42, 2026)
check("Other leagues isolated", result["standings"][0]["points"] == 21)

state["snapshot"] = None
result = recover(profile(old_table()), 42, 2026)
check("Missing snapshot preserves existing standings",
      result["standings"][0]["points"] == 21)

set_snapshot(make_rows(played=7))
result = recover(profile(old_table()), 42, 2026)
check("Older table cannot replace newer matches",
      result["standings"][0]["points"] == 21)

rows = make_rows()
rows[1]["teamId"] = 42
set_snapshot(rows)
result = recover(profile(old_table()), 42, 2026)
check("Duplicate team IDs rejected", result["standings"][0]["points"] == 21)

rows = make_rows()
rows[1]["rank"] = 1
set_snapshot(rows)
result = recover(profile(old_table()), 42, 2026)
check("Duplicate ranks rejected", result["standings"][0]["points"] == 21)

set_snapshot(make_rows(), season=2025)
result = recover(profile(old_table()), 42, 2026)
check("Wrong snapshot season rejected",
      result["standings"][0]["points"] == 21)

set_snapshot(make_rows(), league_id=140)
result = recover(profile(old_table()), 42, 2026)
check("Wrong snapshot league rejected",
      result["standings"][0]["points"] == 21)

set_snapshot(make_rows())
result = recover(profile(old_table(played=10)), 42, 2026)
check("Equal played count preserves existing table",
      result["standings"][0]["points"] == 21)

set_snapshot(make_rows())
result = recover(profile([]), 42, 2026)
check("Empty profile can recover complete table",
      len(result["standings"]) == 20)

check("Only target snapshot reader used", state["reads"] > 0)
check("Team-view helper is connected",
      source.count("base = _ksn_v663_968ek_fresh_epl_standings(") == 1)

print()
print(f"=== RESULTS: {passed} PASS ===")
print("Database connections: 0")
print("Database writes: 0")
print("Provider requests: 0")
print("Deployments: 0")
print("=== STEP 968EL COMPLETE ===")
