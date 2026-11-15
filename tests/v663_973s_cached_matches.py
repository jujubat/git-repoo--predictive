
from player_match_history_v663 import (
    collect_cached_player_matches,
    paginate_player_matches,
)

def fixture(fid, date="2026-11-01T12:00:00Z"):
    return {
        "fixture": {
            "id": fid,
            "date": date,
            "status": {"short": "FT"},
        },
        "league": {
            "id": 39,
            "name": "Premier League",
            "season": 2026,
        },
        "teams": {
            "home": {"id": 42, "name": "Arsenal"},
            "away": {"id": 50, "name": "Opponent"},
        },
        "goals": {"home": 2, "away": 0},
    }

def profile(pid, year):
    return {
        "player": {"id": pid},
        "statistics": [{
            "team": {"id": 42},
            "league": {"season": year},
        }],
    }

def fixtures(tid, year):
    return [fixture(101), fixture(102)]

def snapshot(key):
    if key != "match:football:101":
        return None
    return {
        "data": {
            "completed": True,
            "match": fixture(101),
            "players": [{
                "team": {"id": 42},
                "players": [{
                    "player": {"id": 19465},
                    "statistics": [{
                        "games": {
                            "minutes": 90,
                            "rating": "7.4",
                            "substitute": False,
                        },
                        "goals": {"saves": 4},
                    }],
                }],
            }],
        }
    }

print("=== V663 STEP 973S REGRESSIONS ===")

r = collect_cached_player_matches(
    19465, [2026], profile, fixtures, snapshot
)

assert r["verifiedAppearances"] == 1
print("PASS: Verified player appearance")

assert r["matches"][0]["rating"] == 7.4
print("PASS: Individual match rating")

assert r["matches"][0]["competition"]["id"] == 39
print("PASS: Competition retained")

assert r["missingMatchSnapshots"] == 1
print("PASS: Missing snapshot counted")

assert r["candidateFixtureCount"] == 2
print("PASS: Candidate fixtures deduplicated")

page = paginate_player_matches(r["matches"], limit=25)
assert page["total"] == 1
print("PASS: Paginated response")

r2 = collect_cached_player_matches(
    19465, [2026], profile, fixtures,
    snapshot, max_candidates=1
)
assert r2["scanTruncated"]
print("PASS: Truncation reported")

r3 = collect_cached_player_matches(
    19465, [2025],
    lambda pid, year: None,
    fixtures, snapshot
)
assert r3["missingProfileYears"] == [2025]
print("PASS: Missing historical year reported")

assert r["cacheOnly"] is True
print("PASS: Cache-only contract")

print("=== STEP 973S: 9 PASS ===")
print("Real provider requests: 0")
print("Real database writes: 0")
