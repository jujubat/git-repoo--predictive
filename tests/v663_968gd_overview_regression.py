import ast
import copy
import runpy
import unittest
import warnings
from pathlib import Path

source = Path("server.py").read_text(encoding="utf-8")

with warnings.catch_warnings():
    warnings.simplefilter("ignore", SyntaxWarning)
    tree = ast.parse(source)

name = "_ksn_v663_968gc_intel_summary"
nodes = [
    n for n in tree.body
    if isinstance(n, ast.FunctionDef) and n.name == name
]
assert len(nodes) == 1, "BLOCKED: Overview helper missing"

namespace = {}
exec(
    compile(
        ast.Module(body=nodes, type_ignores=[]),
        "<overview-test>",
        "exec"
    ),
    namespace
)
reconcile_overview = namespace[name]

prior = runpy.run_path(
    "tests/v663_968fy_season_stats_regression.py"
)
ProfileTests = prior["SeasonStatsTests"]
make_profile = prior["profile"]

def profile_result(complete=True):
    fixture = ProfileTests(
        "test_complete_ten_match_reconciliation"
    )
    fixture.setUp()
    p = make_profile()
    if not complete:
        p["past10"] = p["past10"][:1]
    return fixture.run_helper(p, 42, 2026)

def old_summary():
    return {
        "played": 6,
        "wins": 5,
        "draws": 0,
        "losses": 1,
        "goalsFor": 10,
        "goalsAgainst": 5,
        "cleanSheets": 3,
        "failedToScore": 1,
        "homePlayed": 3,
        "awayPlayed": 3,
        "homeWins": 3,
        "awayWins": 2,
        "goalDifference": 5,
        "winRate": 83.3,
        "unrelatedMetric": "preserved",
    }

class OverviewTests(unittest.TestCase):

    def test_complete_season_totals(self):
        result = reconcile_overview(
            old_summary(), profile_result(), 42, 2026
        )
        self.assertEqual(result["played"], 10)
        self.assertEqual(result["wins"], 9)
        self.assertEqual(result["draws"], 0)
        self.assertEqual(result["losses"], 1)
        self.assertEqual(result["goalsFor"], 15)
        self.assertEqual(result["goalsAgainst"], 5)

    def test_full_season_clean_sheets(self):
        result = reconcile_overview(
            old_summary(), profile_result(), 42, 2026
        )
        self.assertTrue(result["seasonStatsComplete"])
        self.assertEqual(result["cleanSheets"], 7)
        self.assertEqual(result["failedToScore"], 1)

    def test_home_away_complete(self):
        result = reconcile_overview(
            old_summary(), profile_result(), 42, 2026
        )
        self.assertEqual(result["homePlayed"], 5)
        self.assertEqual(result["awayPlayed"], 5)
        self.assertEqual(result["homeWins"], 5)
        self.assertEqual(result["awayWins"], 4)

    def test_goal_difference_and_win_rate(self):
        result = reconcile_overview(
            old_summary(), profile_result(), 42, 2026
        )
        self.assertEqual(result["goalDifference"], 10)
        self.assertEqual(result["winRate"], 90.0)

    def test_incomplete_data_clears_old_clean_sheets(self):
        result = reconcile_overview(
            old_summary(), profile_result(False), 42, 2026
        )
        self.assertFalse(result["seasonStatsComplete"])
        self.assertEqual(result["played"], 10)
        self.assertIsNone(result["cleanSheets"])
        self.assertIsNone(result["failedToScore"])

    def test_incomplete_data_clears_home_away(self):
        result = reconcile_overview(
            old_summary(), profile_result(False), 42, 2026
        )
        for key in (
            "homePlayed", "awayPlayed",
            "homeWins", "awayWins"
        ):
            self.assertIsNone(result[key])

    def test_other_team_unchanged(self):
        original = old_summary()
        self.assertIs(
            reconcile_overview(
                original, profile_result(), 1012, 2026
            ),
            original
        )

    def test_other_season_unchanged(self):
        original = old_summary()
        self.assertIs(
            reconcile_overview(
                original, profile_result(), 42, 2025
            ),
            original
        )

    def test_other_league_unchanged(self):
        p = profile_result()
        p["league"]["id"] = 2
        original = old_summary()
        self.assertIs(
            reconcile_overview(original, p, 42, 2026),
            original
        )

    def test_unverified_source_unchanged(self):
        p = profile_result()
        p.pop("standingsSource")
        original = old_summary()
        self.assertIs(
            reconcile_overview(original, p, 42, 2026),
            original
        )

    def test_invalid_totals_unchanged(self):
        p = profile_result()
        p["teamStats"]["fixtures"]["played"]["total"] = 9
        original = old_summary()
        self.assertIs(
            reconcile_overview(original, p, 42, 2026),
            original
        )

    def test_inputs_not_mutated(self):
        original = old_summary()
        p = profile_result()
        a = copy.deepcopy(original)
        b = copy.deepcopy(p)
        result = reconcile_overview(original, p, 42, 2026)
        self.assertEqual(original, a)
        self.assertEqual(p, b)
        self.assertEqual(result["unrelatedMetric"], "preserved")

    def test_integration_order(self):
        fn = next(
            n for n in tree.body
            if isinstance(n, ast.AsyncFunctionDef)
            and n.name == "_ksn_v621_build_intel"
        )
        block = source.splitlines()[
            fn.lineno - 1:fn.end_lineno
        ]
        text = "\n".join(block)

        completion = text.index(
            "prof = _ksn_v588_complete_profile("
        )
        reconciliation = text.index(
            "prof = _ksn_v663_968fx_season_stats("
        )
        fallback = text.index(
            'summary.update({k:(derived.get(k)'
        )
        overview = text.index(
            "summary = _ksn_v663_968gc_intel_summary("
        )

        self.assertLess(completion, reconciliation)
        self.assertLess(reconciliation, fallback)
        self.assertLess(fallback, overview)

if __name__ == "__main__":
    unittest.main(verbosity=2)
