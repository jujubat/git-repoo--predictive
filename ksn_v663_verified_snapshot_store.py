"""Isolated V663 verified football snapshot storage.

No provider calls. No production database integration.
"""

import json
import sqlite3
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path

MAX_AGE_SECONDS = 21600
MAX_ROWS = 5000
CACHE_KEY = "fixtures:V663_STAGING:verified"


def validate_snapshot(payload, now=None):
    now = now or datetime.now(timezone.utc)

    if not isinstance(payload, dict):
        return None

    if payload.get("sport") != "football":
        return None

    if payload.get("stagingCacheOnly") is not True:
        return None

    rows = payload.get("matches")

    if not isinstance(rows, list) or len(rows) > MAX_ROWS:
        return None

    if payload.get("count") != len(rows):
        return None

    if any(
        not isinstance(row, dict)
        or row.get("sport") != "football"
        for row in rows
    ):
        return None

    try:
        created = datetime.fromisoformat(payload["ingestedAt"])
        if created.tzinfo is None:
            return None

        age = (now - created).total_seconds()

        if age < -300 or age > MAX_AGE_SECONDS:
            return None

    except (KeyError, TypeError, ValueError, OverflowError):
        return None

    return payload


def publish_snapshot(database_path, payload):
    verified = validate_snapshot(payload)

    if verified is None:
        raise ValueError("Invalid verified football snapshot")

    path = Path(database_path)

    if not path.parent.is_dir():
        raise ValueError("Snapshot parent directory missing")

    serialized = json.dumps(
        verified,
        ensure_ascii=False,
        allow_nan=False,
    )

    with closing(sqlite3.connect(str(path), timeout=5)) as conn:
        with conn:
            conn.execute(
                "CREATE TABLE IF NOT EXISTS snapshots "
                "(k TEXT PRIMARY KEY, payload TEXT NOT NULL)"
            )
            conn.execute(
                "INSERT INTO snapshots(k,payload) VALUES (?,?) "
                "ON CONFLICT(k) DO UPDATE SET payload=excluded.payload",
                (CACHE_KEY, serialized),
            )

    return len(verified["matches"])


def restore_snapshot(database_path, now=None):
    path = Path(database_path)

    if not path.is_file():
        return None

    try:
        with closing(
            sqlite3.connect(str(path), timeout=5)
        ) as conn:
            row = conn.execute(
                "SELECT payload FROM snapshots WHERE k=?",
                (CACHE_KEY,),
            ).fetchone()

        if row is None:
            return None

        payload = json.loads(row[0])

        return validate_snapshot(payload, now=now)

    except (
        sqlite3.Error,
        json.JSONDecodeError,
        TypeError,
        ValueError,
        OSError,
    ):
        return None
