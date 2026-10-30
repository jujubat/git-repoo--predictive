import ast
import pathlib
import unittest

SOURCE = pathlib.Path(__file__).with_name("server.py").read_text(encoding="utf-8")
TREE = ast.parse(SOURCE)

class IdentityGuardTests(unittest.TestCase):
    def test_only_get_and_token_gate(self):
        self.assertIn('request.url.path == "/__ksn_v663/staging/database/identity"', SOURCE)
        self.assertIn('and request.method == "GET"', SOURCE)
        self.assertIn("if _ksn499_diagnostic_authorized(request):", SOURCE)
    def test_route_exists_once(self):
        self.assertEqual(SOURCE.count('@app.get("/__ksn_v663/staging/database/identity")'),1)
    def test_no_provider_calls_or_database_writes(self):
        func=next(n for n in TREE.body if isinstance(n,(ast.FunctionDef,ast.AsyncFunctionDef)) and n.name=="ksn551_staging_database_identity")
        calls=[n.func.attr for n in ast.walk(func) if isinstance(n,ast.Call) and isinstance(n.func,ast.Attribute)]
        self.assertNotIn("commit",calls)
        self.assertIn("rollback",calls)
        self.assertIn("close",calls)
        self.assertNotIn("_afoot_get",ast.unparse(func))
        self.assertIn("readonly=True",ast.unparse(func))
        self.assertIn("kasilivescore_staging_db",ast.unparse(func))
    def test_strict_render_service_identity(self):
        func=next(n for n in TREE.body if isinstance(n,ast.FunctionDef) and n.name=="ksn551_staging_database_identity")
        self.assertIn("srv-db9agalg1s2s73fvpgeg",ast.unparse(func))
    def test_production_snapshot_functions_untouched(self):
        self.assertIn("def _dashboard_snapshot_put(key,payload):",SOURCE)

if __name__ == "__main__":
    unittest.main()
