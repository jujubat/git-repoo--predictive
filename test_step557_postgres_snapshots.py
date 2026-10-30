import ast, pathlib, unittest
D=pathlib.Path(__file__).parent
S=(D/'server.py').read_text()
P=(D/'ksn_v663_staging_prediction_store.py').read_text()
A=(D/'ksn_v663_staging_pg_snapshots.py').read_text()
class StagingPersistenceTests(unittest.TestCase):
 def test_compile(self):
  for x in (S,P,A): ast.parse(x)
 def test_all_fixture_consumers(self):
     self.assertIn('_ksn579_read("fixtures:verified:football")', S)
     self.assertIn('_ksn579_write("fixtures:verified:football", saved)', S)
     self.assertIn('_v663_pg_write("fixtures:verified:football", _v663_published)', S)
     self.assertGreaterEqual(S.count('"fixtures:verified:football"'), 5)
 def test_opt_in(self):
  self.assertIn('KSN_STAGING_POSTGRES_SNAPSHOTS',A)
  self.assertIn('srv-db9agalg1s2s73fvpgeg',A)
 def test_identity(self):
  self.assertIn('SELECT current_database(), current_user',A)
  self.assertIn('kasilivescore_staging_db_user',A)
 def test_no_fallback_on_pg_failure(self):
  self.assertIn('return read(key)',P)
  self.assertIn('return write(key, payload)',P)
 def test_guard_rejects_disabled(self):
  import importlib.util, os
  spec=importlib.util.spec_from_file_location('pg',D/'ksn_v663_staging_pg_snapshots.py')
  mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
  with self.assertRaises(PermissionError): mod.connection()
if __name__=='__main__':unittest.main()
