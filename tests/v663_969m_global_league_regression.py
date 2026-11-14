import ast
import pathlib
import types
import unittest
import warnings

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = (ROOT / "server.py").read_text(encoding="utf-8-sig")
NAME = "_ksn_v663_969m_verified_global_league"

with warnings.catch_warnings():
    warnings.simplefilter("ignore", SyntaxWarning)
    tree = ast.parse(SOURCE)

functions = [
    n for n in tree.body
    if isinstance(n, ast.FunctionDef) and n.name == NAME
]

assert len(functions) == 1
module = ast.Module(body=functions, type_ignores=[])
ast.fix_missing_locations(module)
compiled = compile(module, "<isolated resolver>", "exec")


class Cursor:
    def __init__(self, db):
        self.db = db

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def execute(self, sql, params=None):
        if params is not None:
            self.db.params = params

    def fetchone(self):
        return ("ksn_football_memberships_v530",)

    def fetchall(self):
        return [(x,) for x in self.db.ids]


class Database:
    def __init__(self):
        self.ids = []
        self.params = None
        self.closed = False

    def cursor(self):
        return Cursor(self)

    def close(self):
        self.closed = True


class GlobalResolverTests(unittest.TestCase):
    def setUp(self):
        self.db = Database()
        self.tables = {}

        class Logger:
            def warning(self, *args):
                pass

        self.env = {
            "DATABASE_URL": "synthetic-test-only",
            "psycopg2": types.SimpleNamespace(
                connect=lambda *a, **k: self.db
            ),
            "_ksn_v591_standings":
                lambda tid, lid, season: self.tables.get(lid, []),
            "log": Logger(),
        }

        exec(compiled, self.env)
        self.resolve = self.env[NAME]

    def test_fc_thun(self):
        self.db.ids = [207, 848, 209]
        self.tables[207] = [{"team": {"id": 1012}}]
        self.tables[848] = [{"team": {"id": 9000}}]
        self.assertEqual(self.resolve(1012, 2026), 207)
        self.assertTrue(self.db.closed)

    def test_arsenal(self):
        self.db.ids = [39]
        self.tables[39] = [{"team": {"id": 42}}]
        self.assertEqual(self.resolve(42, 2026), 39)

    def test_missing_membership(self):
        self.assertIsNone(self.resolve(1012, 2026))

    def test_wrong_team_in_standings(self):
        self.db.ids = [207]
        self.tables[207] = [{"team": {"id": 42}}]
        self.assertIsNone(self.resolve(1012, 2026))

    def test_ambiguous_memberships(self):
        self.db.ids = [207, 848]
        self.tables[207] = [{"team": {"id": 1012}}]
        self.tables[848] = [{"team": {"id": 1012}}]
        self.assertIsNone(self.resolve(1012, 2026))

    def test_invalid_identity(self):
        self.assertIsNone(self.resolve(0, 2026))
        self.assertIsNone(self.resolve(1012, 0))

    def test_no_database_configuration(self):
        self.env["DATABASE_URL"] = ""
        self.assertIsNone(self.resolve(1012, 2026))

    def test_exact_membership_parameters(self):
        self.db.ids = [207]
        self.tables[207] = [{"team": {"id": 1012}}]
        self.resolve(1012, 2026)
        self.assertEqual(
            self.db.params,
            ("api-football", 1012, 2026)
        )

    def test_only_one_integration(self):
        self.assertEqual(
            SOURCE.count(
                "league_id = _ksn_v663_969m_verified_global_league("
            ),
            1
        )

    def test_original_arsenal_helpers_preserved(self):
        self.assertIn(
            "def _ksn_v663_968fx_season_stats(",
            SOURCE
        )
        self.assertIn(
            "def _ksn_v663_968gc_intel_summary(",
            SOURCE
        )

    def test_voting_guard_preserved(self):
        self.assertIn(
            "Supporter voting is disabled",
            SOURCE
        )
        self.assertIn(
            "if not _mk906_enabled():",
            SOURCE
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)
