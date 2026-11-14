import ast
import copy
import logging
import warnings
from pathlib import Path

warnings.filterwarnings("ignore", category=SyntaxWarning)

print("=== V663 STEP 968EP: TIMESTAMP REGRESSIONS ===")

source = Path("server.py").read_text(encoding="utf-8")
tree = ast.parse(source)
name = "_ksn_v663_968ek_fresh_epl_standings"
nodes = [
    n for n in tree.body
    if isinstance(n, ast.FunctionDef) and n.name == name
]
assert len(nodes) == 1

module = ast.Module(body=nodes, type_ignores=[])
ast.fix_missing_locations(module)

state = {"latest": None, "canonical": None, "reads": []}

def get_snapshot(key):
    state["reads"].append(key)
    if key == "standings2627:last_good:PREMIER LEAGUE":
        return copy.deepcopy(state["latest"])
    if key == "canonical_standings:39:2026":
        return copy.deepcopy(state["canonical"])
    raise AssertionError("Unexpected snapshot key")

env = {
    "_dashboard_snapshot_get": get_snapshot,
    "log": logging.getLogger("v663-test")
}
exec(compile(module, "<isolated>", "exec"), env)
recover = env[name]

def rows(points=27, played=10):
    output = []
    for rank in range(1, 21):
        tid = 42 if rank == 1 else 20000 + rank
        output.append({
            "teamId": tid,
            "team": "Arsenal" if tid == 42 else f"Team {rank}",
            "rank": rank,
            "played": played,
            "win": played - 1,
            "draw": 0,
            "lose": 1,
            "points": points if tid == 42 else (played - 1) * 3,
            "goalsFor": 15,
            "goalsAgainst": 5,
            "form": "WWWWW",
        })
    return output

def old_rows(points=21, played=10):
    return [{
        "team": {"id": r["teamId"], "name": r["team"]},
        "rank": 2 if r["teamId"] == 42 else r["rank"],
        "points": points if r["teamId"] == 42 else r["points"],
        "all": {"played": played},
    } for r in rows(played=played)]

def configure(latest_time=200, canonical_time=100,
              canonical_points=21, latest_played=10):
    state["latest"] = {
        "updated_at": latest_time,
        "data": {"leagues": [{
            "leagueId": 39,
            "season": 2026,
            "table": rows(27, latest_played),
        }]}
    }
    state["canonical"] = {
        "updated_at": canonical_time,
        "data": {"standings": old_rows(canonical_points)}
    }

def run(season=2026):
    base = {
        "league": {"id": 39},
        "standings": old_rows(),
        "future": [{"id": 1555429}],
        "players": [{"id": 123}],
        "teamStats": {"preserved": True},
    }
    result = recover(copy.deepcopy(base), 42, season)
    row = next(
        r for r in result["standings"]
        if r["team"]["id"] == 42
    )
    assert result["future"] == base["future"]
    assert result["players"] == base["players"]
    assert result["teamStats"] == base["teamStats"]
    return row

passed = 0

def check(label, condition):
    global passed
    assert condition, "FAIL: " + label
    passed += 1
    print("PASS:", label)

configure()
r = run()
check("Newer timestamp corrects equal-match points",
      r["points"] == 27 and r["rank"] == 1)

configure(latest_time=50)
check("Older timestamp rejected", run()["points"] == 21)

configure(latest_time=100)
check("Equal timestamp rejected", run()["points"] == 21)

configure(canonical_points=19)
check("Canonical mismatch preserves current table",
      run()["points"] == 21)

configure()
state["canonical"] = None
check("Missing canonical snapshot preserves current table",
      run()["points"] == 21)

configure()
state["latest"]["updated_at"] = None
check("Missing timestamp prevents equal-count override",
      run()["points"] == 21)

configure(latest_played=11)
check("More matches recovers newer table",
      run()["all"]["played"] == 11)

configure()
check("Historical season isolated",
      run(season=2025)["points"] == 21)

check("Only approved snapshots read",
      set(state["reads"]).issubset({
          "standings2627:last_good:PREMIER LEAGUE",
          "canonical_standings:39:2026",
      }))

print(f"=== RESULTS: {passed} PASS ===")
print("Database connections: 0")
print("Provider requests: 0")
print("Deployments: 0")
