
from player_match_history_v663 import collect_cached_player_matches

def fixture(fid, status):
    return {
        "fixture": {
            "id": fid,
            "date": "2026-11-01T16:00:00Z",
            "status": {"short": status},
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
        "statistics": [{
            "team": {"id": 42},
            "league": {"season": year},
        }]
    }

fixtures = [
    fixture(1208194, "FT"),
    fixture(1378979, "FT"),
    fixture(1557409, "FT"),
    fixture(1557417, "FT"),
    fixture(1557453, "FT"),
    fixture(1635726, "1H"),
    fixture(999001, "FT"),
]

def mirrored(tid, year):
    return fixtures

def player_groups(minutes=90, rating="7.0"):
    return [{
        "team": {"id": 42},
        "players": [{
            "player": {"id": 19465},
            "statistics": [{
                "games": {
                    "minutes": minutes,
                    "rating": rating,
                    "substitute": False,
                },
                "goals": {"saves": 3},
            }],
        }],
    }]

def snapshot(key):
    fid = int(key.rsplit(":", 1)[-1])
    status = "1H" if fid == 1635726 else "FT"

    if fid == 999001:
        return {
            "data": {
                "completed": True,
                "match": fixture(999002, "FT"),
                "players": player_groups(),
            }
        }

    payload = {
        "match": fixture(fid, status),
        "players": player_groups(),
    }

    if fid in (1208194, 1557453):
        payload["completed"] = True

    return {"data": payload}

print("=== V663 STEP 973W REGRESSIONS ===")

result = collect_cached_player_matches(
    19465,
    [2026],
    profile,
    mirrored,
    snapshot,
)

ids = {
    match["fixtureId"]
    for match in result["matches"]
}

assert ids == {
    1208194, 1378979, 1557409,
    1557417, 1557453,
}
print("PASS: Finished appearances recovered")

assert len(ids) == 5
print("PASS: Missing completed flags no longer hide FT matches")

assert 1635726 not in ids
print("PASS: Live match excluded")

assert 999001 not in ids
print("PASS: Mismatched fixture rejected")

assert result["missingMatchSnapshots"] == 2
print("PASS: Invalid snapshots counted")

assert all(m["rating"] == 7 for m in result["matches"])
print("PASS: Individual ratings preserved")

assert all(
    m["competition"]["name"] == "Premier League"
    for m in result["matches"]
)
print("PASS: Competition preserved")

assert result["cacheOnly"] is True
print("PASS: No provider access required")

print("=== STEP 973W: 8 PASS ===")
