
import json

from player_history_pg_v663 import recover_historical_player_matches


class Cursor:
    def __init__(self, records):
        self.records = records
        self.sql = None
        self.params = None

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def execute(self, sql, params):
        self.sql = sql
        self.params = params
        assert "SELECT payload" in sql
        assert "jsonb_path_exists" in sql
        assert "INSERT" not in sql.upper()
        assert "UPDATE " not in sql.upper()
        assert "DELETE " not in sql.upper()

    def fetchall(self):
        return [(json.dumps(r),) for r in self.records]


class Connection:
    def __init__(self, records):
        self.cur = Cursor(records)
        self.closed = False

    def cursor(self):
        return self.cur

    def close(self):
        self.closed = True


def packet(fid, year, status="FT", pid=19465):
    return {
        "data": {
            "match": {
                "fixture": {
                    "id": fid,
                    "date": f"{year}-10-20T16:00:00Z",
                    "status": {"short": status},
                },
                "league": {
                    "id": 39,
                    "name": "Premier League",
                    "season": year,
                },
                "teams": {
                    "home": {"id": 42, "name": "Arsenal"},
                    "away": {"id": 50, "name": "Opponent"},
                },
                "goals": {"home": 2, "away": 1},
            },
            "players": [{
                "team": {"id": 42},
                "players": [{
                    "player": {"id": pid},
                    "statistics": [{
                        "games": {
                            "minutes": 90,
                            "rating": "7.3",
                        },
                    }],
                }],
            }],
        }
    }


records = [
    packet(101, 2024),
    packet(102, 2025),
    packet(103, 2026),
    packet(104, 2026, "HT"),
    packet(105, 2025, pid=999),
]

db = Connection(records)

print("=== V663 STEP 976C REGRESSIONS ===")

result = recover_historical_player_matches(
    19465, [2024, 2025, 2026], lambda: db
)

ids = {m["fixtureId"] for m in result["matches"]}

assert ids == {101, 102, 103}
print("PASS: Three historical seasons recovered")

assert 104 not in ids
print("PASS: Unfinished match excluded")

assert 105 not in ids
print("PASS: Wrong player excluded")

assert all(m["rating"] == 7.3 for m in result["matches"])
print("PASS: Individual ratings preserved")

assert all(m["competition"]["id"] == 39 for m in result["matches"])
print("PASS: Competitions preserved")

assert db.closed
print("PASS: PostgreSQL connection closed")

assert "$[*].players[*].player" in db.cur.params[1]
print("PASS: Exact player record query")

assert result["historicalSource"] == (
    "existing_postgresql_match_snapshots"
)
print("PASS: Source identified")

db2 = Connection(records)
only_2025 = recover_historical_player_matches(
    19465, [2025], lambda: db2
)
assert {x["fixtureId"] for x in only_2025["matches"]} == {102}
print("PASS: Season filtering")

db3 = Connection(records)
limited = recover_historical_player_matches(
    19465, [2024, 2025, 2026], lambda: db3, limit=2
)
assert limited["historicalScanTruncated"]
print("PASS: Scan truncation reported")

print("=== STEP 976C: 10 PASS ===")
print("Real provider calls: 0")
print("Real database writes: 0")
print("Deployments: 0")
