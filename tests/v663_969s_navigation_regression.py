
import pathlib
import re
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
HTML = (ROOT / "index.html").read_text(encoding="utf-8-sig")

class NavigationTests(unittest.TestCase):
    def test_single_real_assignment(self):
        matches = re.findall(
            r"window\.__ksnV663CanonicalFootballTeam\s*"
            r"=(?!=)\s*\(id,name\)\s*=>",
            HTML
        )
        self.assertEqual(len(matches), 1)

    def test_type_check_is_not_an_assignment(self):
        self.assertEqual(
            HTML.count(
                "typeof window.__ksnV663CanonicalFootballTeam"
            ), 1
        )

    def test_numeric_routing(self):
        self.assertIn(
            "window.__ksnV663CanonicalFootballTeam("
            "Number(ref),name||'Team')",
            HTML
        )

    def test_public_reference_fallback(self):
        self.assertIn("go('/teams/'+clean(ref));", HTML)

    def test_my_kasi_resolved_identity(self):
        self.assertIn(
            "const ref=String(resolvedId);"
            "profile.href='/teams/'+encodeURIComponent(ref);",
            HTML
        )

    def test_old_my_kasi_link_removed(self):
        self.assertNotIn(
            "const ref=String(teamId(name));"
            "profile.href='/teams/'+encodeURIComponent(ref);",
            HTML
        )

    def test_single_team_page(self):
        self.assertEqual(HTML.count("async function teamPage("), 1)

    def test_sidebar_builder(self):
        self.assertEqual(HTML.count("function buildSidebar("), 1)

    def test_sidebar_selector(self):
        self.assertEqual(HTML.count("function setLeague("), 1)

    def test_match_navigation_preserved(self):
        self.assertIn(
            "window.openLiveMatchPage=window.openStatsPanel",
            HTML
        )

    def test_team_profile_source_preserved(self):
        self.assertIn(
            "get('/team/profile',{team:internalTeam})",
            HTML
        )

if __name__ == "__main__":
    unittest.main(verbosity=2)
