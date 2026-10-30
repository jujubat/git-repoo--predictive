import os, pathlib, tempfile, unittest
from unittest.mock import patch
import ksn_v663_staging_prediction_store as store

class StagingSnapshotTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.previous = store.STAGING_PATH
        store.STAGING_PATH = pathlib.Path(self.tmp.name) / "snapshot.sqlite"
        self.env = patch.dict(os.environ, {"KSN_ENVIRONMENT":"staging","KSN_STAGING_FOOTBALL_ONLY":"1", "KSN_STAGING_PREDICTION_SNAPSHOTS":"1", "RENDER_SERVICE_NAME":"kasi-staging"})
        self.env.start()
    def tearDown(self):
        self.env.stop()
        store.STAGING_PATH = self.previous
        self.tmp.cleanup()
    def test_round_trip(self):
        key="predictions:last_good:ALL:upcoming"
        doc={"data":{"predictions":[{"fixtureId":11,"home":"Example"}]}}
        self.assertTrue(store.write_prediction_snapshot(key,doc))
        self.assertEqual(store.read_prediction_snapshot(key)["data"],doc["data"])
    def test_invalid_key_rejected(self):
        self.assertIsNone(store.write_prediction_snapshot("other:key", {"data":{"predictions":[{}]}}))
    def test_no_empty_snapshot(self):
        self.assertIsNone(store.write_prediction_snapshot("predictions:last_good:ALL:upcoming", {"data":{"predictions":[]}}))
    def test_production_fails_closed(self):
        with patch.dict(os.environ,{"KSN_ENVIRONMENT":"production"}):
            self.assertIsNone(store.write_prediction_snapshot("predictions:last_good:ALL:upcoming",{"data":{"predictions":[{}]}}))
    def test_opt_out_fails_closed(self):
        with patch.dict(os.environ,{"KSN_STAGING_PREDICTION_SNAPSHOTS":"0"}):
            self.assertIsNone(store.read_prediction_snapshot("predictions:last_good:ALL:upcoming"))
if __name__=="__main__": unittest.main()
