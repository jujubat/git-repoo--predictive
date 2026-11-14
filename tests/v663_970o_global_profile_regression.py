import ast
import copy
import unittest
import warnings
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = (ROOT / "server.py").read_text(encoding="utf-8-sig")

with warnings.catch_warnings():
    warnings.simplefilter("ignore", SyntaxWarning)
    TREE = ast.parse(SOURCE)

FUNCTIONS = {
    node.name: node
    for node in TREE.body
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
}

HELPER = "_ksn_v663_970n_team_completeness"
assert HELPER in FUNCTIONS, "Missing shared validator"

module = ast.Module(body=[FUNCTIONS[HELPER]], type_ignores=[])
ast.fix_missing_locations(module)

def valid_stats(value):
    return (
        isinstance(value, dict)
        and bool(value.get("fixtures"))
    )

scope = {"_ksn_valid_team_stats": valid_stats}
exec(compile(module, "<isolated-validator>", "exec"), scope)
validate = scope[HELPER]


def example(team_id=1012, league_id=207):
    return {
        "team": {"id": team_id, "name": "Verified Football Club"},
        "season": 2026,
        "league": {"id": league_id, "season": 2026},
        "standings": [
            {"team": {"id": team_id}, "rank": 1}
        ],
        "players": [
            {"id": 1001, "name": "Player A"},
            {"id": 1002, "name": "Player B"},
        ],
        "past10": [{"id": 5001}],
        "future": [],
        "teamStats": {"fixtures": {"played": {"total": 10}}},
        "dataComplete": False,
        "repairRequired": True,
    }


class GlobalTeamCompletenessTests(unittest.TestCase):

    def verify(self, data, team_id, expected):
        original = copy.deepcopy(data)
        result = validate(data, team_id, 2026)

        self.assertIs(result["dataComplete"], expected)
        self.assertIs(result["repairRequired"], not expected)
        self.assertEqual(data, original)

    def test_fc_thun_complete(self):
        self.verify(example(1012, 207), 1012, True)

    def test_arsenal_complete(self):
        self.verify(example(42, 39), 42, True)

    def test_another_global_team(self):
        self.verify(example(555, 88), 555, True)

    def test_missing_squad(self):
        data = example()
        data["players"] = []
        self.verify(data, 1012, False)

    def test_missing_statistics(self):
        data = example()
        data["teamStats"] = {}
        self.verify(data, 1012, False)

    def test_wrong_team_in_standings(self):
        data = example()
        data["standings"][0]["team"]["id"] = 9999
        self.verify(data, 1012, False)

    def test_wrong_league_season(self):
        data = example()
        data["league"]["season"] = 2025
        self.verify(data, 1012, False)

    def test_duplicate_players(self):
        data = example()
        data["players"][1]["id"] = 1001
        self.verify(data, 1012, False)

    def test_missing_matches(self):
        data = example()
        data["past10"] = []
        self.verify(data, 1012, False)

    def test_team_view_uses_final_validator(self):
        fn = FUNCTIONS["_ksn_v590_team_view"]
        fragment = ast.get_source_segment(SOURCE, fn)

        self.assertIn(
            "base = _ksn_v663_970n_team_completeness("
            "base, team_id, season)",
            fragment
        )

        self.assertLess(
            fragment.index("_ksn_v663_968fx_season_stats("),
            fragment.index("base = _ksn_v663_970n_team_completeness(")
        )

    def test_data_health_uses_shared_view(self):
        fn = FUNCTIONS["team_data_health"]
        fragment = ast.get_source_segment(SOURCE, fn)

        self.assertIn("_ksn_v590_team_view(", fragment)

    def test_profile_uses_shared_view(self):
        fn = FUNCTIONS["team_profile"]
        fragment = ast.get_source_segment(SOURCE, fn)

        self.assertIn("_ksn_v590_team_view(", fragment)

    def test_no_external_io_in_validator(self):
        fn = FUNCTIONS[HELPER]
        names = {
            node.func.id
            for node in ast.walk(fn)
            if isinstance(node, ast.Call)
            and isinstance(node.func, ast.Name)
        }

        for forbidden in (
            "_afoot_get",
            "psycopg2",
            "_dashboard_snapshot_put",
            "_dashboard_snapshot_get",
        ):
            self.assertNotIn(forbidden, names)


if __name__ == "__main__":
    unittest.main(verbosity=2)
