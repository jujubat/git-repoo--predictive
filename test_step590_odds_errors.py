import ast
import pathlib
import unittest
S = pathlib.Path(__file__).with_name("server.py").read_text(encoding="utf-8")
T = ast.parse(S)

class OddsErrorCategories(unittest.TestCase):
    def test_endpoint_unchanged(self):
        self.assertEqual(S.count('@app.post("/__ksn_v663/staging/odds/enrich")'), 1)
    def test_known_categories(self):
        for value in ("authentication_rejected", "provider_access_denied", "provider_rate_limited", "quota_exhausted", "invalid_provider_request", "provider_unavailable"):
            self.assertIn('"'+value+'"', S)
    def test_generic_provider_text_not_reflected(self):
        endpoint=next(n for n in T.body if isinstance(n,ast.AsyncFunctionDef) and n.name=='ksn579_staging_enrich_odds')
        code=ast.unparse(endpoint)
        self.assertIn("'reason': reason",code)
        self.assertNotIn('"reason": str(exc)',code)
        self.assertNotIn('detail=str(exc)',code)
    def test_limit_and_cooldown_retained(self):
        endpoint=next(n for n in T.body if isinstance(n,ast.AsyncFunctionDef) and n.name=='ksn579_staging_enrich_odds')
        code=ast.unparse(endpoint)
        self.assertIn('max_attempts=1',code)
        self.assertEqual(code.count('max_attempts=1'),2)
        self.assertIn('current - _KSN579_LAST_ATTEMPT < 900',code)
    def test_db_write_only_on_valid_odds(self):
        endpoint=next(n for n in T.body if isinstance(n,ast.AsyncFunctionDef) and n.name=='ksn579_staging_enrich_odds')
        code=ast.unparse(endpoint)
        self.assertLess(code.index('if not _valid_1x2(prices)'),code.index('_ksn579_write('))
    def test_compiles(self):
        compile(S,'server.py','exec')

if __name__=='__main__': unittest.main()
