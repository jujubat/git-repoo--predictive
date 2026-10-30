import ast, pathlib, unittest
src=pathlib.Path(__file__).with_name('server.py').read_text(encoding='utf-8')
tree=ast.parse(src)
route=next(x for x in tree.body if isinstance(x,ast.AsyncFunctionDef) and x.name=='ksn579_staging_enrich_odds')
code=ast.unparse(route)
class TestStep579(unittest.TestCase):
 def test_parse(self): self.assertTrue(tree)
 def test_auth_and_optin(self):
  self.assertIn('_ksn499_diagnostic_authorized(request)',code)
  self.assertIn('KSN_STAGING_ODDS_ENRICHMENT',code)
 def test_strict_quota(self):
  self.assertEqual(code.count('_oddspapi_get('),2)
  self.assertEqual(code.count('max_attempts=1'),2)
 def test_safety_guard(self):
  self.assertIn('_KSN579_AUTHORIZED_ODDS_CONTEXT.reset(token)',code)
  self.assertIn('_KSN579_ENRICH_LOCK',code)
  self.assertIn('900',code)
 def test_persistent_write_only_on_valid_odds(self):
  self.assertLess(code.index('if not _valid_1x2(prices)'),code.index('_ksn579_write('))
  self.assertIn('fixtures:verified:football',code)
 def test_no_production_change(self):
  self.assertIn('if _ksn_v663_staging_football_only()',src)
  self.assertIn('OddsPAPI external requests disabled in staging SEO test mode',src)
 def test_staging_middleware(self):
  self.assertIn('request.url.path == "/__ksn_v663/staging/odds/enrich"',src)
if __name__=='__main__':unittest.main()
