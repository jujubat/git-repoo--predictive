"""V663 Step 523: opt-in isolated staging prediction snapshots.

No provider calls. No shared DB connections. No production code path.
Storage is local SQLite and is NOT durable on Render ephemeral filesystems.
"""
import json
from contextlib import closing
import os
import sqlite3
import time
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
STAGING_PATH = (BASE_DIR / "data" / "v663_staging_isolated" / "prediction_snapshots.sqlite3").resolve()


def _enabled():
    identity = " ".join(os.getenv(k, "") for k in ("RENDER_SERVICE_NAME", "RENDER_EXTERNAL_URL", "KSN_ENV")).lower()
    return (os.getenv("KSN_ENVIRONMENT", "").strip().lower() == "staging"
            and os.getenv("KSN_STAGING_FOOTBALL_ONLY", "0") == "1"
            and os.getenv("KSN_STAGING_PREDICTION_SNAPSHOTS", "0") == "1"
            and "staging" in identity)


def _key(key):
    return isinstance(key, str) and key.startswith("predictions:last_good:") and len(key) <= 160


def _connect():
    # Only the dedicated local staging path is ever opened.
    STAGING_PATH.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(str(STAGING_PATH), timeout=3)
    db.execute("CREATE TABLE IF NOT EXISTS snapshots (k TEXT PRIMARY KEY, payload TEXT NOT NULL, updated REAL NOT NULL)")
    return db


def read_prediction_snapshot(key):
    if not _enabled() or not _key(key):
        return None
    if os.getenv("KSN_STAGING_POSTGRES_SNAPSHOTS", "0") == "1":
        from ksn_v663_staging_pg_snapshots import read
        return read(key)
    try:
        with closing(_connect()) as db:
            row = db.execute("SELECT payload,updated FROM snapshots WHERE k=?", (key,)).fetchone()
        if not row:
            return None
        obj = json.loads(row[0])
        if not isinstance(obj, dict):
            return None
        obj["updated_at"] = row[1]
        return obj
    except (sqlite3.Error, OSError, ValueError, TypeError):
        return None


def write_prediction_snapshot(key, payload):
    if not _enabled() or not _key(key) or not isinstance(payload, dict):
        return None
    if os.getenv("KSN_STAGING_POSTGRES_SNAPSHOTS", "0") == "1":
        from ksn_v663_staging_pg_snapshots import write
        return write(key, payload)
    # Do not persist empty pools or unlimited/untrusted JSON.
    rows = payload.get("data", {}).get("predictions", []) if isinstance(payload.get("data"), dict) else []
    if not isinstance(rows, list) or not rows or len(rows) > 100:
        return None
    body = json.dumps(payload, ensure_ascii=False, allow_nan=False)
    if len(body.encode("utf-8")) > 1500000:
        return None
    with closing(_connect()) as db:
        db.execute("INSERT INTO snapshots(k,payload,updated) VALUES(?,?,?) ON CONFLICT(k) DO UPDATE SET payload=excluded.payload,updated=excluded.updated", (key,body,time.time()))
        db.commit()
    return True
