import ast
import copy
import logging
import unittest
import warnings
from pathlib import Path

SOURCE = Path("server.py").read_text(encoding="utf-8")
NAME = "_ksn_v663_968fx_season_stats"

with warnings.catch_warnings():
    warnings.simplefilter("ignore", SyntaxWarning)
    tree = ast.parse(SOURCE)

nodes = [
    n for n in tree.body
    if isinstance(n, ast.FunctionDef) and n.name == NAME
]
assert len(nodes) == 1, "Helper missing or duplicated"

# Compile only the isolated helper. Do not import server.py,
# start the application, or open any database connections.
code = compile(
    ast.Module(body=nodes, type_ignores=[]),
    "<season-stats-test>",
    "exec"
)

MATCHES = [
    (1557367, 42, 1346, 3, 0, "2026-08-21T21:00:00+02:00"),
    (1557377, 66, 42, 0, 1, "2026-08-31T21:00:00+02:00"),
    (1557387, 42, 49, 2, 1, "2026-09-06T17:30:00+02:00"),
    (1557405, 746, 42, 0, 2, "2026-09-12T21:00:00+02:00"),
    (1557409, 51, 42, 3, 0, "2026-09-19T16:00:00+02:00"),
    (1557417, 42, 63, 2, 1, "2026-10-10T13:30:00+02:00"),
    (1557435, 65, 42, 0, 1, "2026-10-18T17:30:00+02:00"),
    (1557437, 42, 45, 2, 0, "2026-10-24T16:00:00+02:00"),
    (1557453, 40, 42, 0, 1, "2026-11-01T18:30:00+02:00"),
    (1557457, 42, 64, 1, 0, "2026-11-07T17:00:00+02:00"),
]

def raw_fixture(row, finished):
    fid, hid, aid, hg, ag, date = row
    return {
        "fixture": {
            "id": fid,
            "date": date,
            "status": {"short": "FT" if finished else "NS"},
        },
        "league": {"id": 39, "season": 2026},
        "teams": {
            "home": {"id": hid},
            "away": {"id": aid},
        },
        "goals": {
            "home": hg if finished else None,
            "away": ag if finished else None,
        },
        "score": {
            "fulltime": {
                "home": hg if finished else None,
                "away": ag if finished else None,
            },
        },
    }

def recent_fixture(row):
    fid, hid, aid, hg, ag, date = row
    return {
        "id": str(fid),
        "date": date,
        "leagueId": "39",
        "homeId": str(hid),
        "awayId": str(aid),
        "homeScore": hg,
        "awayScore": ag,
        "status": "FT",
    }

def profile():
    return {
        "team": {"id": 42, "name": "Arsenal"},
        "league": {"id": 39, "season": 2026},
        "standingsSource": "verified-epl-last-good",
        "standings": [{
            "team": {"id": 42},
            "rank": 1,
            "points": 27,
            "form": "WWWWW",
            "all": {
                "played": 10,
                "win": 9,
                "draw": 0,
                "lose": 1,
                "goals": {"for": 15, "against": 5},
            },
        }],
        "past10": [
            recent_fixture(MATCHES[8]),
            recent_fixture(MATCHES[9]),
        ],
        "teamStats": {
            "fixtures": {"played": {"total": 6}},
            "clean_sheet": {"total": 3},
        },
        "players": [{"id": i} for i in range(33)],
        "future": [{"id": i} for i in range(10)],
    }

