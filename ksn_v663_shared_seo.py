"""V663 Trial 07: optional shared PostgreSQL quota + fixture snapshot storage.

Opt in via KSN_SEO_SHARED_DATABASE_URL. Separate schema initialization is required.
Do not configure this with the production database on staging.
Public readers use a bounded process-local memo; no provider requests are made here.
"""
import json
import os
import threading
import time
from datetime import datetime, timezone

_SHARED_LOCK = threading.Lock()
_MEMO = {'until': 0.0, 'payload': None}
MAX_CALLS = 30000
MAX_SNAPSHOT_BYTES = 2_000_000


def _connection(database_url=None):
    url = database_url if database_url is not None else os.getenv('KSN_SEO_SHARED_DATABASE_URL', '').strip()
    if not url:
        raise RuntimeError('KSN_SEO_SHARED_DATABASE_URL is not configured')
    import psycopg2
    from psycopg2 import extensions
    connection = psycopg2.connect(url, connect_timeout=3, options='-c statement_timeout=2500')
    connection.autocommit = False
    return connection


def initialize(database_url=None):
    """Explicit one-time operator setup; NEVER called from an HTTP request."""
    conn = _connection(database_url)
    try:
        with conn.cursor() as cur:
            cur.execute('''CREATE TABLE IF NOT EXISTS ksn_seo_provider_budget (
                id SMALLINT PRIMARY KEY CHECK (id=1), used INTEGER NOT NULL DEFAULT 0,
                ceiling INTEGER NOT NULL DEFAULT 30000, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                CHECK (used>=0 AND ceiling BETWEEN 1 AND 30000 AND used<=ceiling)
            )''')
            cur.execute('''INSERT INTO ksn_seo_provider_budget(id, used, ceiling)
                           VALUES (1,0,30000) ON CONFLICT (id) DO NOTHING''')
            cur.execute('''CREATE TABLE IF NOT EXISTS ksn_seo_fixture_snapshot (
                id SMALLINT PRIMARY KEY CHECK(id=1), payload JSONB NOT NULL,
                generated_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )''')
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def assert_budget(used, ceiling, requested):
    if any(type(v) is not int for v in (used, ceiling, requested)):
        raise ValueError('quota values must be integers')
    if not 0 <= used <= ceiling <= MAX_CALLS or not 1 <= requested <= 30 or used + requested > ceiling:
        raise ValueError('Shared provider quota exceeded or invalid')


def reserve_calls(requested, database_url=None):
    """Reserve planned calls exactly once under PG row lock; failures consume reservation."""
    conn = _connection(database_url)
    try:
        with conn.cursor() as cur:
            cur.execute('SELECT used, ceiling FROM ksn_seo_provider_budget WHERE id=1 FOR UPDATE')
            row = cur.fetchone()
            if row is None:
                raise RuntimeError('Shared SEO budget not initialized')
            assert_budget(int(row[0]), int(row[1]), requested)
            cur.execute('''UPDATE ksn_seo_provider_budget SET used=used+%s,
                           updated_at=NOW() WHERE id=1 RETURNING used''', (requested,))
            total = int(cur.fetchone()[0])
        conn.commit()
        return total
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def publish_snapshot(payload, database_url=None):
    """Accept only a bounded, strictly shaped producer snapshot."""
    if not isinstance(payload, dict) or payload.get('source') != 'api-football' or not isinstance(payload.get('matches'), list):
        raise ValueError('Invalid provider snapshot')
    generated = datetime.fromisoformat(payload['generated_utc'].replace('Z', '+00:00'))
    if generated.tzinfo is None or abs((datetime.now(timezone.utc) - generated).total_seconds()) > 120:
        raise ValueError('Snapshot generation time invalid')
    encoded = json.dumps(payload, separators=(',', ':'), ensure_ascii=False)
    if len(encoded.encode('utf-8')) > MAX_SNAPSHOT_BYTES:
        raise ValueError('Snapshot exceeds shared storage limit')
    conn = _connection(database_url)
    try:
        with conn.cursor() as cur:
            cur.execute('''INSERT INTO ksn_seo_fixture_snapshot(id, payload, generated_at)
                           VALUES (1, %s::jsonb, %s)
                           ON CONFLICT (id) DO UPDATE SET payload=EXCLUDED.payload,
                           generated_at=EXCLUDED.generated_at, updated_at=NOW()
                           WHERE ksn_seo_fixture_snapshot.generated_at <= EXCLUDED.generated_at''',
                        (encoded, generated))
        conn.commit()
        with _SHARED_LOCK:
            _MEMO['until'] = 0.0
            _MEMO['payload'] = None
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def get_snapshot(database_url=None, now=None, memo_seconds=60):
    """Bounded, read-only lookup. Database failures yield no data (fail closed).

    HTTP callers must not invoke this in tight loops; use an async background refresh
    in production if timing measurements show database reads impact latency.
    """
    # Explicit database URLs used for tests must never share the process memo.
    use_memo = database_url is None
    clock = time.monotonic()
    if use_memo:
        with _SHARED_LOCK:
            if clock < _MEMO['until']:
                return _MEMO['payload']
    payload = None
    try:
        conn = _connection(database_url)
        try:
            with conn.cursor() as cur:
                cur.execute('SELECT payload FROM ksn_seo_fixture_snapshot WHERE id=1')
                row = cur.fetchone()
                if row:
                    payload = row[0]
                    if isinstance(payload, str):
                        payload = json.loads(payload)
            conn.rollback()
        finally:
            conn.close()
    except Exception:
        payload = None
    if use_memo:
        with _SHARED_LOCK:
            _MEMO['payload'] = payload
            _MEMO['until'] = clock + max(0, min(int(memo_seconds), 60))
    return payload


def get_usage(database_url=None):
    conn = _connection(database_url)
    try:
        with conn.cursor() as cur:
            cur.execute('SELECT used, ceiling FROM ksn_seo_provider_budget WHERE id=1')
            row = cur.fetchone()
        conn.rollback()
        return {'used': int(row[0]), 'ceiling': int(row[1])} if row else None
    finally:
        conn.close()
