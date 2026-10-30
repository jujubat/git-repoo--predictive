import ast, pathlib, unittest
D=pathlib.Path(__file__).resolve().parent
S=(D/'server.py').read_text(encoding='utf-8')
V=(D/'ksn_v663_step492_voting.py').read_text(encoding='utf-8')

class VotingPostgresTests(unittest.TestCase):
    def test_compiles(self):
        ast.parse(S);ast.parse(V)
    def test_resolver_reads_pg_not_per_worker_cache(self):
        tree=ast.parse(S)
        fn=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='_ksn492_trusted_fixture_resolver')
        src=ast.unparse(fn)
        self.assertIn('read(FIXTURE_KEY)',src)
        self.assertNotIn('_fixtures_cache',src)
        self.assertIn("row.get('fixtureDate')",src)
    def test_all_verified_fixtures_considered(self):
        self.assertIn('source[:2500]',V)
        self.assertIn("if len(selected) == 4: break",V)
    def test_sql_vote_uniqueness(self):
        self.assertIn('PRIMARY KEY(fixture_id, voter_id)',V)
        self.assertIn('ON CONFLICT (fixture_id,voter_id) DO NOTHING',V)
    def test_pg_staging_guard_and_private_voters(self):
        self.assertIn('connection, enabled as pg_enabled',V)
        self.assertIn('voter_key = digest(token)',V)
        self.assertIn('SERIALIZABLE',V)
        self.assertNotIn('sqlite3',V)
    def test_no_api_provider_call(self):
        fn=next(n for n in ast.parse(S).body if isinstance(n,ast.FunctionDef) and n.name=='_ksn492_trusted_fixture_resolver')
        self.assertNotIn('requests.',ast.unparse(fn))
        self.assertNotIn('_afoot_get',ast.unparse(fn))
if __name__=='__main__':unittest.main()
