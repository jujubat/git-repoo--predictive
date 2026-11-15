import ast
import warnings
from pathlib import Path

source = Path("server.py").read_text(encoding="utf-8-sig")

with warnings.catch_warnings():
    warnings.simplefilter("ignore", SyntaxWarning)
    tree = ast.parse(source)

helper = next(
    n for n in tree.body
    if isinstance(n, ast.FunctionDef)
    and n.name == "_ksn_v663_973d_player_data_pilot"
)

namespace = {}
exec(compile(
    ast.fix_missing_locations(
        ast.Module(body=[helper], type_ignores=[])
    ),
    "player-pilot",
    "exec"
), namespace)

build = namespace["_ksn_v663_973d_player_data_pilot"]

sample = {
    "player": {"id": 19465, "name": "Reference Player"},
    "requestedSeason": 2026,
    "season": 2025,
    "statistics": [{
        "team": {"id": 42, "name": "Test Club"},
        "league": {"id": 39, "name": "Test League"},
        "games": {
            "appearences": 10,
            "minutes": 800,
            "rating": "7.20"
        },
        "goals": {"total": 3, "assists": 2},
        "shots": {"total": 15, "on": 7},
        "passes": {"total": 250, "key": 12},
        "cards": {"yellow": 1, "red": 0},
    }]
}

print("=== V663 STEP 973D REGRESSIONS ===")

result = build(sample)
row = result["competitionStatistics"][0]

assert result["playerId"] == 19465
assert result["competitionCount"] == 1
print("PASS: Reference player receives enhanced data")

assert result["seasonFallback"] is True
print("PASS: Previous season clearly identified")

assert row["attacking"]["goals"] == 3
assert row["attacking"]["assists"] == 2
assert row["attacking"]["shotsOnTarget"] == 7
assert row["attacking"]["keyPasses"] == 12
print("PASS: Attacking statistics extracted")

assert row["games"]["rating"] == 7.2
assert row["discipline"]["yellowCards"] == 1
assert row["discipline"]["redCards"] == 0
print("PASS: Ratings and discipline retained")

assert row["defending"]["tackles"] is None
assert row["passing"]["accuracy"] is None
print("PASS: Missing values remain unknown, not zero")

other = dict(sample)
other["player"] = {"id": 12345}
assert build(other) == {}
print("PASS: Other player profiles unchanged")

bad = dict(sample)
bad["statistics"] = [{
    "games": {"rating": "12.5"}
}]
assert (
    build(bad)["competitionStatistics"][0]["games"]["rating"]
    is None
)
print("PASS: Invalid rating rejected")

route = next(
    n for n in tree.body
    if isinstance(n, ast.AsyncFunctionDef)
    and n.name == "player_profile"
)
route_source = ast.get_source_segment(source, route)

assert "_ksn_v663_973d_player_data_pilot(response)" in route_source
assert 'response["enhancedPlayerData"] = pilot' in route_source
print("PASS: Existing player endpoint uses pilot")

print("=== STEP 973D: 8 PASS ===")
print("Real provider requests: 0")
print("Database writes: 0")
print("Deployments: 0")

print("\n=== V663 STEP 973H: GOALKEEPER REGRESSIONS ===")

gk = dict(sample)
gk["statistics"] = [{
    "team": {"id": 42, "name": "Arsenal"},
    "league": {
        "id": 39,
        "name": "Premier League",
        "season": 2026
    },
    "games": {
        "appearences": 10,
        "minutes": 900,
        "position": "Goalkeeper",
        "rating": "7.21"
    },
    "goals": {
        "total": 0,
        "conceded": 6,
        "saves": 24
    },
    "penalty": {
        "saved": 1
    }
}]

data = build(gk)
row = data["competitionStatistics"][0]
keeper = row["goalkeeper"]

assert keeper["saves"] == 24
print("PASS: Goalkeeper saves")

assert keeper["goalsConceded"] == 6
print("PASS: Goals conceded")

assert keeper["penaltySaves"] == 1
print("PASS: Penalty saves")

assert keeper["cleanSheets"] is None
print("PASS: Clean sheets not invented")

assert row["games"]["rating"] == 7.21
assert row["games"]["minutes"] == 900
print("PASS: Player statistics retained")

missing = dict(gk)
missing["statistics"] = [{"games": {"position": "Goalkeeper"}}]

unknown = build(missing)["competitionStatistics"][0]["goalkeeper"]

assert unknown["saves"] is None
assert unknown["goalsConceded"] is None
assert unknown["penaltySaves"] is None
print("PASS: Missing goalkeeper data remains unknown")

other = dict(gk)
other["player"] = {"id": 12345}
assert build(other) == {}
print("PASS: Other players unaffected")

print("=== STEP 973H: 7 PASS ===")
