from player_history_pg_v663 import recover_historical_player_matches


class FakeCursor:
    def __init__(self):
        self.query = ""
        self.params = ()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def execute(self, query, params):
        self.query = query
        self.params = params

        assert "WHERE k LIKE %s" in query
        assert "jsonb_path_exists" in query
        assert "LIMIT %s" in query

        assert query.count("%s") == 3
        assert len(params) == 3

        assert params[0] == "match:football:%"
        assert "@.id == 19465" in params[1]
        assert params[2] == 251

        # Confirm DB-API-style placeholder processing.
        simulated = query % (
            "'pattern'", "'player'", "251"
        )
        assert "LIKE 'pattern'" in simulated

    def fetchall(self):
        return []


class FakeConnection:
    def __init__(self):
        self.cur = FakeCursor()
        self.closed = False

    def cursor(self):
        return self.cur

    def close(self):
        self.closed = True


db = FakeConnection()

result = recover_historical_player_matches(
    19465,
    [2024, 2025, 2026],
    lambda: db,
)

assert result["matches"] == []
assert db.closed
assert result["historicalScanTruncated"] is False

print("=== V663 STEP 978B SQL REGRESSIONS ===")
print("PASS: Parameterized LIKE")
print("PASS: Player JSONPath filter")
print("PASS: Three SQL parameters")
print("PASS: Bounded history query")
print("PASS: Database connection closed")
print("PASS: Empty results handled")
print("=== SQL REGRESSIONS: 6 PASS ===")
