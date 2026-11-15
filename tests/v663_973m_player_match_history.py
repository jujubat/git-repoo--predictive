
from player_match_history_v663 import (
    build_player_matches,
    paginate_player_matches,
)

def packet(fid=101, pid=19465, rating="7.6",
           minutes=90, season=2026, status="FT",
           competition=39, team=42):
    return {
        "fixture": {
            "fixture": {
                "id": fid,
                "date": "2026-11-01T16:00:00Z",
                "status": {"short": status},
            },
            "league": {
                "id": competition,
                "name": "Premier League",
                "season": season,
            },
            "teams": {
                "home": {"id": 42, "name": "Arsenal"},
                "away": {"id": 50, "name": "Opponent"},
            },
            "goals": {"home": 2, "away": 0},
        },
        "playerGroups": [{
            "team": {"id": team},
            "players": [{
                "player": {"id": pid},
                "statistics": [{
                    "games": {
                        "minutes": minutes,
                        "rating": rating,
                        "position": "Goalkeeper",
                        "substitute": False,
                    },
                    "goals": {
                        "total": 0,
                        "saves": 4,
                        "conceded": 0,
                    },
                    "penalty": {"saved": 1},
                }],
            }],
        }],
    }


print("=== V663 STEP 973M REGRESSIONS ===")

m = build_player_matches(19465, [packet()])
assert len(m) == 1
assert m[0]["fixtureId"] == 101
print("PASS: Correct player and fixture linked")

assert m[0]["rating"] == 7.6
assert m[0]["saves"] == 4
print("PASS: Individual rating and saves extracted")

assert m[0]["competition"]["id"] == 39
assert m[0]["competition"]["name"] == "Premier League"
print("PASS: Competition preserved")

assert m[0]["score"] == {"home": 2, "away": 0}
assert m[0]["minutes"] == 90
print("PASS: Score and minutes preserved")

assert build_player_matches(19465, [packet(pid=99)]) == []
print("PASS: Other player ratings excluded")

assert build_player_matches(19465, [
    packet(minutes=0)
]) == []
print("PASS: Unused substitute excluded")

assert build_player_matches(19465, [
    packet(status="NS")
]) == []
print("PASS: Unfinished fixtures excluded")

assert build_player_matches(19465, [
    packet(team=99)
]) == []
print("PASS: Fixture team identity verified")

assert build_player_matches(19465, [
    packet(rating="12.5")
])[0]["rating"] is None
print("PASS: Invalid rating not published")

assert build_player_matches(19465, [
    packet(rating=None)
])[0]["rating"] is None
print("PASS: Missing ratings remain unknown")

m = build_player_matches(19465, [
    packet(),
    packet(),
    packet(fid=102, competition=2),
])
assert len(m) == 2
print("PASS: Duplicate fixtures removed")

page = paginate_player_matches(m, limit=1)
assert page["count"] == 1
assert page["total"] == 2
assert page["hasMore"]
print("PASS: Pagination works")

page2 = paginate_player_matches(
    m, competition=39
)
assert page2["total"] == 1
print("PASS: Competition filtering works")

assert m[0]["matchCentre"].startswith("/match/football/")
print("PASS: Match Centre link generated")

print("=== STEP 973M: 14 PASS ===")
print("Provider requests: 0")
print("Database writes: 0")
print("Production deployments: 0")
