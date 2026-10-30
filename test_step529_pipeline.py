import ast
import pathlib
import re
import unittest

SOURCE = (pathlib.Path(__file__).parent / 'server.py').read_text(encoding='utf8')
TREE = ast.parse(SOURCE)

class Step529Checks(unittest.TestCase):
    def test_conf_league_provider_id_in_uefa_tier(self):
        self.assertIn('848: 7, 203: 8', SOURCE)
        self.assertIn('"uefa conference league": 7', SOURCE)

    def test_visitor_and_remaining_tiers_are_after_turkey(self):
        fn = next(node for node in TREE.body if isinstance(node, ast.FunctionDef) and node.name == '_ksn_league_priority_bucket')
        ns = {'re':re, '_KSN_COUNTRY_NAMES':{}}
        exec(compile(ast.Module(body=[fn], type_ignores=[]), '<priority>', 'exec'), ns)
        bucket=ns['_ksn_league_priority_bucket']
        self.assertEqual(bucket({'_leagueId':39}),0)
        self.assertEqual(bucket({'_leagueId':2}),5)
        self.assertEqual(bucket({'_leagueId':848}),7)
        self.assertEqual(bucket({'_leagueId':203}),8)
        self.assertEqual(bucket({'leagueName':'Premiership','country':'South Africa'}, 'South Africa'),9)
        self.assertEqual(bucket({'leagueName':'Other Cup','country':'Brazil'}, 'South Africa'),10)

    def test_generation_uses_verified_consumer_not_provider(self):
        route=next(node for node in TREE.body if isinstance(node, ast.AsyncFunctionDef) and node.name == 'ksn529_staging_generate_predictions')
        names={n.id for n in ast.walk(route) if isinstance(n,ast.Name)}
        self.assertIn('read_verified_fixtures',names)
        self.assertIn('_prediction',names)
        self.assertNotIn('_afoot_get',names)
        self.assertNotIn('fixtures_with_odds',names)
        self.assertNotIn('v141_learning',names)
        self.assertNotIn('_save_prediction_to_db',names)
        self.assertIn('_dashboard_snapshot_put',names)

    def test_authentication_and_flags(self):
        self.assertIn('_ksn499_diagnostic_authorized(request)',SOURCE)
        self.assertIn('KSN_STAGING_MODEL_GENERATION',SOURCE)
        self.assertIn('KSN_STAGING_PREDICTION_SNAPSHOTS',SOURCE)
        self.assertIn('"/__ksn_v663/staging/predictions/generate"',SOURCE)

if __name__=='__main__':unittest.main()
