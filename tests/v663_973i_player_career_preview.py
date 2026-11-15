import ast
import warnings
from pathlib import Path

source = Path("server.py").read_text(encoding="utf-8-sig")

with warnings.catch_warnings():
    warnings.simplefilter("ignore", SyntaxWarning)
    tree = ast.parse(source)

helper = next(
    node for node in tree.body
    if isinstance(node, ast.FunctionDef)
    and node.name == "_ksn_v663_973i_career_preview"
)

namespace = {}
exec(compile(
    ast.fix_missing_locations(
        ast.Module(body=[helper], type_ignores=[])
    ),
    "career-preview", "exec"
), namespace)

build = namespace["_ksn_v663_973i_career_preview"]

calls = []

def fake_database(player, year):
    calls.append((player, year))
    if year != 2025:
        return None
    return {
        "player": {"id": 19465, "name": "David Raya"},
        "season": 2025,
        "statistics": [{
            "team": {"id": 42, "name": "Arsenal"},
            "league": {
                "id": 39,
                "name": "Premier League",
                "season": 2025,
            },
            "games": {
                "appearences": 30,
                "minutes": 2700,
                "position": "Goalkeeper",
            },
            "goals": {
                "saves": 80,
                "conceded": 25,
            },
            "penalty": {"saved": 1},
        }],
    }

print("=== V663 STEP 973I REGRESSIONS ===")

result = build(19465, [2026, 2025, 2024], fake_database)

assert calls == [
    (19465, 2026),
    (19465, 2025),
    (19465, 2024),
]
print("PASS: Only requested historical years queried")

assert result["availableSeasonCount"] == 1
assert result["missingSeasons"] == [2026, 2024]
print("PASS: Missing seasons explicitly reported")

record = result["seasons"][0]
assert record["season"] == 2025
assert record["competitions"][0]["team"] == "Arsenal"
print("PASS: Club and season identity preserved")

stat = record["competitions"][0]
assert stat["saves"] == 80
assert stat["goalsConceded"] == 25
assert stat["penaltySaves"] == 1
print("PASS: Historical goalkeeper statistics retained")

assert stat["goals"] is None
assert stat["assists"] is None
print("PASS: Unknown statistics not fabricated")

assert build(12345, [2025], fake_database)["status"] == (
    "unsupported_reference_player"
)
print("PASS: Reference player isolation")

bad = {
    "statistics": [{
        "league": {"season": 2024},
        "games": {"appearences": 20},
    }]
}

assert build(
    19465, [2025], lambda player, year: bad
)["availableSeasonCount"] == 0
print("PASS: Wrong-season records rejected")

route = next(
    node for node in tree.body
    if isinstance(node, ast.FunctionDef)
    and node.name == "_ksn_v663_973i_player_career_preview"
)

assert '_sql_player_profile' in ast.unparse(route)

for node in (helper, route):
    calls_in_function = {
        ast.unparse(x.func)
        for x in ast.walk(node)
        if isinstance(x, ast.Call)
    }
    assert not calls_in_function.intersection({
        "_afoot_get",
        "_sql_sync_player",
        "_dashboard_snapshot_put",
        "_db_upsert_player",
    })

print("PASS: No provider or database-write calls")

print("=== STEP 973I: 8 PASS ===")
print("Real provider requests: 0")
print("Real database writes: 0")
print("Deployments: 0")