class SeasonStatsTests(unittest.TestCase):
    def setUp(self):
        self.rows = [
            raw_fixture(row, i < 8)
            for i, row in enumerate(MATCHES)
        ]
        namespace = {
            "_ksn_v607_mirrored_fixtures":
                lambda team, season: copy.deepcopy(self.rows),
            "_ksn_stats_from_summary":
                self.stats_from_summary,
            "log": logging.getLogger("v663-test"),
        }
        exec(code, namespace)
        self.run_helper = namespace[NAME]

    @staticmethod
    def stats_from_summary(s, team, league, season):
        return {
            "team": {"id": team},
            "league": {"id": league, "season": season},
            "fixtures": {
                "played": {
                    "home": s.get("homePlayed"),
                    "away": s.get("awayPlayed"),
                    "total": s["played"],
                },
                "wins": {
                "home": s.get("homeWins"),
                "away": s.get("awayWins"),
                "total": s["wins"],
            },
                "draws": {"total": s["draws"]},
                "loses": {"total": s["losses"]},
            },
            "goals": {
                "for": {"total": {"total": s["goalsFor"]}},
                "against": {"total": {"total": s["goalsAgainst"]}},
            },
            "clean_sheet": {"total": s["cleanSheets"]},
            "failed_to_score": {"total": s["failedToScore"]},
        }

    def test_complete_ten_match_reconciliation(self):
        result = self.run_helper(profile(), 42, 2026)
        st = result["teamStats"]
        self.assertTrue(result["seasonStatsComplete"])
        self.assertEqual(st["fixtures"]["played"]["total"], 10)
        self.assertEqual(st["fixtures"]["wins"]["total"], 9)
        self.assertEqual(st["goals"]["for"]["total"]["total"], 15)
        self.assertEqual(st["goals"]["against"]["total"]["total"], 5)
        self.assertEqual(st["clean_sheet"]["total"], 7)
        self.assertEqual(st["failed_to_score"]["total"], 1)

    def test_home_away_coverage(self):
        st = self.run_helper(profile(), 42, 2026)["teamStats"]
        self.assertEqual(st["fixtures"]["played"]["home"], 5)
        self.assertEqual(st["fixtures"]["played"]["away"], 5)

    def test_incomplete_results_hide_advanced_totals(self):
        p = profile()
        p["past10"] = p["past10"][:1]
        result = self.run_helper(p, 42, 2026)
        self.assertFalse(result["seasonStatsComplete"])
        self.assertEqual(
            result["teamStats"]["fixtures"]["played"]["total"], 10
        )
        self.assertIsNone(
            result["teamStats"]["clean_sheet"]["total"]
        )

    def test_conflicting_result_fails_closed(self):
        p = profile()
        p["past10"][0]["awayScore"] = 4
        result = self.run_helper(p, 42, 2026)
        self.assertFalse(result["seasonStatsComplete"])

    def test_wrong_kickoff_fails_closed(self):
        p = profile()
        p["past10"][0]["date"] = "2026-11-03T18:30:00+02:00"
        result = self.run_helper(p, 42, 2026)
        self.assertFalse(result["seasonStatsComplete"])

    def test_duplicate_results_are_not_double_counted(self):
        p = profile()
        p["past10"].append(copy.deepcopy(p["past10"][0]))
        result = self.run_helper(p, 42, 2026)
        self.assertTrue(result["seasonStatsComplete"])
        self.assertEqual(result["teamStats"]["verifiedFixtureCount"], 10)

    def test_other_teams_unchanged(self):
        p = profile()
        self.assertIs(self.run_helper(p, 1012, 2026), p)

    def test_other_seasons_unchanged(self):
        p = profile()
        self.assertIs(self.run_helper(p, 42, 2025), p)

    def test_other_competitions_unchanged(self):
        p = profile()
        p["league"]["id"] = 2
        self.assertIs(self.run_helper(p, 42, 2026), p)

    def test_unverified_standings_source_unchanged(self):
        p = profile()
        p.pop("standingsSource")
        self.assertIs(self.run_helper(p, 42, 2026), p)

    def test_profile_data_not_mutated(self):
        p = profile()
        original = copy.deepcopy(p)
        result = self.run_helper(p, 42, 2026)
        self.assertEqual(p, original)
        self.assertEqual(len(result["players"]), 33)
        self.assertEqual(len(result["future"]), 10)

if __name__ == "__main__":
    unittest.main(verbosity=2)
