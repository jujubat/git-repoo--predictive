
import ast
import warnings
from pathlib import Path

from fantasy_player_detail_v663 import normalized_fantasy_details

record = {
    "stats": {
        "appearances": 14,
        "saves": 31,
        "nested": {"value": 2},
    },
    "photoUrl": "https://example.org/football/players/123.png",
    "fantasyPoints": 85,
}

result = normalized_fantasy_details(record)

assert result["stats"]["appearances"] == 14
print("PASS: Appearances retained")

assert result["stats"]["saves"] == 31
print("PASS: Goalkeeper statistics retained")

assert result["stats"]["nested"]["value"] == 2
print("PASS: Nested statistics retained")

assert result["statsSource"] == "FantasyPlayoffs"
assert result["statsVerified"] is False
print("PASS: Source and verification status retained")

assert result["photoUrl"].startswith("https://")
print("PASS: HTTPS photo retained")

assert "fantasyPoints" not in result
print("PASS: Fantasy points not overwritten")

assert "photoUrl" not in normalized_fantasy_details({
    "photoUrl": "javascript:alert(1)"
})
print("PASS: Invalid photo scheme excluded")

assert "stats" not in normalized_fantasy_details({
    "stats": {"value": float("nan")}
})
print("PASS: Invalid numerical statistics excluded")

source = Path("server.py").read_text(encoding="utf-8")

with warnings.catch_warnings():
    warnings.simplefilter("ignore", SyntaxWarning)
    tree = ast.parse(source)

matches = [
    node for node in ast.walk(tree)
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
    and node.name == "_v660_fp_players_from_bundle"
]

assert len(matches) == 1

body = ast.get_source_segment(source, matches[0])

assert "**normalized_fantasy_details(record)" in body
assert "player_id = f\"fp:{league_id}:{provider_id}\"" in body
print("PASS: Provider player identity preserved")

assert "fantasyPoints" in body
assert "players.sort(" in body
print("PASS: Ranking calculation preserved")

print("=== V663 STEP 980C-1: 10 PASS ===")
