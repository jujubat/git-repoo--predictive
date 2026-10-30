"""V663 opt-in, staging-only PostgreSQL snapshots. No fallback storage."""
import json
import os
import time
from contextlib import closing

EXPECTED_DB = "kasilivescore_staging_db"
EXPECTED_USER = "kasilivescore_staging_db_user"
EXPECTED_SERVICE = "srv-db9agalg1s2s73fvpgeg"
TABLE = "ksn_v663_staging_persistent_snapshots"
FIXTURE_KEY = "fixtures:verified:football"


def enabled():
    return (os.getenv("KSN_ENVIRONMENT") == "staging"
            and os.getenv("KSN_STAGING_FOOTBALL_ONLY") == "1"
            and os.getenv("KSN_STAGING_POSTGRES_SNAPSHOTS") == "1"
            and os.getenv("RENDER_SERVICE_ID") == EXPECTED_SERVICE
            and "staging" in os.getenv("RENDER_SERVICE_NAME", "").lower())


def allowed_key(key):
    return key == FIXTURE_KEY or (isinstance(key, str)
        and key.startswith("predictions:last_good:") and len(key) <= 160)


def connection():
    if not enabled():
        raise PermissionError("Staging PG snapshots disabled")
    import psycopg2
    url = os.getenv("DATABASE_URL", "")
    if not url:
        raise RuntimeError("Staging DATABASE_URL missing")
    db = psycopg2.connect(url, connect_timeout=5)
    try:
        db.set_session(readonly=True, autocommit=False)
        with db.cursor() as cur:
            cur.execute("SET LOCAL statement_timeout = '5000ms'")
            cur.execute("SELECT current_database(), current_user")
            name, user = cur.fetchone()
        if (name, user) != (EXPECTED_DB, EXPECTED_USER):
            raise PermissionError("Staging database identity mismatch")
        db.rollback()
        return db
    except BaseException:
        db.close()
        raise


def read(key):
    if not allowed_key(key):
        raise ValueError("Invalid snapshot key")
    with closing(connection()) as db:
        db.set_session(readonly=True, autocommit=False)
        try:
            with db.cursor() as cur:
                cur.execute("SET LOCAL statement_timeout = '5000ms'")
                cur.execute("SELECT payload, updated FROM " + TABLE + " WHERE k=%s", (key,))
                row = cur.fetchone()
        except Exception as exc:
            db.rollback()
            if getattr(exc, "pgcode", None) == "42P01":
                return None  # table not yet initialized by the first successful write
            raise
        db.rollback()
    if not row:
        return None
    payload = json.loads(row[0]) if isinstance(row[0], str) else row[0]
    return payload if isinstance(payload, dict) else None


def write(key, payload):
    if not allowed_key(key) or not isinstance(payload, dict):
        raise ValueError("Invalid snapshot payload or key")
    if key != FIXTURE_KEY:
        data = payload.get("data")
        if not isinstance(data, dict) or not isinstance(data.get("predictions"), list) or not data["predictions"] or len(data["predictions"]) > 100:
            raise ValueError("No valid predictions to persist")
    blob = json.dumps(payload, ensure_ascii=False, allow_nan=False)
    if len(blob.encode("utf-8")) > 15000000:
        raise ValueError("Snapshot too large")
    with closing(connection()) as db:
        db.set_session(readonly=False, autocommit=False)
        try:
            with db.cursor() as cur:
                cur.execute("SET LOCAL statement_timeout = '5000ms'")
                cur.execute("CREATE TABLE IF NOT EXISTS " + TABLE + " (k TEXT PRIMARY KEY, payload TEXT NOT NULL, updated DOUBLE PRECISION NOT NULL)")
                cur.execute("INSERT INTO " + TABLE + " (k,payload,updated) VALUES (%s,%s,%s) ON CONFLICT (k) DO UPDATE SET payload=EXCLUDED.payload,updated=EXCLUDED.updated", (key, blob, time.time()))
            db.commit()
        except BaseException:
            db.rollback()
            raise
    return True
