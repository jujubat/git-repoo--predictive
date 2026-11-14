
import ast
import pathlib
import unittest
import warnings

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = (ROOT / "server.py").read_text(encoding="utf-8-sig")

with warnings.catch_warnings():
    warnings.simplefilter("ignore", SyntaxWarning)
    TREE = ast.parse(SOURCE)

NODES = [
    n for n in TREE.body
    if isinstance(n, ast.FunctionDef)
    and n.name == "_ksn_v591_pg_team_view"
]

assert len(NODES) == 1
MODULE = ast.Module(body=NODES, type_ignores=[])
ast.fix_missing_locations(MODULE)
CODE = compile(MODULE, "<isolated profile view>", "exec")


class ProfileIntegrationTests(unittest.TestCase):

    def setUp(self):
        self.calls = []
        self.legacy_league = None
        self.global_league = None
        self.hint_league = None

        def hint(team, season):
            self.calls.append(("hint", team, season))
            return self.hint_league

        def legacy(team, season):
            self.calls.append(("legacy", team, season))
            return self.legacy_league

        def global_resolve(team, season):
            self.calls.append(("global", team, season))
            return self.global_league

        def standings(team, league, season):
            self.calls.append(("standings", team, league, season))
            return [
                {
                    "team": {"id": team},
                    "rank": 1,
                    "all": {"played": 10}
                }
            ]

        self.env = {
            "_team_league_hint_db": hint,
            "_ksn_v591_pg_league": legacy,
            "_ksn_v663_969m_verified_global_league":
                global_resolve,
            "_ksn_v591_standings": standings,
            "_ksn_valid_team_stats": lambda value: bool(value),
            "_ksn_v585_archive_season_summary":
                lambda *args: {},
            "_ksn_stats_from_summary":
                lambda *args: {},
            "_ksn_v613_fill_stats":
                lambda profile, team, season: profile,
            "_ksn_v583_archive_team_results":
                lambda team, limit=40: [],
            "_ksn_v588_match_ok":
                lambda row, team, upcoming: True,
        }

        exec(CODE, self.env)
        self.view = self.env["_ksn_v591_pg_team_view"]

    def test_fc_thun_global_fallback(self):
        self.global_league = 207
        result = self.view(
            {"team": {"id": 1012}, "standings": []},
            1012,
            2026,
        )
        self.assertEqual(result["league"]["id"], 207)
        self.assertEqual(
            result["standings"][0]["team"]["id"],
            1012,
        )
        self.assertIn(
            ("global", 1012, 2026),
            self.calls,
        )

    def test_existing_verified_league_retained(self):
        self.global_league = 207
        result = self.view(
            {
                "league": {"id": 39},
                "standings": [{"team": {"id": 42}}],
            },
            42,
            2026,
        )
        self.assertEqual(result["league"]["id"], 39)
        self.assertFalse(
            any(row[0] == "global" for row in self.calls)
        )

    def test_big_five_precedes_global(self):
        self.legacy_league = 39
        self.global_league = 207
        result = self.view({}, 42, 2026)
        self.assertEqual(result["league"]["id"], 39)
        self.assertFalse(
            any(row[0] == "global" for row in self.calls)
        )

    def test_existing_team_league_hint_precedes_global(self):
        self.hint_league = 207
        result = self.view({}, 1012, 2026)
        self.assertEqual(result["league"]["id"], 207)
        self.assertFalse(
            any(row[0] == "global" for row in self.calls)
        )

    def test_no_evidence_does_not_invent_league(self):
        result = self.view({}, 1012, 2026)
        self.assertFalse(result.get("league"))
        self.assertFalse(result.get("standings"))

    def test_existing_statistics_preserved(self):
        self.global_league = 207
        stats = {
            "fixtures": {"played": {"total": 12}}
        }
        result = self.view(
            {"teamStats": stats},
            1012,
            2026,
        )
        self.assertEqual(result["teamStats"], stats)

    def test_other_team_identity_preserved(self):
        self.global_league = 207
        result = self.view(
            {"team": {"id": 1012, "name": "FC Thun"}},
            1012,
            2026,
        )
        self.assertEqual(result["team"]["name"], "FC Thun")

    def test_exact_team_and_season_forwarded(self):
        self.global_league = 207
        self.view({}, 1012, 2025)
        self.assertIn(
            ("global", 1012, 2025),
            self.calls,
        )

    def test_arsenal_helper_remains_present(self):
        self.assertIn(
            "def _ksn_v663_968fx_season_stats(",
            SOURCE,
        )
        self.assertIn(
            "def _ksn_v663_968gc_intel_summary(",
            SOURCE,
        )

    def test_voting_guard_remains_present(self):
        self.assertIn(
            "Supporter voting is disabled",
            SOURCE,
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)
