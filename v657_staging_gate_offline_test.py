#!/usr/bin/env python3
"""Unit test the extracted actual staging middleware; no server or API needed."""
import ast
import asyncio
import os
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

source = Path('server.py').read_text(encoding='utf-8')
tree = ast.parse(source)
gates = [n for n in tree.body if isinstance(n, ast.AsyncFunctionDef) and n.name == 'ksn_staging_seo_test_gate']
assert len(gates) == 1, 'Staging gate not found uniquely'
fn = gates[0]
fn.decorator_list = []

class Response:
    def __init__(self, content='', status_code=200, media_type='', headers=None):
        self.status_code = status_code
        self.headers = headers or {}
        self.content = content

namespace = {
    'Request': object,
    'Response': Response,
    'os': os,
    '_ksn_staging_seo_test_mode': lambda: os.getenv('KSN_STAGING_SEO_TEST_MODE') == '1',
}
exec(compile(ast.Module(body=[fn], type_ignores=[]), '<staging gate source>', 'exec'), namespace)
gate = namespace['ksn_staging_seo_test_gate']
call_count = 0
async def call_next(req):
    global call_count
    call_count += 1
    return Response('ok', 200)

def req(path, token='', method='GET', params=None):
    return SimpleNamespace(url=SimpleNamespace(path=path), method=method,
        headers={'X-KSN-Staging-Token': token} if token else {}, query_params=params or {})

async def check():
    secret = 'S' * 48
    env = {'KSN_STAGING_SEO_TEST_MODE':'1','KSN_STAGING_P0_READ_ONLY':'1',
           'KSN_STAGING_TEST_TOKEN':secret, 'RENDER_SERVICE_NAME':'kasi-sports-news-staging'}
    cases = [
      ('unauthenticated', req('/finished-games'),503),
      ('wrong-token', req('/finished-games','wrong'),503),
      ('authorized-default', req('/finished-games',secret),200),
      ('authorized-pagination', req('/finished-games',secret,params={'limit':'3','offset':'0'}),200),
      ('legacy-provider-argument', req('/finished-games',secret,params={'hours':'24'}),503),
      ('unknown-argument', req('/finished-games',secret,params={'refresh':'1'}),503),
      ('unsafe-method', req('/finished-games',secret,method='POST'),503),
      ('homepage-blocked', req('/',secret),503),
      ('predictions-blocked', req('/ai-predictions',secret),503),
      ('tip-blocked', req('/tip-of-day',secret),503),
      ('health-allowed', req('/health'),200),
      ('robots-allowed', req('/robots.txt'),200),
    ]
    with patch.dict(os.environ,env,clear=True):
        for label,r,status in cases:
            got=await gate(r,call_next)
            assert got.status_code==status, (label,got.status_code,status)
            if label.startswith('authorized'):
                assert got.headers.get('X-Robots-Tag') == 'noindex, nofollow, noarchive'
                assert got.headers.get('Cache-Control') == 'no-store'
            print('PASS:',label)
        # Fail closed on flag, token or environment mismatch.
        for key,value in [('KSN_STAGING_P0_READ_ONLY','0'),('KSN_STAGING_TEST_TOKEN','short'),('RENDER_SERVICE_NAME','production')]:
            with patch.dict(os.environ,{key:value}):
                assert (await gate(req('/finished-games',secret),call_next)).status_code == 503, key
            print('PASS: fail closed',key)
        assert call_count == 4, f'unexpected call_next count: {call_count}'
    print('PASS: all 15 middleware tests; no network or database operations')

asyncio.run(check())
