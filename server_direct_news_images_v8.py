import threading
import html
# -*- coding: utf-8 -*-
"""
FOOTBALL SERVER — KasiScore Predictive Dashboard
v142 — Live Prediction / Odds Integration

Secure local proxy between the KasiScore dashboard and API-Football.
"""

import asyncio
import contextlib
import json
import logging
import math
import os
import re
from difflib import SequenceMatcher
import sqlite3
import hashlib
import hmac
import base64
import secrets
import time
import uuid
import smtplib
from email.message import EmailMessage
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Optional
from html import escape, unescape

import httpx
from cachetools import TTLCache
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Header, Response, Request
from fastapi.responses import HTMLResponse, FileResponse, Response, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# CONFIG
# ---------------------------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent
INDEX_HTML = BASE_DIR / "index.html"
load_dotenv(BASE_DIR / ".env", override=True)

API_KEY = os.getenv("AFOOT_API_KEY", "")
API_BASE = "https://v3.football.api-sports.io"

# Optional odds fallback. This is The Odds API v4 (the response shape supplied
# with this release matches its /v4/sports/{sport}/odds endpoint). It is only
# used when the primary API-Football odds request fails or returns no usable
# bookmaker 1X2 odds.  Fixture loading itself is NOT subject to this timeout.
ODDS_API_KEY = os.getenv("ODDS_API_KEY", "")
ODDS_API_BASE = os.getenv("ODDS_API_BASE", "https://api.the-odds-api.com/v4")
ODDS_API_TIMEOUT = float(os.getenv("ODDS_API_TIMEOUT", "5"))
ODDS_API_REGIONS = os.getenv("ODDS_API_REGIONS", "eu")
ODDS_API_MARKETS = os.getenv("ODDS_API_MARKETS", "h2h")
ODDS_API_ENABLED = os.getenv("ODDS_API_ENABLED", "1").lower() not in {"0", "false", "no", "off"}
TIMEZONE = os.getenv("TIMEZONE", "Africa/Johannesburg")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
PORT = int(os.getenv("PORT", "8000"))

AUTH_DB = Path(os.getenv("AUTH_DB_PATH", str(BASE_DIR / "kasiscore_users.db")))
AUTH_SECRET = os.getenv("AUTH_SECRET", "")
if not AUTH_SECRET:
    AUTH_SECRET = secrets.token_hex(32)

# ---------------------------------------------------------------------------
# AUTH DATABASE — Turso (free cloud SQLite) or local SQLite fallback
# ---------------------------------------------------------------------------
# On Render free tier the local filesystem is wiped on every restart, which
# deletes all users and causes instant logout. Solution: use Turso, a free
# cloud-hosted SQLite that persists forever.
#
# Setup (5 minutes, free):
#   1. Go to https://turso.tech and sign up (free tier: 500MB, unlimited DBs)
#   2. Install CLI:  curl -sSfL https://get.tur.so/install.sh | bash
#   3. turso auth login
#   4. turso db create kasiscore
#   5. turso db show kasiscore           # copy the "URL" value
#   6. turso db tokens create kasiscore  # copy the token
#   7. In Render dashboard → Environment, add:
#        TURSO_DB_URL   = libsql://kasiscore-<yourname>.turso.io
#        TURSO_DB_TOKEN = <the token from step 6>
#        AUTH_SECRET    = <run: python3 -c "import secrets;print(secrets.token_hex(32))">
#        ADMIN_EMAIL    = jbatuma@yahoo.com
#
# Without TURSO_DB_URL set, the server falls back to local SQLite (fine for
# local development, NOT for Render free tier).
# ---------------------------------------------------------------------------

TURSO_DB_URL   = os.getenv("TURSO_DB_URL", "").strip()
TURSO_DB_TOKEN = os.getenv("TURSO_DB_TOKEN", "").strip()

class _AuthCursor:
    """Small DB-API compatibility wrapper for sqlite3 and libsql-client results."""
    def __init__(self, result=None, sqlite_cursor=None):
        self._result = result
        self._sqlite_cursor = sqlite_cursor
        if sqlite_cursor is not None:
            self.rowcount = getattr(sqlite_cursor, "rowcount", -1)
            self.lastrowid = getattr(sqlite_cursor, "lastrowid", None)
        else:
            self.rowcount = int(getattr(result, "rows_affected", 0) or 0)
            self.lastrowid = getattr(result, "last_insert_rowid", None)

    def fetchone(self):
        if self._sqlite_cursor is not None:
            return self._sqlite_cursor.fetchone()
        rows = getattr(self._result, "rows", None) or []
        return tuple(rows[0]) if rows else None

    def fetchall(self):
        if self._sqlite_cursor is not None:
            return self._sqlite_cursor.fetchall()
        return [tuple(row) for row in (getattr(self._result, "rows", None) or [])]


class _AuthConnection:
    """Expose the subset of sqlite3.Connection used by Kasi Sports News auth.

    libsql-client is not a Python DB-API sqlite3 replacement.  This adapter keeps
    the existing auth code unchanged while translating execute/results to the
    synchronous libSQL client API.
    """
    def __init__(self, sqlite_conn=None, libsql_client_obj=None):
        self._sqlite = sqlite_conn
        self._libsql = libsql_client_obj
        self.total_changes = 0

    def execute(self, sql, params=()):
        if self._sqlite is not None:
            cur = self._sqlite.execute(sql, params)
            self.total_changes = self._sqlite.total_changes
            return _AuthCursor(sqlite_cursor=cur)
        try:
            result = self._libsql.execute(sql, list(params or ()))
        except Exception as exc:
            # Keep existing duplicate-account handling compatible with sqlite3.
            msg = str(exc).lower()
            if "unique" in msg or "constraint" in msg:
                raise sqlite3.IntegrityError(str(exc)) from exc
            raise
        affected = int(getattr(result, "rows_affected", 0) or 0)
        self.total_changes += affected
        return _AuthCursor(result=result)

    def commit(self):
        # Remote libSQL execute() statements are committed by the client.
        if self._sqlite is not None:
            self._sqlite.commit()

    def close(self):
        if self._sqlite is not None:
            self._sqlite.close()
        elif self._libsql is not None:
            self._libsql.close()


def _auth_db():
    """Return a local SQLite auth connection. Always available, no external deps."""
    AUTH_DB.parent.mkdir(parents=True, exist_ok=True)
    raw = sqlite3.connect(str(AUTH_DB), timeout=20)
    raw.row_factory = sqlite3.Row
    raw.execute("PRAGMA journal_mode=WAL")
    raw.execute("PRAGMA synchronous=NORMAL")
    raw.execute("PRAGMA busy_timeout=20000")
    c = _AuthConnection(sqlite_conn=raw)
    c.execute("""CREATE TABLE IF NOT EXISTS users(
      id INTEGER PRIMARY KEY AUTOINCREMENT,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,
      username TEXT UNIQUE, phone TEXT UNIQUE,
      pro INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)""")
    for col,typ in [("reset_token","TEXT"),("reset_expires","REAL"),("username","TEXT"),("phone","TEXT"),("role","TEXT DEFAULT 'user'"),("status","TEXT DEFAULT 'active'"),("last_login","TEXT")]:
        try:
            c.execute(f"ALTER TABLE users ADD COLUMN {col} {typ}")
        except Exception:
            pass
    c.commit()
    return c
def _pw(password,salt=None):
    salt=salt or secrets.token_hex(16)
    dk=hashlib.pbkdf2_hmac("sha256",password.encode(),bytes.fromhex(salt),180000).hex()
    return salt+"$"+dk
def _token(user_id):
    raw=f"{user_id}.{int(time.time())}"
    sig=hmac.new(AUTH_SECRET.encode(),raw.encode(),hashlib.sha256).digest()
    return base64.urlsafe_b64encode((raw+"."+base64.urlsafe_b64encode(sig).decode()).encode()).decode()
def _user_from_token(auth):
    if not auth or not auth.lower().startswith("bearer "): return None
    try:
        raw=base64.urlsafe_b64decode(auth.split(None,1)[1]).decode()
        uid,ts,sig=raw.split(".",2); payload=f"{uid}.{ts}"
        expected=base64.urlsafe_b64encode(hmac.new(AUTH_SECRET.encode(),payload.encode(),hashlib.sha256).digest()).decode()
        if not hmac.compare_digest(sig,expected) or time.time()-int(ts)>60*60*24*30:return None
        c=_auth_db(); row=c.execute("SELECT id,email,pro,COALESCE(role,'user'),COALESCE(status,'active') FROM users WHERE id=?",(int(uid),)).fetchone(); c.close()
        if not row or row[4]!="active": return None
        return row
    except Exception:return None

# ---------------------------------------------------------------------------
# PUSH NOTIFICATION STORE
# ---------------------------------------------------------------------------
PUSH_DB = BASE_DIR / "kasiscore_push.db"
PAYFAST_PASSPHRASE = os.getenv("PAYFAST_PASSPHRASE", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
PAYMENT_ADMIN_EMAIL = os.getenv("PAYMENT_ADMIN_EMAIL", "")

def _push_db():
    c = sqlite3.connect(PUSH_DB)
    c.execute("""CREATE TABLE IF NOT EXISTS push_subscriptions(
        id TEXT PRIMARY KEY,
        user_id INTEGER,
        endpoint TEXT NOT NULL,
        p256dh TEXT NOT NULL,
        auth_key TEXT NOT NULL,
        user_agent TEXT,
        created_at TEXT NOT NULL,
        UNIQUE(endpoint))""")
    c.execute("""CREATE TABLE IF NOT EXISTS push_log(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subscription_id TEXT,
        title TEXT,
        sent_at TEXT,
        status TEXT)""")
    c.commit(); return c

def _store_push_subscription(user_id, sub_data: dict, ua: str = "") -> str:
    sub_id = str(uuid.uuid4())
    c = _push_db()
    try:
        c.execute("""INSERT OR REPLACE INTO push_subscriptions
            (id, user_id, endpoint, p256dh, auth_key, user_agent, created_at)
            VALUES (?,?,?,?,?,?,?)""",
            (sub_id, user_id,
             sub_data.get("endpoint",""),
             sub_data.get("keys",{}).get("p256dh",""),
             sub_data.get("keys",{}).get("auth",""),
             ua, datetime.now(timezone.utc).isoformat()))
        c.commit()
    finally: c.close()
    return sub_id

def _get_push_subscriptions(user_id=None) -> list:
    c = _push_db()
    if user_id:
        rows = c.execute("SELECT id,endpoint,p256dh,auth_key FROM push_subscriptions WHERE user_id=?", (user_id,)).fetchall()
    else:
        rows = c.execute("SELECT id,endpoint,p256dh,auth_key FROM push_subscriptions").fetchall()
    c.close()
    return [{"id": r[0], "endpoint": r[1], "p256dh": r[2], "auth": r[3]} for r in rows]

def _delete_push_subscription(endpoint: str):
    c = _push_db(); c.execute("DELETE FROM push_subscriptions WHERE endpoint=?", (endpoint,)); c.commit(); c.close()

def _log_push(sub_id: str, title: str, status: str):
    c = _push_db()
    c.execute("INSERT INTO push_log(subscription_id,title,sent_at,status) VALUES(?,?,?,?)",
              (sub_id, title, datetime.now(timezone.utc).isoformat(), status))
    c.commit(); c.close()

async def _send_web_push(sub: dict, title: str, body: str, url: str = "/") -> bool:
    """Send a Web Push notification via pywebpush (install: pip install pywebpush)."""
    try:
        from pywebpush import webpush, WebPushException  # type: ignore
        vapid_private = os.getenv("VAPID_PRIVATE_KEY", "")
        vapid_email = os.getenv("VAPID_EMAIL", PAYMENT_ADMIN_EMAIL or "admin@kasiscore.com")
        if not vapid_private:
            log.warning("VAPID_PRIVATE_KEY not set — push not sent. Run: python -m pywebpush --gen-keys")
            return False
        payload = json.dumps({"title": title, "body": body, "url": url})
        webpush(
            subscription_info={"endpoint": sub["endpoint"], "keys": {"p256dh": sub["p256dh"], "auth": sub["auth"]}},
            data=payload,
            vapid_private_key=vapid_private,
            vapid_claims={"sub": f"mailto:{vapid_email}"}
        )
        _log_push(sub["id"], title, "sent"); return True
    except Exception as e:
        log.warning(f"Push send failed: {e}")
        _log_push(sub.get("id","?"), title, f"error:{e}")
        if "410" in str(e) or "404" in str(e):
            _delete_push_subscription(sub.get("endpoint",""))
        return False

# ---------------------------------------------------------------------------
# PER-IP / PER-USER RATE LIMITING
# ---------------------------------------------------------------------------
_rl_buckets: dict = {}

def _rate_limit_user(key: str, limit: int = 60, window: int = 60) -> bool:
    """Returns True if allowed, False if blocked."""
    now = time.time()
    bucket = _rl_buckets.setdefault(key, [])
    _rl_buckets[key] = [t for t in bucket if now - t < window]
    if len(_rl_buckets[key]) >= limit:
        return False
    _rl_buckets[key].append(now)
    return True

def _client_key(request: Request, namespace: str, identity: str = "") -> str:
    forwarded=request.headers.get("x-forwarded-for","")
    ip=forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")
    return f"{namespace}:{ip}:{(identity or '').strip().lower()}"

def _require_auth_rate(request: Request, namespace: str, identity: str = "", limit: int = 10, window: int = 300):
    if not _rate_limit_user(_client_key(request,namespace,identity),limit=limit,window=window):
        raise HTTPException(status_code=429,detail="Too many attempts. Please try again later.")


logging.basicConfig(
    level=getattr(logging, LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("football_server")

if not API_KEY:
    log.warning("AFOOT_API_KEY not set in .env")

LEAGUE_IDS = {
    "Premier League": 39,
    "La Liga": 140,
    "Serie A": 135,
    "Bundesliga": 78,
    "Ligue 1": 61,
    "Champions League": 2,
    "Europa League": 3,
    "PSL South Africa": 288,
    "MLS": 253,
    "Eredivisie": 88,
    "Primeira Liga": 94,
    "Brazilian Serie A": 71,
    "Argentine Primera": 128,
    "J1 League Japan": 98,
    "Scottish Premiership": 179,
    "Turkish Super Lig": 203,
    "Norway Eliteserien": 103,
    "Denmark Superliga": 119,
    "Cyprus First Division": 262,
    "Belgian Pro League": 144,
    "FA Cup": 45,
    "EFL Cup": 48,
    "Copa del Rey": 143,
    "Coppa Italia": 137,
    "DFB-Pokal": 81,
    "Coupe de France": 66,
    "Championship": 40, "LaLiga Hypermotion": 141, "2. Bundesliga": 79, "Serie B": 136, "Ligue 2": 62,
    "Super League Greece": 197, "Austrian Bundesliga": 218, "Swiss Super League": 207, "Ekstraklasa": 106,
    "Egyptian Premier League": 233, "Botola Pro": 200, "Algerian Ligue 1": 186, "Tunisian Ligue 1": 202,
    "Nigeria Premier Football League": 332, "Ghana Premier League": 570, "UAE Pro League": 301,
    "Qatar Stars League": 305, "Indian Super League": 323, "Chinese Super League": 169, "Thai League 1": 296,
    "Liga 1 Indonesia": 274, "Primera A Colombia": 239, "Primera División Chile": 265, "Liga Pro Ecuador": 242,
    "Liga 1 Peru": 281, "Primera División Uruguay": 268, "Primera División Costa Rica": 162,
    "Liga Nacional Guatemala": 165, "K League 1": 292, "J1 League": 98, "A-League": 188,
}

def _current_season() -> int:
    """Return the current football season start year.

    Football seasons straddle two calendar years (Aug–May).
    Before 1 August we are still in the season that started the *previous*
    calendar year, so we subtract 1 from the year.
    API-Football uses the season's start year as the season identifier.
    """
    now = datetime.now()
    return now.year if now.month >= 8 else now.year - 1


_scan_env = os.getenv("SCAN_LEAGUES", "")
SCAN_LEAGUES = (
    [x.strip() for x in _scan_env.split(",") if x.strip()]
    if _scan_env
    else [
        "Premier League",
        "La Liga",
        "Bundesliga",
        "Serie A",
        "Ligue 1",
        "Champions League",
        "Europa League",
        "PSL South Africa",
        "Saudi Pro League",
        "MLS",
        "Eredivisie",
        "Primeira Liga",
        "Brazilian Serie A",
        "Argentine Primera",
        "J1 League Japan",
        "Scottish Premiership",
        "Turkish Super Lig",
        "Belgian Pro League",
    ]
)

# ---------------------------------------------------------------------------
# CACHES / QUOTA
# ---------------------------------------------------------------------------

_fixtures_cache = TTLCache(maxsize=200, ttl=1800)
_live_cache = TTLCache(maxsize=50, ttl=180)  # v184: one upstream live refresh per minute
_odds_cache = TTLCache(maxsize=500, ttl=1800)       # v184: pre-match odds every 30 min
_team_cache = TTLCache(maxsize=500, ttl=604800)
_live_stats_cache = TTLCache(maxsize=500, ttl=180)  # v184: live stats every 3 min
_players_cache = TTLCache(maxsize=100, ttl=86400)   # 24-hour cache for player stats
_standings_cache = TTLCache(maxsize=100, ttl=10800) # 3-hr (was 1 hr) — standings update after matchday
_form_cache = TTLCache(maxsize=500, ttl=10800)      # 3-hr (was 1 hr) — last-5 form is stable intra-day
_prematch_odds_batch_cache = TTLCache(maxsize=100, ttl=1800)  # v184: cache even empty odds scans for 30 min
_odds_api_events_cache = TTLCache(maxsize=100, ttl=1800)  # v217: The Odds API feed, shared across widgets

# ---------------------------------------------------------------------------
# PERSISTENT SQLITE CACHE — survives server restarts / cold starts
# ---------------------------------------------------------------------------
APICACHE_DB = Path(os.getenv("APICACHE_DB", str(BASE_DIR / "api_cache.sqlite3")))

def _apicache_db():
    conn = sqlite3.connect(str(APICACHE_DB))
    conn.row_factory = sqlite3.Row
    conn.execute("""
        CREATE TABLE IF NOT EXISTS api_cache (
            cache_key   TEXT PRIMARY KEY,
            path        TEXT NOT NULL,
            params_json TEXT NOT NULL,
            response    TEXT NOT NULL,
            fetched_at  TEXT NOT NULL,
            ttl_seconds INTEGER NOT NULL
        )
    """)
    conn.commit()
    return conn

def _persist_cache_key(path: str, params: dict) -> str:
    raw = path + "|" + json.dumps(params, sort_keys=True)
    return hashlib.sha256(raw.encode()).hexdigest()

# Per-endpoint persistent TTL (seconds). Longer than in-memory TTL because
# we want to survive restarts and only re-fetch when genuinely stale.
_PERSISTENT_TTL: dict[str, int] = {
    "/teams":                7 * 86400,  # 7 days — static metadata
    "/players":              7 * 86400,  # 7 days — profile doesn't change mid-season
    "/fixtures/headtohead":    86400,    # 24 hrs — history doesn't change
    "/injuries":            3 * 3600,    # 3 hrs  — injury lists update on training days
    "/standings":           3 * 3600,    # 3 hrs  — standings update after matchday only
    "/fixtures/lineups":       3600,     # 1 hr   — lineups confirmed ~1 hr before KO
    "/fixtures/statistics":    3600,     # 1 hr   — stats don't change once fetched post-match
    "/fixtures/players":       3600,     # 1 hr   — same as statistics
    "/odds":                   3600,     # 1 hr   — odds shift but not minute-to-minute
    "/fixtures":               1800,     # 30 min — fixture status can change (live score)
    "/transfers":           7 * 86400,   # 7 days — transfer windows are slow
}

def _persistent_cache_get(path: str, params: dict) -> dict | None:
    """Return cached API response from SQLite if still within TTL, else None."""
    key = _persist_cache_key(path, params)
    try:
        conn = _apicache_db()
        row = conn.execute(
            "SELECT response, fetched_at, ttl_seconds FROM api_cache WHERE cache_key=?",
            (key,)
        ).fetchone()
        conn.close()
        if row:
            fetched = datetime.fromisoformat(row["fetched_at"])
            if fetched.tzinfo is None:
                fetched = fetched.replace(tzinfo=timezone.utc)
            age = (datetime.now(timezone.utc) - fetched).total_seconds()
            if age < row["ttl_seconds"]:
                return json.loads(row["response"])
    except Exception as e:
        log.debug("Persistent cache read error: %s", e)
    return None

def _persistent_cache_set(path: str, params: dict, data: dict):
    """Write API response to SQLite persistent cache."""
    ttl = _PERSISTENT_TTL.get(path, 1800)
    key = _persist_cache_key(path, params)
    try:
        conn = _apicache_db()
        conn.execute("""
            INSERT OR REPLACE INTO api_cache
              (cache_key, path, params_json, response, fetched_at, ttl_seconds)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            key, path,
            json.dumps(params, sort_keys=True),
            json.dumps(data),
            datetime.now(timezone.utc).isoformat(),
            ttl,
        ))
        conn.commit()
        conn.close()
    except Exception as e:
        log.debug("Persistent cache write error: %s", e)

def _persistent_cache_purge_expired():
    """Clean up rows older than their TTL. Call from background task."""
    try:
        conn = _apicache_db()
        conn.execute("""
            DELETE FROM api_cache
            WHERE (julianday('now') - julianday(fetched_at)) * 86400 > ttl_seconds
        """)
        conn.commit()
        conn.close()
    except Exception as e:
        log.debug("Persistent cache purge error: %s", e)

_team_profile_page_cache = TTLCache(maxsize=500, ttl=21600)
_rate_bucket = []
RATE_LIMIT_PER_MINUTE = int(os.getenv("RATE_LIMIT_PER_MINUTE", "90"))  # 90 req/min default; 0 to disable
KASISCORE_DAILY_BUDGET = int(os.getenv("KASISCORE_DAILY_BUDGET", "6500"))
KASISCORE_PROVIDER_RESERVE = int(os.getenv("KASISCORE_PROVIDER_RESERVE", "1000"))

_quota_state = {
    "dailyLimit": None,
    "dailyRemaining": None,
    "minuteLimit": None,
    "minuteRemaining": None,
    "lastStatus": None,
    "lastPath": None,
    "lastCheckedAt": None,
    "dailyExhausted": False,
    "minuteLimited": False,
}

def _rate_check():
    if RATE_LIMIT_PER_MINUTE <= 0:
        return
    now = time.time()
    while _rate_bucket and now - _rate_bucket[0] > 60:
        _rate_bucket.pop(0)
    if len(_rate_bucket) >= RATE_LIMIT_PER_MINUTE:
        wait = 60 - (now - _rate_bucket[0])
        raise HTTPException(429, f"Local rate limit reached. Retry in {wait:.0f}s.")
    _rate_bucket.append(now)

def _record_quota(response: httpx.Response, path: str):
    def iv(*names):
        for name in names:
            value = response.headers.get(name)
            if value is not None:
                try:
                    return int(value)
                except (TypeError, ValueError):
                    pass
        return None

    daily_limit = iv("x-ratelimit-requests-limit")
    daily_remaining = iv("x-ratelimit-requests-remaining")
    minute_limit = iv("X-RateLimit-Limit")
    minute_remaining = iv("X-RateLimit-Remaining")

    if daily_limit is not None:
        _quota_state["dailyLimit"] = daily_limit
    if daily_remaining is not None:
        _quota_state["dailyRemaining"] = daily_remaining
    if minute_limit is not None:
        _quota_state["minuteLimit"] = minute_limit
    if minute_remaining is not None:
        _quota_state["minuteRemaining"] = minute_remaining

    _quota_state.update({
        "lastStatus": response.status_code,
        "lastPath": path,
        "lastCheckedAt": datetime.now(timezone.utc).isoformat(),
        "dailyExhausted": daily_remaining is not None and daily_remaining <= 0,
        "minuteLimited": minute_remaining is not None and minute_remaining <= 0,
    })

_http: Optional[httpx.AsyncClient] = None
_odds_api_http: Optional[httpx.AsyncClient] = None
_fixture_meta_cache = TTLCache(maxsize=2000, ttl=6 * 3600)

async def get_client():
    global _http
    if _http is None or _http.is_closed:
        _http = httpx.AsyncClient(
            base_url=API_BASE,
            headers={
                "x-apisports-key": API_KEY,
                "Accept": "application/json",
            },
            timeout=httpx.Timeout(20.0, connect=5.0),
        )
    return _http

# ---------------------------------------------------------------------------
# THE ODDS API v4 FALLBACK
# ---------------------------------------------------------------------------

ODDS_API_SPORT_MAP = {
    # Football / soccer competitions used by the main fixture widget.
    "Premier League": "soccer_epl",
    "La Liga": "soccer_spain_la_liga",
    "Serie A": "soccer_italy_serie_a",
    "Bundesliga": "soccer_germany_bundesliga",
    "Ligue 1": "soccer_france_ligue_one",
    "Champions League": "soccer_uefa_champs_league",
    "Europa League": "soccer_uefa_europa_league",
    "PSL South Africa": "soccer_south_africa_premiership",
    "MLS": "soccer_usa_mls",
    "Eredivisie": "soccer_netherlands_eredivisie",
    "Primeira Liga": "soccer_portugal_primeira_liga",
    "Brazilian Serie A": "soccer_brazil_campeonato",
    "Argentine Primera": "soccer_argentina_primera_division",
    "J1 League Japan": "soccer_japan_j_league",
    "J1 League": "soccer_japan_j_league",
    "Scottish Premiership": "soccer_spl",
    "Turkish Super Lig": "soccer_turkey_super_league",
    "Belgian Pro League": "soccer_belgium_first_div",
    "Saudi Pro League": "soccer_saudi_arabia_pro_league",
    "FA Cup": "soccer_fa_cup",
    "EFL Cup": "soccer_england_efl_cup",
    "Copa del Rey": "soccer_spain_copa_del_rey",
    "Coppa Italia": "soccer_italy_cup",
    "DFB-Pokal": "soccer_germany_dfb_pokal",
    "Coupe de France": "soccer_france_cup",
    "Championship": "soccer_efl_champ",
    "LaLiga Hypermotion": "soccer_spain_segunda_division",
    "2. Bundesliga": "soccer_germany_bundesliga2",
    "Serie B": "soccer_italy_serie_b",
    "Ligue 2": "soccer_france_ligue_two",
    "Super League Greece": "soccer_greece_super_league",
    "Austrian Bundesliga": "soccer_austria_bundesliga",
    "Swiss Super League": "soccer_switzerland_superleague",
    "Ekstraklasa": "soccer_poland_ekstraklasa",
    "Egyptian Premier League": "soccer_egypt_premiership",
    "Botola Pro": "soccer_morocco_botola_pro",
    "Algerian Ligue 1": "soccer_algeria_ligue_1",
    "Tunisian Ligue 1": "soccer_tunisia_ligue_1",
    "Nigeria Premier Football League": "soccer_nigeria_npfl",
    "Ghana Premier League": "soccer_ghana_premier_league",
    "UAE Pro League": "soccer_uae_pro_league",
    "Qatar Stars League": "soccer_qatar_stars_league",
    "Indian Super League": "soccer_india_super_league",
    "Chinese Super League": "soccer_china_superleague",
    "Thai League 1": "soccer_thailand_thai_league_1",
    "Liga 1 Indonesia": "soccer_indonesia_liga_1",
    "Primera A Colombia": "soccer_colombia_primera_a",
    "Primera División Chile": "soccer_chile_primera_division",
    "Liga Pro Ecuador": "soccer_ecuador_ligapro",
    "Liga 1 Peru": "soccer_peru_primera_division",
    "Primera División Uruguay": "soccer_uruguay_primera_division",
    "Primera División Costa Rica": "soccer_costarica_primera_division",
    "Liga Nacional Guatemala": "soccer_guatemala_liga_nacional",
    "K League 1": "soccer_korea_kleague1",
    "A-League": "soccer_australia_aleague",
    # Non-football sport keys represented in the supplied Odds API feed.
    "NPB": "baseball_npb",
    "KBO": "baseball_kbo",
    "International Twenty20": "cricket_international_t20",
    "One Day Internationals": "cricket_odi",
    "Liiga": "icehockey_liiga",
}

async def get_odds_api_client():
    global _odds_api_http
    if _odds_api_http is None or _odds_api_http.is_closed:
        _odds_api_http = httpx.AsyncClient(
            base_url=ODDS_API_BASE.rstrip("/"),
            timeout=httpx.Timeout(ODDS_API_TIMEOUT, connect=min(3.0, ODDS_API_TIMEOUT)),
            headers={"Accept": "application/json", "User-Agent": "KasiScore-Odds-Fallback/1.0"},
        )
    return _odds_api_http

async def _odds_api_get(path: str, params: dict | None = None) -> dict | list:
    if not ODDS_API_ENABLED or not ODDS_API_KEY:
        raise RuntimeError("ODDS_API_KEY is not configured")
    client = await get_odds_api_client()
    query = dict(params or {})
    query["apiKey"] = ODDS_API_KEY
    response = await client.get(path, params=query)
    try:
        data = response.json()
    except Exception:
        data = {"message": response.text[:500]}
    if response.status_code >= 400:
        raise RuntimeError(f"The Odds API HTTP {response.status_code}: {data}")
    return data

def _odds_api_sport_key(league: str = "") -> str | None:
    if not league:
        return None
    if league in ODDS_API_SPORT_MAP:
        return ODDS_API_SPORT_MAP[league]
    # Accept an Odds API sport key directly in the league query when an admin
    # or integration wants a sport not present in the local registry.
    if league.startswith(("soccer_", "baseball_", "cricket_", "icehockey_")):
        return league
    return None

def _normalise_odds_api_event(event: dict) -> dict:
    """Best-price 1X2 normalisation from The Odds API h2h market."""
    best: dict[str, float] = {}
    bookmakers = event.get("bookmakers") or []
    home = str(event.get("home_team") or "Home")
    away = str(event.get("away_team") or "Away")
    for bookmaker in bookmakers:
        for market in bookmaker.get("markets") or []:
            if market.get("key") != "h2h":
                continue
            for outcome in market.get("outcomes") or []:
                name = str(outcome.get("name") or "").strip()
                try:
                    price = float(outcome.get("price"))
                except (TypeError, ValueError):
                    continue
                if price <= 1:
                    continue
                if name in (home, away, "Draw"):
                    best[name] = max(price, best.get(name, 0.0))
    norm = {
        "homeWin": best.get(home, 0.0),
        "draw": best.get("Draw", 0.0),
        "awayWin": best.get(away, 0.0),
        "over25": 0.0,
        "over15": 0.0,
        "over05": 0.0,
        "btts": 0.0,
        "firstHalfHome": 0.0,
        "scoreFirst": 0.0,
        "expectedGoalscorer": 0.0,
    }
    return norm

def _normalise_odds_api_fixture(event: dict, league_name: str = "") -> dict:
    odds = _normalise_odds_api_event(event)
    commence = event.get("commence_time") or ""
    try:
        dt = datetime.fromisoformat(str(commence).replace("Z", "+00:00")).astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M")
    except Exception:
        dt = str(commence).replace("T", " ")[:16]
    return {
        "home": event.get("home_team") or "Home",
        "away": event.get("away_team") or "Away",
        "homeId": None, "awayId": None,
        "homeLogo": "", "awayLogo": "", "leagueLogo": "", "leagueFlag": "",
        "league": event.get("sport_title") or league_name or event.get("sport_key") or "Football",
        "datetime": dt,
        "score": "vs",
        "status": "Upcoming",
        "venue": "",
        "homeForm": [], "awayForm": [],
        "homeGoalsFor": 1.35, "homeGoalsAgainst": 1.35,
        "awayGoalsFor": 1.35, "awayGoalsAgainst": 1.35,
        "h2hHomeWins": 3, "h2hDraws": 2, "h2hAwayWins": 2,
        "isSoccer": str(event.get("sport_key", "")).startswith("soccer_"),
        "isLive": False, "isFinished": False, "elapsed": None,
        "odds": odds,
        "oddsSource": "The Odds API",
        "oddsApiEventId": event.get("id"),
        "_afootFixtureId": None,
        "_teamHomeId": None, "_teamAwayId": None,
        "_leagueId": None, "_leagueSeason": _current_season(),
        "source": "The Odds API",
    }

TEAM_NAME_ALIASES = {
    "man utd": "manchester united",
    "man united": "manchester united",
    "man city": "manchester city",
    "psg": "paris saint germain",
    "inter milan": "inter",
    "internazionale": "inter",
    "spurs": "tottenham hotspur",
    "tottenham": "tottenham hotspur",
    "wolves": "wolverhampton wanderers",
    "wolverhampton": "wolverhampton wanderers",
    "west ham": "west ham united",
    "manchester utd": "manchester united",
}

def _normalise_team_name(value: str) -> str:
    name = re.sub(r"[^a-z0-9 ]+", " ", str(value or "").lower())
    name = re.sub(r"\s+", " ", name).strip()
    for suffix in (" football club", " fc", " afc", " cf"):
        if name.endswith(suffix):
            name = name[:-len(suffix)].strip()
    return TEAM_NAME_ALIASES.get(name, name)

def _parse_provider_time(value: Any) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).astimezone(timezone.utc)
    except Exception:
        return None

def _team_similarity(a: str, b: str) -> float:
    """0-100 similarity score used only after exact/alias matching fails."""
    a = _normalise_team_name(a)
    b = _normalise_team_name(b)
    if not a or not b:
        return 0.0
    if a == b:
        return 100.0
    return SequenceMatcher(None, a, b).ratio() * 100.0

def _event_matches_fixture(event: dict, fixture: dict, kickoff_tolerance_hours: float = 3.0) -> bool:
    """Safely map an Odds API event to an API-Football fixture.

    Order:
      1) normalized/manual-alias exact match for BOTH teams
      2) conservative fuzzy fallback for BOTH teams
      3) kickoff-time guard
    """
    eh = _normalise_team_name(event.get("home_team"))
    ea = _normalise_team_name(event.get("away_team"))
    fh = _normalise_team_name(fixture.get("home") or fixture.get("homeTeam"))
    fa = _normalise_team_name(fixture.get("away") or fixture.get("awayTeam"))
    if not all((eh, ea, fh, fa)):
        return False

    # First choice: normalized names / manual aliases.
    exact_home = eh == fh or (len(eh) >= 5 and len(fh) >= 5 and (eh in fh or fh in eh))
    exact_away = ea == fa or (len(ea) >= 5 and len(fa) >= 5 and (ea in fa or fa in ea))
    exact_pair = exact_home and exact_away

    # Fallback only: BOTH teams must independently clear the threshold.
    # A single fuzzy home-team hit is never enough to attach bookmaker odds.
    fuzzy_threshold = float(os.getenv("ODDS_TEAM_FUZZY_THRESHOLD", "85"))
    home_score = _team_similarity(eh, fh)
    away_score = _team_similarity(ea, fa)
    fuzzy_pair = home_score >= fuzzy_threshold and away_score >= fuzzy_threshold

    if not (exact_pair or fuzzy_pair):
        return False

    event_time = _parse_provider_time(event.get("commence_time") or event.get("datetime"))
    fixture_time = _parse_provider_time(fixture.get("datetime") or fixture.get("kickoff") or fixture.get("date"))
    if event_time and fixture_time:
        delta = abs((event_time - fixture_time).total_seconds())
        if delta > kickoff_tolerance_hours * 3600:
            return False

    return True

async def _odds_api_events_for_league(league: str = "", refresh: bool = False) -> list[dict]:
    sport_key = _odds_api_sport_key(league)
    if not sport_key:
        return []
    cache_key = f"oddsapi:{sport_key}:{ODDS_API_REGIONS}:{ODDS_API_MARKETS}"
    if not refresh:
        cached = _odds_api_events_cache.get(cache_key)
        if cached is not None:
            return cached
    data = await _odds_api_get(
        f"/sports/{sport_key}/odds",
        {"regions": ODDS_API_REGIONS, "markets": ODDS_API_MARKETS, "oddsFormat": "decimal"},
    )
    events = data if isinstance(data, list) else []
    _odds_api_events_cache[cache_key] = events
    return events

async def _odds_api_events(league: str = "ALL", refresh: bool = False) -> list[dict]:
    """One cached Odds API feed used to supplement API-Football fixtures."""
    if not ODDS_API_ENABLED or not ODDS_API_KEY:
        return []
    if league.upper() != "ALL":
        return await _odds_api_events_for_league(league, refresh=refresh)
    cache_key = f"oddsapi:upcoming:{ODDS_API_REGIONS}:{ODDS_API_MARKETS}"
    if not refresh:
        cached = _odds_api_events_cache.get(cache_key)
        if cached is not None:
            return cached
    data = await _odds_api_get(
        "/sports/upcoming/odds",
        {"regions": ODDS_API_REGIONS, "markets": ODDS_API_MARKETS, "oddsFormat": "decimal"},
    )
    events = [e for e in (data if isinstance(data, list) else []) if str(e.get("sport_key", "")).startswith("soccer_")]
    _odds_api_events_cache[cache_key] = events
    return events

async def _supplement_odds_from_odds_api(matches: list[dict], league: str = "ALL", refresh: bool = False) -> dict:
    """Fill missing 1X2 odds without replacing API-Football fixture identity/data."""
    meta = {"checked": False, "matched": 0, "events": 0, "error": None}
    if not matches or not ODDS_API_ENABLED or not ODDS_API_KEY:
        return meta
    try:
        events = await _odds_api_events(league, refresh=refresh)
        meta.update({"checked": True, "events": len(events)})
        for match in matches:
            fid = match.get("_afootFixtureId")
            if not fid:
                continue
            if _valid_1x2(match.get("odds", {})):
                continue
            for event in events:
                if not _event_matches_fixture(event, match):
                    continue
                odds = _normalise_odds_api_event(event)
                if not _valid_1x2(odds):
                    continue
                match["odds"] = odds
                match["oddsSource"] = "The Odds API"
                match["oddsAvailable"] = True
                match["hasBookmakerOdds"] = True
                match["bookmakerGatePassed"] = True
                match["oddsApiEventId"] = event.get("id")
                eh = _normalise_team_name(event.get("home_team"))
                ea = _normalise_team_name(event.get("away_team"))
                fh = _normalise_team_name(match.get("home") or match.get("homeTeam"))
                fa = _normalise_team_name(match.get("away") or match.get("awayTeam"))
                exact_pair = (eh == fh and ea == fa)
                match["oddsMatchedBy"] = "exact/alias+kickoff" if exact_pair else "fuzzy-both-teams+kickoff"
                if not exact_pair:
                    match["oddsMatchConfidence"] = {
                        "home": round(_team_similarity(eh, fh), 1),
                        "away": round(_team_similarity(ea, fa), 1),
                    }
                meta["matched"] += 1
                break
    except Exception as exc:
        meta["error"] = str(exc)
        log.warning("The Odds API supplement failed: %s", exc)
    return meta

async def _odds_api_fallback_fixtures(league: str = "ALL") -> dict:
    events = await _odds_api_events(league, refresh=False)
    matches = [_normalise_odds_api_fixture(e, league) for e in events]
    return {
        "matches": matches,
        "count": len(matches),
        "source": "The Odds API fallback",
        "oddsSource": "The Odds API",
        "oddsFallback": True,
        "hasBookmakerOdds": any(_valid_1x2(m.get("odds", {})) for m in matches),
        "hasValidOdds": any(_valid_1x2(m.get("odds", {})) for m in matches),
        "oddsUnavailable": not any(_valid_1x2(m.get("odds", {})) for m in matches),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }

async def _afoot_get(path: str, params: dict, force_fresh: bool = False) -> dict:
    # ── Persistent SQLite cache (survives restarts) ──────────────────────────
    if not force_fresh:
        cached = _persistent_cache_get(path, params)
        if cached is not None:
            log.debug("Persistent cache hit: %s %s", path, params)
            return cached

    _rate_check()
    client = await get_client()
    last_exc = Exception("unknown")

    for attempt in range(3):
        if attempt:
            await asyncio.sleep(min(4, 2 ** attempt))
        try:
            response = await client.get(path, params=params)
            _record_quota(response, path)

            try:
                data = response.json()
            except Exception:
                data = {"errors": {"raw": response.text[:1000]}, "response": []}

            if response.status_code == 429:
                daily = _quota_state.get("dailyRemaining")
                if daily is not None and daily <= 0:
                    raise HTTPException(
                        429,
                        detail={
                            "code": "API_FOOTBALL_DAILY_QUOTA",
                            "message": "API-Football daily quota is exhausted.",
                            "dailyRemaining": daily,
                            "dailyLimit": _quota_state.get("dailyLimit"),
                        },
                    )
                last_exc = HTTPException(
                    429,
                    detail={
                        "code": "API_FOOTBALL_MINUTE_LIMIT",
                        "message": "API-Football per-minute rate limit reached.",
                    },
                )
                continue

            if response.status_code == 401:
                raise HTTPException(502, detail={
                    "code": "API_FOOTBALL_AUTH",
                    "message": "API-Football authentication failed.",
                    "api_response": data,
                })

            if response.status_code == 403:
                raise HTTPException(502, detail={
                    "code": "API_FOOTBALL_FORBIDDEN",
                    "message": "API-Football rejected the request (403 Forbidden).",
                    "api_response": data,
                })

            if response.status_code >= 500:
                last_exc = HTTPException(
                    502,
                    detail={"code": "API_FOOTBALL_SERVER_ERROR",
                            "message": f"API-Football server error: HTTP {response.status_code}"},
                )
                continue

            if response.status_code != 200:
                raise HTTPException(502, detail={
                    "code": "API_FOOTBALL_HTTP_ERROR",
                    "message": f"API-Football HTTP {response.status_code}",
                    "api_response": data,
                })

            errors = data.get("errors")
            if errors and not (isinstance(errors, list) and not errors):
                message = (
                    "; ".join(f"{k}: {v}" for k, v in errors.items())
                    if isinstance(errors, dict)
                    else str(errors)
                )
                raise HTTPException(502, detail={
                    "code": "API_FOOTBALL_ERROR",
                    "message": message,
                    "dailyRemaining": _quota_state.get("dailyRemaining"),
                    "minuteRemaining": _quota_state.get("minuteRemaining"),
                })

            # ── Write to persistent SQLite cache before returning ────────────
            _persistent_cache_set(path, params, data)

            return data

        except (httpx.NetworkError, httpx.TimeoutException) as exc:
            last_exc = exc

    raise HTTPException(
        502,
        detail={
            "code": "API_FOOTBALL_UNREACHABLE",
            "message": f"API-Football unreachable after 3 retries: {last_exc}",
        },
    )

async def _afoot_get_deadline(path: str, params: dict, deadline: float = 5.0, force_fresh: bool = False) -> dict:
    """Primary provider request with a hard wall-clock deadline for fallback paths."""
    return await asyncio.wait_for(
        _afoot_get(path, params, force_fresh=force_fresh),
        timeout=deadline,
    )

# ---------------------------------------------------------------------------
# NORMALISATION
# ---------------------------------------------------------------------------

def _safe_float(value) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0

def _clean(value) -> str:
    return re.sub(r"[^a-z0-9]+", " ", str(value or "").lower()).strip()

def _valid_1x2_local(odds):
    return all(_safe_float(odds.get(k)) > 1 for k in ("homeWin", "draw", "awayWin"))

def _valid_1x2(odds):
    return _valid_1x2_local(odds)

def _normalise_fixture(f: dict, league_name: str = "") -> dict:
    fixture = f.get("fixture", {})
    teams = f.get("teams", {})
    goals = f.get("goals", {})
    league = f.get("league", {})
    status = fixture.get("status", {})
    short = status.get("short", "")
    elapsed = status.get("elapsed")

    is_live = short in ("1H", "HT", "2H", "ET", "P", "BT")
    is_finished = short in ("FT", "AET", "PEN")

    if is_live:
        status_label = f"LIVE {elapsed}'" if elapsed is not None else "LIVE"
    elif is_finished:
        status_label = "FT"
    else:
        status_label = "Upcoming"

    home_goals = goals.get("home")
    away_goals = goals.get("away")
    score = (
        f"{home_goals} - {away_goals}"
        if home_goals is not None and away_goals is not None
        else "vs"
    )

    dt = fixture.get("date", "")
    if dt:
        dt = dt.replace("T", " ")[:16]

    result = {
        "home": teams.get("home", {}).get("name", "Home"),
        "away": teams.get("away", {}).get("name", "Away"),
        "homeId": teams.get("home", {}).get("id"),
        "awayId": teams.get("away", {}).get("id"),
        "homeLogo": teams.get("home", {}).get("logo", ""),
        "awayLogo": teams.get("away", {}).get("logo", ""),
        "leagueLogo": league.get("logo", ""),
        "leagueFlag": league.get("flag", ""),
        "league": league.get("name", league_name),
        "datetime": dt,
        "score": score,
        "status": status_label,
        "venue": fixture.get("venue", {}).get("name", ""),
        "homeForm": [],
        "awayForm": [],
        "homeGoalsFor": 1.35,       # Neutral baseline — no home advantage built in
        "homeGoalsAgainst": 1.35,
        "awayGoalsFor": 1.35,
        "awayGoalsAgainst": 1.35,
        "h2hHomeWins": 3,
        "h2hDraws": 2,
        "h2hAwayWins": 2,
        "isSoccer": True,
        "isLive": is_live,
        "isFinished": is_finished,
        "elapsed": elapsed,
        "odds": {
            "homeWin": 0, "draw": 0, "awayWin": 0,
            "over25": 0, "over15": 0, "over05": 0,
            "btts": 0, "firstHalfHome": 0, "scoreFirst": 0,
            "expectedGoalscorer": 0,
        },
        "oddsSource": "API-Football",
        "_afootFixtureId": fixture.get("id"),
        "_teamHomeId": teams.get("home", {}).get("id"),
        "_teamAwayId": teams.get("away", {}).get("id"),
        "_leagueId": league.get("id"),
        "_leagueSeason": league.get("season"),
    }
    fixture_id = fixture.get("id")
    if fixture_id is not None:
        _fixture_meta_cache[str(fixture_id)] = {
            "home": result.get("home"), "away": result.get("away"),
            "homeLogo": result.get("homeLogo", ""),
            "awayLogo": result.get("awayLogo", ""),
            "leagueLogo": result.get("leagueLogo", ""),
            "leagueFlag": result.get("leagueFlag", ""),
            "league": result.get("league"), "datetime": result.get("datetime"),
            "leagueId": result.get("_leagueId"),
        }
    return result

# ---------------------------------------------------------------------------
# REPLACED _normalise_odds()
# ---------------------------------------------------------------------------

def _normalise_odds(bookmakers: list[dict], live: bool = False) -> dict:
    """
    Normalise API-Football bookmaker markets.

    Supports pre-match and live odds and preserves available individual
    markets even when a bookmaker does not contain a complete 1X2 market.
    """

    empty = {
        "homeWin": 0.0,
        "draw": 0.0,
        "awayWin": 0.0,
        "over25": 0.0,
        "over15": 0.0,
        "over05": 0.0,
        "btts": 0.0,
        "firstHalfHome": 0.0,
        "scoreFirst": 0.0,
        "expectedGoalscorer": 0.0,
    }

    if not bookmakers:
        return empty

    preferred = [
        "Pinnacle", "Bet365", "1xBet", "William Hill",
        "Unibet", "Bwin", "Ladbrokes", "Coral", "Paddy Power",
    ]

    def clean(value):
        return re.sub(r"[^a-z0-9]+", " ", str(value or "").lower()).strip()

    def find_value(values, aliases):
        aliases = [clean(x) for x in aliases]

        for value_name, odd, raw in values:
            if value_name in aliases:
                return odd

        for value_name, odd, raw in values:
            for alias in aliases:
                if alias and alias in value_name:
                    return odd

        return 0.0

    def extract(bets):
        out = dict(empty)

        for bet in bets or []:
            bet_name = clean(bet.get("name"))
            values = []

            for value in bet.get("values") or []:
                value_name = clean(value.get("value"))
                odd = _safe_float(value.get("odd"))
                if odd > 0:
                    values.append((value_name, odd, value))

            if not values:
                continue

            # MATCH WINNER / 1X2
            winner_market = (
                "match winner" in bet_name
                or "full time result" in bet_name
                or "fulltime result" in bet_name
                or "match result" in bet_name
                or "game winner" in bet_name
                or "1x2" in bet_name
                or bet_name == "winner"
                or bet_name == "result"
            )

            if winner_market:
                out["homeWin"] = (
                    find_value(values, ["home", "1", "home team", "team 1"])
                    or out["homeWin"]
                )
                out["draw"] = (
                    find_value(values, ["draw", "x"])
                    or out["draw"]
                )
                out["awayWin"] = (
                    find_value(values, ["away", "2", "away team", "team 2"])
                    or out["awayWin"]
                )

            # OVER / UNDER
            totals_market = (
                "over under" in bet_name
                or "goals over" in bet_name
                or "total goals" in bet_name
                or "goals" in bet_name
                or "total" in bet_name
            )

            if totals_market:
                out["over25"] = (
                    find_value(values, ["over 2.5", "over2.5", "over 2 5"])
                    or out["over25"]
                )
                out["over15"] = (
                    find_value(values, ["over 1.5", "over1.5", "over 1 5"])
                    or out["over15"]
                )
                out["over05"] = (
                    find_value(values, ["over 0.5", "over0.5", "over 0 5"])
                    or out["over05"]
                )

            # BTTS
            if (
                "both teams score" in bet_name
                or "both team score" in bet_name
                or bet_name == "btts"
                or "btts" in bet_name
            ):
                out["btts"] = find_value(values, ["yes"]) or out["btts"]

            # FIRST HALF WINNER
            if (
                "first half winner" in bet_name
                or "half time result" in bet_name
                or "halftime result" in bet_name
                or "1st half winner" in bet_name
            ):
                out["firstHalfHome"] = (
                    find_value(values, ["home", "1", "home team"])
                    or out["firstHalfHome"]
                )

            # FIRST TEAM TO SCORE
            if (
                "first team to score" in bet_name
                or "team to score first" in bet_name
                or "first scorer team" in bet_name
            ):
                out["scoreFirst"] = (
                    find_value(values, ["home", "1", "home team"])
                    or out["scoreFirst"]
                )

            # EXPECTED GOALSCORER / FIRST GOALSCORER
            if (
                "first goalscorer" in bet_name
                or "first goal scorer" in bet_name
                or "anytime goalscorer" in bet_name
                or "goalscorer" in bet_name
            ):
                if values:
                    out["expectedGoalscorer"] = values[0][1]

        return out

    ordered = sorted(
        bookmakers,
        key=lambda b: (
            preferred.index(b.get("name"))
            if b.get("name") in preferred
            else 9999
        ),
    )

    best = dict(empty)

    for bookmaker in ordered:
        candidate = extract(bookmaker.get("bets") or [])

        # Prefer one bookmaker containing complete 1X2.
        if _valid_1x2_local(candidate):
            return candidate

        # Preserve available individual markets.
        for key, value in candidate.items():
            if value and not best.get(key):
                best[key] = value

    return best

# ---------------------------------------------------------------------------
# STATISTICAL / PREDICTION ENGINE
# ---------------------------------------------------------------------------

V141_CACHE_TTL_SECONDS = 300
V141_FIXTURE_REFRESH_SECONDS = int(os.getenv("FIXTURE_REFRESH_SECONDS", "3600"))  # 1 hr (was 30 min)
V141_PREDICTION_REFRESH_SECS = 300
V141_LEARNING_CYCLE_SECS = int(os.getenv("LEARNING_CYCLE_SECS", str(6 * 3600)))  # 6 hours (was 3 hrs)
V141_MODEL_VERSION = os.getenv("MODEL_VERSION", "KasiScore AI Model")
V141_LEARNING_DB_PATH = Path(
    os.getenv("LEARNING_DB_PATH", str(BASE_DIR / "kasiscore_learning.sqlite3"))
)

V141_PREDICTION_WEIGHTS = {
    "odds":          0.385,   # Bookmaker odds — 38.5% weight
    "ai":            0.188,   # AI model       — 18.8% weight
    "table":         0.111,   # League table   — 11.1% weight
    "injuriesH2H":   0.011,   # Injuries/H2H   — kept proportional (legacy)
    "lastSeason":    0.115,   # Last season    — 11.5% weight
    "currentSeason": 0.090,   # Current season 2026/27 — 9.0% weight
}

# Minimum win-rate threshold (75%) for a team to qualify for predictions.
# Applied per team across games played in the current 2026/27 season.
WIN_RATE_THRESHOLD = 0.45

class V141SharedCache:
    def __init__(self, ttl=V141_CACHE_TTL_SECONDS):
        self.ttl = ttl
        self.data = {}
        self.timestamps = {}

    def get(self, key):
        now = time.monotonic()
        if key not in self.data:
            return None
        if now - self.timestamps[key] >= self.ttl:
            self.data.pop(key, None)
            self.timestamps.pop(key, None)
            return None
        return self.data[key]

    def set(self, key, value):
        self.data[key] = value
        self.timestamps[key] = time.monotonic()
        return value

    def clear(self):
        self.data.clear()
        self.timestamps.clear()

v141_cache = V141SharedCache()

class V141LearningStore:
    def __init__(self, path):
        self.path = Path(path)

    def connect(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(self.path), timeout=30)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        return conn

    def init(self):
        with self.connect() as conn:
            conn.executescript("""
            CREATE TABLE IF NOT EXISTS predictions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fixture_id INTEGER NOT NULL,
                kickoff TEXT,
                home_team TEXT,
                away_team TEXT,
                model_version TEXT NOT NULL,
                probabilities TEXT NOT NULL,
                odds TEXT,
                model_inputs TEXT,
                prediction TEXT,
                predicted_at TEXT NOT NULL,
                resolved INTEGER NOT NULL DEFAULT 0,
                UNIQUE(fixture_id, model_version)
            );
            CREATE TABLE IF NOT EXISTS results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                prediction_id INTEGER NOT NULL UNIQUE,
                fixture_id INTEGER NOT NULL,
                home_goals INTEGER,
                away_goals INTEGER,
                actual_result TEXT,
                market_accuracy TEXT,
                resolved_at TEXT NOT NULL,
                FOREIGN KEY(prediction_id) REFERENCES predictions(id)
            );
            """)

    def save_prediction(self, payload):
        model_version = payload.get("modelVersion", V141_MODEL_VERSION)
        now = datetime.now(timezone.utc).isoformat()

        with self.connect() as conn:
            conn.execute("""
                INSERT INTO predictions
                (fixture_id,kickoff,home_team,away_team,model_version,
                 probabilities,odds,model_inputs,prediction,predicted_at)
                VALUES (?,?,?,?,?,?,?,?,?,?)
                ON CONFLICT(fixture_id,model_version) DO UPDATE SET
                    kickoff=excluded.kickoff,
                    home_team=excluded.home_team,
                    away_team=excluded.away_team,
                    probabilities=excluded.probabilities,
                    odds=excluded.odds,
                    model_inputs=excluded.model_inputs,
                    prediction=excluded.prediction,
                    predicted_at=excluded.predicted_at
            """, (
                int(payload["fixtureId"]),
                payload.get("kickoff"),
                payload.get("homeTeam"),
                payload.get("awayTeam"),
                model_version,
                json.dumps(payload.get("probabilities", {})),
                json.dumps(payload.get("odds", {})),
                json.dumps(payload.get("modelInputs", {})),
                json.dumps(payload.get("prediction", {})),
                now,
            ))

            row = conn.execute("""
                SELECT id,fixture_id,model_version,resolved
                FROM predictions
                WHERE fixture_id=? AND model_version=?
            """, (int(payload["fixtureId"]), model_version)).fetchone()

            return dict(row)

    def save_result(self, prediction_id, fixture_id, home_goals, away_goals,
                    actual_result, market_accuracy=None):
        with self.connect() as conn:
            conn.execute("""
                INSERT OR REPLACE INTO results
                (prediction_id,fixture_id,home_goals,away_goals,
                 actual_result,market_accuracy,resolved_at)
                VALUES (?,?,?,?,?,?,?)
            """, (
                prediction_id, fixture_id, home_goals, away_goals,
                actual_result, json.dumps(market_accuracy or {}),
                datetime.now(timezone.utc).isoformat(),
            ))
            conn.execute(
                "UPDATE predictions SET resolved=1 WHERE id=?",
                (prediction_id,),
            )

    def stats(self):
        with self.connect() as conn:
            total    = conn.execute("SELECT COUNT(*) FROM predictions").fetchone()[0]
            resolved = conn.execute("SELECT COUNT(*) FROM results").fetchone()[0]
            # Distinct model versions in use (for dashboard display)
            versions = [r[0] for r in conn.execute(
                "SELECT DISTINCT model_version FROM predictions ORDER BY model_version"
            ).fetchall()]
            # Accuracy: % of resolved games where winner was correctly predicted
            correct = conn.execute(
                """SELECT COUNT(*) FROM results r
                    JOIN predictions p ON p.id=r.prediction_id
                    WHERE json_extract(r.market_accuracy,'$.winnerCorrect')=1"""
            ).fetchone()[0]
            graded = conn.execute(
                """SELECT COUNT(*) FROM results
                    WHERE market_accuracy IS NOT NULL
                      AND json_extract(market_accuracy,'$.winnerCorrect') IS NOT NULL"""
            ).fetchone()[0]
            accuracy = round(correct / graded * 100, 1) if graded > 0 else None
            return {
                "totalPredictions": total,
                "resolvedPredictions": resolved,
                "pendingPredictions": total - resolved,
                "modelVersionsInDB": versions,
                "accuracy": accuracy,
                "gradedGames": graded,
                "correctPredictions": correct,
            }

v141_learning = V141LearningStore(V141_LEARNING_DB_PATH)

# Learning cycle state — tracks last run and weight adaptations
_learning_state = {
    "lastRunAt": None,
    "nextRunAt": None,
    "cycleCount": 0,
    "lastCycleUpdated": 0,       # # predictions refreshed last cycle
    "lastCycleImproved": 0,      # # predictions whose confidence changed
    "adaptedWeights": dict(V141_PREDICTION_WEIGHTS),  # live-adjusted weights
    "marketAccuracyHistory": {},  # market -> [correct_rate over last N cycles]
    "status": "pending",
}

def v141_normalise_three_way(values):
    keys = ("homeWin", "draw", "awayWin")
    total = sum(max(0.0, float(values.get(k, 0.0))) for k in keys)
    if total <= 0:
        return {k: 1 / 3 for k in keys}
    return {
        k: max(0.0, float(values.get(k, 0.0))) / total
        for k in keys
    }

def v141_weight_prediction(components):
    available = {
        name: v141_normalise_three_way(value)
        for name, value in components.items()
        if name in V141_PREDICTION_WEIGHTS and isinstance(value, dict)
    }

    total_weight = sum(V141_PREDICTION_WEIGHTS[k] for k in available)
    if not available or total_weight <= 0:
        return {
            "probabilities": {k: 1 / 3 for k in ("homeWin", "draw", "awayWin")},
            "weights": {},
            "configuredWeights": V141_PREDICTION_WEIGHTS,
        }

    effective = {
        k: V141_PREDICTION_WEIGHTS[k] / total_weight
        for k in available
    }

    final = {k: 0.0 for k in ("homeWin", "draw", "awayWin")}
    for name, probs in available.items():
        for outcome in final:
            final[outcome] += probs[outcome] * effective[name]

    return {
        "probabilities": v141_normalise_three_way(final),
        "weights": effective,
        "configuredWeights": V141_PREDICTION_WEIGHTS,
        "components": available,
    }

def _poisson(m):
    # Neutral xG model — no home advantage factor applied.
    # Both teams rated purely on their attacking output vs opponent defence,
    # using symmetrical defaults so the model is unbiased when data is missing.
    NEUTRAL = 1.35  # league average goals per match (no home/away bias)
    home_xg = max(
        0.25,
        min(
            4.5,
            (
                float(m.get("homeGoalsFor", NEUTRAL))
                + float(m.get("awayGoalsAgainst", NEUTRAL))
            ) / 2,
        ),
    )
    away_xg = max(
        0.25,
        min(
            4.5,
            (
                float(m.get("awayGoalsFor", NEUTRAL))
                + float(m.get("homeGoalsAgainst", NEUTRAL))
            ) / 2,
        ),
    )

    matrix = {
        (i, j): (
            math.exp(-(home_xg + away_xg))
            * home_xg ** i / math.factorial(i)
            * away_xg ** j / math.factorial(j)
        )
        for i in range(8)
        for j in range(8)
    }

    home = sum(v for (i, j), v in matrix.items() if i > j)
    draw = sum(v for (i, j), v in matrix.items() if i == j)
    away = sum(v for (i, j), v in matrix.items() if i < j)
    z = home + draw + away or 1

    return {
        "probs": {
            "homeWin": home / z,
            "draw": draw / z,
            "awayWin": away / z,
        },
        "over35": sum(v for (i, j), v in matrix.items() if i + j > 3),
        "over25": sum(v for (i, j), v in matrix.items() if i + j > 2),
        "over15": sum(v for (i, j), v in matrix.items() if i + j > 1),
        "over05": 1 - matrix[(0, 0)],
        "btts": sum(v for (i, j), v in matrix.items() if i > 0 and j > 0),
        "xgHome": home_xg,
        "xgAway": away_xg,
    }


# ---------------------------------------------------------------------------
# WIN-RATE QUALIFICATION — 75% threshold for 2026/27 season predictions
# ---------------------------------------------------------------------------

def _team_win_rate(rank: dict) -> tuple[float, int]:
    """Return (win_rate 0-1, games_played) for a standings entry.

    API-Football standings entries expose:
      rank["all"]["played"]  — total games played in the season
      rank["all"]["win"]     — total wins in the season
    A team qualifies for predictions only when its win rate ≥ WIN_RATE_THRESHOLD.
    """
    all_info = rank.get("all") or {}
    played = all_info.get("played") or 0
    wins   = all_info.get("win")   or 0
    if played == 0:
        return 0.0, 0
    return round(wins / played, 4), played


def _team_qualifies(rank: dict | None) -> bool:
    """True if a team has played ≥1 game AND has a win-rate ≥ WIN_RATE_THRESHOLD.

    If the team is not found in standings (rank is None) we let it through so
    that fixtures played before standings data is available are not silently
    dropped.  Once standings exist, the threshold is enforced.
    """
    if rank is None:
        return True   # standings not yet available — give benefit of the doubt
    win_rate, played = _team_win_rate(rank)
    if played == 0:
        return True   # no games played yet in the season — let through
    return win_rate >= WIN_RATE_THRESHOLD


# ---------------------------------------------------------------------------
# MATCH ENRICHMENT — standings + form → real signal for table & currentSeason
# ---------------------------------------------------------------------------

async def _fetch_standings_for_league(league_id: int, season: int) -> list:
    """Fetch and cache standings for a league/season. Returns the standings list."""
    cache_key = f"standings:{league_id}:{season}"
    cached = _standings_cache.get(cache_key)
    if cached is not None:
        return cached
    try:
        data = await _afoot_get("/standings", {"league": league_id, "season": season})
        # API-Football: response[0].league.standings[0] is the main table list
        # Guard: response or standings may be empty (e.g. league not yet started)
        response_list = data.get("response") or []
        standings_outer = (
            response_list[0].get("league", {}).get("standings", [])
            if response_list
            else []
        )
        standings = standings_outer[0] if standings_outer else []
        _standings_cache[cache_key] = standings
        log.info("Standings cached: league=%s season=%s teams=%d", league_id, season, len(standings))
        return standings
    except Exception as exc:
        log.warning("Standings fetch failed league=%s: %s", league_id, exc)
        return []


async def _fetch_team_form(team_id: int, league_id: int, season: int, last_n: int = 5) -> list:
    """Fetch last N fixture results for a team. Returns list of 'W'/'D'/'L' strings."""
    cache_key = f"form:{team_id}:{league_id}:{season}"
    cached = _form_cache.get(cache_key)
    if cached is not None:
        return cached
    try:
        data = await _afoot_get(
            "/fixtures",
            {"team": team_id, "league": league_id, "season": season,
             "status": "FT", "last": last_n},
        )
        results = []
        for fix in data.get("response", []):
            goals = fix.get("goals", {})
            score_h = goals.get("home", 0) or 0
            score_a = goals.get("away", 0) or 0
            teams = fix.get("teams", {})
            is_home = teams.get("home", {}).get("id") == team_id
            if is_home:
                results.append("W" if score_h > score_a else "D" if score_h == score_a else "L")
            else:
                results.append("W" if score_a > score_h else "D" if score_h == score_a else "L")
        _form_cache[cache_key] = results
        return results
    except Exception as exc:
        log.warning("Form fetch failed team=%s: %s", team_id, exc)
        return []


def _form_to_probs(form: list) -> dict:
    """Convert a list of W/D/L strings into win/draw/loss probabilities.
    Recent results are weighted more heavily (exponential decay).
    Falls back to neutral 1/3 if no data.
    """
    if not form:
        return {"homeWin": 1/3, "draw": 1/3, "awayWin": 1/3}
    weights = [0.5 ** i for i in range(len(form))]  # most recent = highest weight
    total_w = sum(weights)
    w_wins  = sum(w for w, r in zip(weights, form) if r == "W")
    w_draws = sum(w for w, r in zip(weights, form) if r == "D")
    w_loss  = sum(w for w, r in zip(weights, form) if r == "L")
    return {
        "homeWin":  w_wins  / total_w,
        "draw":     w_draws / total_w,
        "awayWin":  w_loss  / total_w,
    }


def _standings_to_probs(home_rank: dict, away_rank: dict, total_teams: int) -> dict:
    """Convert league table positions + goal difference into match probabilities.

    Strategy:
    - Points-per-game ratio gives a raw team strength score.
    - Goal difference per game adds attacking/defensive signal.
    - Relative strength of home vs away converts to win/draw/loss probs.
    - Draw probability is higher when teams are closely matched.
    """
    if not home_rank or not away_rank or total_teams < 2:
        return {"homeWin": 1/3, "draw": 1/3, "awayWin": 1/3}

    def team_strength(rank: dict) -> float:
        """0.0–1.0 strength score from points per game + goal difference."""
        all_info = rank.get("all") or {}
        played = max(all_info.get("played") or 1, 1)
        points = rank.get("points") or 0
        gd     = rank.get("goalsDiff") or 0
        ppg    = points / played           # points per game (0–3)
        gd_pg  = gd / played               # goal diff per game
        # Normalise ppg to 0-1 range (max is 3.0) and blend with gd
        return (ppg / 3.0) * 0.7 + (max(min(gd_pg, 3), -3) / 3.0) * 0.15 + 0.15

    hs = team_strength(home_rank)
    as_ = team_strength(away_rank)
    total = hs + as_ or 1

    raw_home = hs / total
    raw_away = as_ / total

    # Draw probability is highest when teams are evenly matched
    closeness = 1 - abs(raw_home - raw_away)  # 0 (mismatch) → 1 (equal)
    draw_prob = 0.10 + closeness * 0.18        # 10–28% draw range

    home_prob = raw_home * (1 - draw_prob)
    away_prob = raw_away * (1 - draw_prob)

    z = home_prob + draw_prob + away_prob
    return {
        "homeWin":  home_prob / z,
        "draw":     draw_prob / z,
        "awayWin":  away_prob / z,
    }


def _goals_per_game(rank: dict) -> tuple[float, float]:
    """Return (goals_for_pg, goals_against_pg) from a standings entry."""
    all_info = rank.get("all") or {}
    played = max(all_info.get("played") or 1, 1)
    goals  = all_info.get("goals") or {}
    gf = (goals.get("for")     or 0) / played
    ga = (goals.get("against") or 0) / played
    return round(gf, 3), round(ga, 3)


async def _enrich_match(match: dict, league_id: int, season: int) -> dict:
    """Add real standings + form data to a match dict before prediction.

    Populates:
    - homeGoalsFor / homeGoalsAgainst / awayGoalsFor / awayGoalsAgainst
      (from standings goals-per-game → feeds Poisson xG model)
    - _tableProbs    → replaces neutral 1/3 in table component
    - _formProbs     → replaces neutral 1/3 in currentSeason component
    - _h2hProbs      → replaces neutral 1/3 in injuriesH2H component
                       (using head-to-head implied by both teams' form vs each other)
    """
    home_team_id = match.get("_teamHomeId") or match.get("homeTeamId") or match.get("home_id")
    away_team_id = match.get("_teamAwayId") or match.get("awayTeamId") or match.get("away_id")

    # Fetch standings and form concurrently
    tasks = [_fetch_standings_for_league(league_id, season)]
    if home_team_id:
        tasks.append(_fetch_team_form(home_team_id, league_id, season, last_n=7))
    if away_team_id:
        tasks.append(_fetch_team_form(away_team_id, league_id, season, last_n=7))

    results = await asyncio.gather(*tasks, return_exceptions=True)
    standings = results[0] if not isinstance(results[0], Exception) else []
    home_form = results[1] if len(results) > 1 and not isinstance(results[1], Exception) else []
    away_form = results[2] if len(results) > 2 and not isinstance(results[2], Exception) else []

    # Build team-id → rank lookup
    rank_by_id = {
        entry.get("team", {}).get("id"): entry
        for entry in standings
        if entry.get("team", {}).get("id")
    }

    home_rank = rank_by_id.get(home_team_id)
    away_rank = rank_by_id.get(away_team_id)
    total_teams = len(standings)

    enriched = dict(match)

    # 1. Feed real goals-per-game into Poisson xG inputs
    if home_rank:
        hgf, hga = _goals_per_game(home_rank)
        enriched["homeGoalsFor"]     = hgf if hgf > 0 else 1.35
        enriched["homeGoalsAgainst"] = hga if hga > 0 else 1.35
    if away_rank:
        agf, aga = _goals_per_game(away_rank)
        enriched["awayGoalsFor"]     = agf if agf > 0 else 1.35
        enriched["awayGoalsAgainst"] = aga if aga > 0 else 1.35

    # 2. Table component probabilities (from standings strength)
    enriched["_tableProbs"] = _standings_to_probs(home_rank, away_rank, total_teams)

    # 3. Current season form (last 5 games, recency-weighted)
    home_form_probs = _form_to_probs(home_form)
    away_form_probs = _form_to_probs(away_form)
    # Blend: home team's win prob vs away team's win prob (from their own perspectives)
    if home_form or away_form:
        hw = home_form_probs["homeWin"]  # home team's win rate
        aw = away_form_probs["homeWin"]  # away team's win rate (from their pov = away win)
        dh = home_form_probs["draw"]
        da = away_form_probs["draw"]
        total = hw + aw or 1
        draw_blended = (dh + da) / 2
        raw_hw = hw / total * (1 - draw_blended)
        raw_aw = aw / total * (1 - draw_blended)
        z = raw_hw + draw_blended + raw_aw or 1
        enriched["_formProbs"] = {
            "homeWin": raw_hw / z,
            "draw":    draw_blended / z,
            "awayWin": raw_aw / z,
        }
    else:
        enriched["_formProbs"] = {"homeWin": 1/3, "draw": 1/3, "awayWin": 1/3}

    # 4. H2H proxy: blend table and form signals
    #    (real H2H data would require extra API calls per fixture — too costly)
    tp = enriched["_tableProbs"]
    fp = enriched["_formProbs"]
    enriched["_h2hProbs"] = {
        k: (tp[k] * 0.6 + fp[k] * 0.4)
        for k in ("homeWin", "draw", "awayWin")
    }

    # 5. Win-rate qualification data (2026/27 season gate)
    home_wr, home_played = _team_win_rate(home_rank) if home_rank else (0.0, 0)
    away_wr, away_played = _team_win_rate(away_rank) if away_rank else (0.0, 0)
    enriched["_homeWinRate"]    = home_wr
    enriched["_awayWinRate"]    = away_wr
    enriched["_homeGamesPlayed"] = home_played
    enriched["_awayGamesPlayed"] = away_played
    enriched["_homeQualifies"]  = _team_qualifies(home_rank)
    enriched["_awayQualifies"]  = _team_qualifies(away_rank)
    # A fixture qualifies only when BOTH teams pass the win-rate threshold
    enriched["_bothTeamsQualify"] = enriched["_homeQualifies"] and enriched["_awayQualifies"]

    log.debug(
        "Enriched %s vs %s | table=%s form=%s goalsFor=%.2f/%.2f | "
        "winRates=%.0f%%/%.0f%% played=%d/%d qualify=%s",
        match.get("home"), match.get("away"),
        enriched["_tableProbs"], enriched["_formProbs"],
        enriched.get("homeGoalsFor", 1.35), enriched.get("awayGoalsFor", 1.35),
        home_wr * 100, away_wr * 100,
        home_played, away_played,
        enriched["_bothTeamsQualify"],
    )

    return enriched




def _prediction(m):
    """
    Unified Kasi Sports News prediction engine.

    Critical live-odds fix:
    - If live/pre-match bookmaker 1X2 exists, use no-vig bookmaker probabilities.
    - If bookmaker 1X2 is missing, use the statistical model probabilities.
    This prevents division-by-zero and still produces a prediction.
    """

    o = m.get("odds", {})
    stat = _poisson(m)

    # BOOKMAKER PROBABILITY
    if _valid_1x2(o):
        market = _novig(o)
        bookmaker_available = True
    else:
        market = stat["probs"]
        bookmaker_available = False

    # Use enriched real data if available, fall back to neutral/Poisson
    neutral = {"homeWin": 1 / 3, "draw": 1 / 3, "awayWin": 1 / 3}
    table_probs        = m.get("_tableProbs")  or neutral
    form_probs         = m.get("_formProbs")   or stat["probs"]
    h2h_probs          = m.get("_h2hProbs")    or neutral

    fused = v141_weight_prediction({
        "odds":          market,
        "ai":            stat["probs"],
        "table":         table_probs,
        "injuriesH2H":   h2h_probs,
        "lastSeason":    neutral,       # last season data not yet wired
        "currentSeason": form_probs,
    })["probabilities"]

    key = max(fused, key=fused.get)
    winner = (
        m.get("home")
        if key == "homeWin"
        else "Draw"
        if key == "draw"
        else m.get("away")
    )
    conf = round(fused[key] * 100)

    first_team = (
        m.get("home")
        if stat["xgHome"] >= stat["xgAway"]
        else m.get("away")
    )

    total_xg = stat["xgHome"] + stat["xgAway"] or 1
    home_score_first_prob = round(stat["xgHome"] / total_xg * 100)
    away_score_first_prob = 100 - home_score_first_prob

    markets = {
        "FT WINNER": {
            "pick": winner,
            "odds": o.get(key, 0),
            "probability": conf,
            "probabilityType": (
                "40% bookmaker + 20% AI + supporting model components"
                if bookmaker_available
                else "KasiScore model probabilities — bookmaker 1X2 unavailable"
            ),
        },
        "OVER 3.5": {
            "pick": "Over 3.5",
            "odds": o.get("over35", 0) or round(1 / max(stat["over35"], 0.01), 2),
            "probability": round(stat["over35"] * 100),
            "probabilityType": "Poisson + live fixture state",
        },
        "OVER 2.5": {
            "pick": "Over 2.5",
            "odds": o.get("over25", 0) or round(1 / max(stat["over25"], 0.01), 2),
            "probability": round(stat["over25"] * 100),
            "probabilityType": "Poisson + live fixture state",
        },
        "OVER 1.5": {
            "pick": "Over 1.5",
            "odds": o.get("over15", 0) or round(1 / max(stat["over15"], 0.01), 2),
            "probability": round(stat["over15"] * 100),
            "probabilityType": "Poisson + live fixture state",
        },
        "OVER 0.5": {
            "pick": "Over 0.5",
            "odds": o.get("over05", 0) or round(1 / max(stat["over05"], 0.01), 2),
            "probability": round(stat["over05"] * 100),
            "probabilityType": "Poisson + live fixture state",
        },
        "FIRST TEAM TO SCORE": {
            "pick": first_team,
            "odds": o.get("scoreFirst", 0),
            "probability": round(
                max(stat["xgHome"], stat["xgAway"]) / total_xg * 100
            ),
            "probabilityType": "Live score + statistics + model",
        },
        "BOTH TEAMS TO SCORE": {
            "pick": "Yes" if stat["btts"] >= 0.5 else "No",
            "odds": o.get("btts", 0),
            "probability": round(stat["btts"] * 100),
            "probabilityType": "Poisson joint probability",
        },
        "HALF TIME": {
            "pick": (
                m.get("home")
                if fused.get("homeWin", 0) >= fused.get("awayWin", 0)
                   and fused.get("homeWin", 0) >= fused.get("draw", 0)
                else "Draw"
                if fused.get("draw", 0) >= fused.get("awayWin", 0)
                else m.get("away")
            ),
            "odds": o.get("firstHalfHome", 0),
            "probabilities": {
                "home": round(fused.get("homeWin", 0) * 80, 1),
                "draw": min(round(fused.get("draw", 0) * 120, 1), 100),
                "away": round(fused.get("awayWin", 0) * 80, 1),
            },
            "probability": round(max(fused.values()) * 80),
            "probabilityType": "KasiScore model half-time proxy (80% of FT signal)",
        },
        "EXPECTED GOALSCORER": {
            "pick": "Player-level data where available",
            "odds": o.get("expectedGoalscorer", 0),
            "probability": 0,
            "probabilityType": "Player-level data required",
        },
        "COMBO": {
            "pick": f"{winner} + Over 2.5",
            "odds": 0,
            "probability": round(
                max(fused.values()) * stat["over25"] * 100
            ),
            "probabilityType": "Unified KasiScore model combination",
        },
    }

    advice = (
        "Live bookmaker odds fused with KasiScore model components."
        if bookmaker_available
        else "Live bookmaker 1X2 unavailable; KasiScore model prediction calculated from live fixture data."
    )

    return {
        "prediction": {
            "bestPick": winner,
            "winner": winner,
            "confidence": conf,
            "probabilities": {
                k: round(v * 100, 1)
                for k, v in fused.items()
            } | {
                "over35": round(stat["over35"] * 100, 1),
                "over25": round(stat["over25"] * 100, 1),
                "over15": round(stat["over15"] * 100, 1),
                "over05": round(stat["over05"] * 100, 1),
                "btts": round(stat["btts"] * 100, 1),
                "halfTimeHome": round(fused.get("homeWin", 0) * 80, 1),
                "halfTimeDraw": min(round(fused.get("draw", 0) * 120, 1), 100),
                "halfTimeAway": round(fused.get("awayWin", 0) * 80, 1),
                "firstTeamToScoreHome": home_score_first_prob,
                "firstTeamToScoreAway": away_score_first_prob,
                "firstTeamToScore": first_team,
            },
            "advice": advice,
            "bookmakerOddsUsed": bookmaker_available,
        },
        "markets": markets,
        "goalRating": {
            "homeExpectedGoals": round(stat["xgHome"], 2),
            "awayExpectedGoals": round(stat["xgAway"], 2),
            "expectedTotalGoals": round(
                stat["xgHome"] + stat["xgAway"], 2
            ),
            "over25Probability": round(stat["over25"] * 100),
            "over15Probability": round(stat["over15"] * 100),
            "over05Probability": round(stat["over05"] * 100),
            "bttsProbability": round(stat["btts"] * 100),
            "firstTeamToScore": first_team,
            "firstTeamToScoreHomeProbability": home_score_first_prob,
            "firstTeamToScoreAwayProbability": away_score_first_prob,
        },
    }

def _novig(o):
    values = [
        1 / float(o[k])
        for k in ("homeWin", "draw", "awayWin")
    ]
    total = sum(values) or 1
    return {
        "homeWin": values[0] / total,
        "draw": values[1] / total,
        "awayWin": values[2] / total,
    }

# ---------------------------------------------------------------------------
# LEAGUE HELPERS
# ---------------------------------------------------------------------------

def _resolve_league_id(league: str) -> int:
    try:
        return int(league)
    except ValueError:
        lid = LEAGUE_IDS.get(league)
        if lid is None:
            raise HTTPException(
                400,
                f"Unknown league: {league!r}. Known: {', '.join(sorted(LEAGUE_IDS))}",
            )
        return lid

def _league_name_from_id(lid: int, fallback: str) -> str:
    for name, value in LEAGUE_IDS.items():
        if value == lid:
            return name
    return fallback

# ---------------------------------------------------------------------------
# BACKGROUND TASKS / APP
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# LEARNING CYCLE — runs every 3 hours, re-scores pending predictions
# ---------------------------------------------------------------------------

def _adapt_weights_from_history(history: dict) -> dict:
    """
    Nudge prediction weights toward components that have been accurate.
    If a market has been consistently wrong, reduce its weight slightly.
    Weight changes are capped at ±20% of the base value per cycle.
    """
    weights = dict(_learning_state["adaptedWeights"])
    for market, rates in history.items():
        if len(rates) < 2:
            continue
        avg = sum(rates) / len(rates)
        # avg > 0.55 → component is reliable, small boost
        # avg < 0.45 → component is unreliable, small cut
        if market in weights:
            delta = (avg - 0.50) * 0.05        # max ±2.5% nudge per cycle
            cap = V141_PREDICTION_WEIGHTS[market] * 0.20
            weights[market] = max(
                V141_PREDICTION_WEIGHTS[market] * 0.60,
                min(V141_PREDICTION_WEIGHTS[market] * 1.40,
                    weights[market] + max(-cap, min(cap, delta)))
            )
    # Re-normalise so weights still sum to 1
    total = sum(weights.values()) or 1
    return {k: round(v / total, 4) for k, v in weights.items()}


async def _run_learning_cycle():
    """
    Core 3-hour learning cycle:
    0. Auto-resolve finished fixtures (fetches API-Football results for any
       pending prediction whose kickoff is >105 minutes in the past).
    1. Read all resolved results and compute per-market accuracy.
    2. Adapt prediction weights based on what has been accurate.
    3. Re-score every PENDING prediction using adapted weights.
    4. Update _learning_state for the dashboard.
    """
    global _learning_state
    now_utc = datetime.now(timezone.utc)
    log.info("Learning cycle starting (cycle #%d)", _learning_state["cycleCount"] + 1)
    _learning_state["status"] = "running"

    # ── 0. Auto-resolve finished fixtures ─────────────────────────────────────
    auto_resolved = 0
    try:
        cutoff_auto = (now_utc - timedelta(minutes=105)).strftime("%Y-%m-%d %H:%M")
        with v141_learning.connect() as conn:
            pending_rows = conn.execute(
                """
                SELECT id, fixture_id, home_team, away_team, kickoff, probabilities
                FROM predictions
                WHERE resolved=0
                  AND kickoff IS NOT NULL
                  AND kickoff <= ?
                ORDER BY kickoff DESC
                LIMIT 100
                """,
                (cutoff_auto,),
            ).fetchall()

        for prow in pending_rows:
            try:
                fid = prow["fixture_id"]
                # ── Use persistent cache first; only call API if not cached ──
                # This is the single biggest quota saver: when a fixture was
                # already fetched on match day its result is in SQLite and we
                # don't need another API call to resolve it.
                data = await _afoot_get("/fixtures", {"id": fid})
                resp = data.get("response", [])
                if not resp:
                    continue
                fx = resp[0]
                status_short = fx.get("fixture", {}).get("status", {}).get("short", "")
                if status_short not in ("FT", "AET", "PEN"):
                    continue
                goals = fx.get("goals", {})
                hg = goals.get("home")
                ag = goals.get("away")
                if hg is None or ag is None:
                    continue
                hg, ag = int(hg), int(ag)
                actual = "homeWin" if hg > ag else "awayWin" if ag > hg else "draw"
                probs_raw = json.loads(prow["probabilities"] or "{}")
                total_goals = hg + ag
                btts_actual = hg > 0 and ag > 0
                predicted_winner = (
                    "homeWin" if probs_raw.get("homeWin", 0) >= probs_raw.get("awayWin", 0)
                                 and probs_raw.get("homeWin", 0) >= probs_raw.get("draw", 0)
                    else "draw" if probs_raw.get("draw", 0) >= probs_raw.get("awayWin", 0)
                    else "awayWin"
                )
                market_accuracy = {
                    "predictedWinner": predicted_winner,
                    "actualResult": actual,
                    "winnerCorrect": predicted_winner == actual,
                    "over35Correct": (total_goals > 3) == (probs_raw.get("over35", 0) >= 50),
                    "over25Correct": (total_goals > 2) == (probs_raw.get("over25", 0) >= 50),
                    "over15Correct": (total_goals > 1) == (probs_raw.get("over15", 0) >= 50),
                    "over05Correct": (total_goals > 0) == (probs_raw.get("over05", 0) >= 50),
                    "bttsCorrect": btts_actual == (probs_raw.get("btts", 0) >= 50),
                    "totalGoals": total_goals,
                    "homeGoals": hg,
                    "awayGoals": ag,
                    "gradedAt": now_utc.isoformat(),
                    "autoResolved": True,
                }
                v141_learning.save_result(int(prow["id"]), fid, hg, ag, actual, market_accuracy)
                auto_resolved += 1
                log.info("Auto-resolved: %s v %s %d-%d → %s",
                         prow["home_team"], prow["away_team"], hg, ag, actual)
            except Exception as exc:
                log.debug("Auto-resolve skip fixture %s: %s", prow["fixture_id"], exc)
    except Exception as exc:
        log.warning("Learning cycle: auto-resolve error: %s", exc)

    _learning_state["lastAutoResolved"] = auto_resolved
    log.info("Learning cycle: auto-resolved %d finished fixtures", auto_resolved)

    # ── 1. Compute per-market accuracy from resolved results ──────────────────
    market_correct: dict[str, list[bool]] = {}
    try:
        with v141_learning.connect() as conn:
            rows = conn.execute(
                "SELECT market_accuracy FROM results WHERE market_accuracy IS NOT NULL"
            ).fetchall()
        for r in rows:
            try:
                ma = json.loads(r["market_accuracy"] or "{}")
                for key in ("over35Correct", "over25Correct", "over15Correct",
                            "over05Correct", "bttsCorrect", "winnerCorrect"):
                    val = ma.get(key)
                    if isinstance(val, bool):
                        market_correct.setdefault(key, []).append(val)
            except Exception:
                pass
    except Exception as exc:
        log.warning("Learning cycle: result read error: %s", exc)

    # Map market accuracy keys → weight component names
    # Map recorded market outcomes → which weight component they inform.
    # winnerCorrect  = the core 1X2 prediction — informs odds + ai + table + form
    # over25Correct  = goals model accuracy    — informs the Poisson/ai component
    # bttsCorrect    = joint goals probability — informs ai component
    # over15Correct  = goals model (low bar)   — informs currentSeason form
    # over35Correct  = goals model (high bar)  — informs lastSeason baseline
    # over05Correct  = near-certain market     — informs injuriesH2H (disruption signal)
    market_to_weight = {
        "winnerCorrect":  "odds",           # bookmaker accuracy
        "over25Correct":  "ai",             # Poisson model accuracy
        "bttsCorrect":    "table",          # table-strength accuracy proxy
        "over15Correct":  "currentSeason",  # form-based accuracy
        "over35Correct":  "lastSeason",     # conservative model accuracy
        "over05Correct":  "injuriesH2H",    # disruption/upset signal
    }
    history_rates: dict[str, list[float]] = {}
    for mk, bools in market_correct.items():
        wk = market_to_weight.get(mk)
        if wk:
            rate = sum(bools) / len(bools) if bools else 0.5
            history_rates.setdefault(wk, []).append(rate)

    # Merge into rolling history (keep last 10 cycles)
    for wk, rates in history_rates.items():
        hist = _learning_state["marketAccuracyHistory"].setdefault(wk, [])
        hist.extend(rates)
        _learning_state["marketAccuracyHistory"][wk] = hist[-10:]

    # ── 2. Adapt weights ──────────────────────────────────────────────────────
    if _learning_state["marketAccuracyHistory"]:
        new_weights = _adapt_weights_from_history(
            _learning_state["marketAccuracyHistory"]
        )
        _learning_state["adaptedWeights"] = new_weights
        log.info("Learning cycle: adapted weights → %s", new_weights)
    else:
        log.info("Learning cycle: no resolved results yet; keeping base weights")

    # ── 3. Re-score ALL unresolved predictions (no kickoff cutoff) ──────────
    # Re-scoring past games that haven't been auto-resolved yet is intentional:
    # it means any game that slipped through (e.g. yesterday's) still benefits
    # from the latest adapted weights before being auto-resolved next cycle.
    updated = 0
    improved = 0

    try:
        with v141_learning.connect() as conn:
            rows = conn.execute(
                """
                SELECT id, fixture_id, home_team, away_team, kickoff,
                       probabilities, odds, model_inputs, prediction, model_version
                FROM predictions
                WHERE resolved=0
                ORDER BY kickoff DESC, predicted_at DESC
                """,
            ).fetchall()
    except Exception as exc:
        log.warning("Learning cycle: pending read error: %s", exc)
        rows = []

    adapted = _learning_state["adaptedWeights"]

    for row in rows:
        try:
            probs_old = json.loads(row["probabilities"] or "{}")
            odds_data  = json.loads(row["odds"]  or "{}")
            model_in   = json.loads(row["model_inputs"] or "{}")

            # Reconstruct a minimal match dict so _poisson() can run
            match = {
                "home": row["home_team"] or "",
                "away": row["away_team"] or "",
                "odds": odds_data,
                "homeGoalsFor":      float(model_in.get("homeGoalsFor",    1.35)),  # neutral
                "homeGoalsAgainst":  float(model_in.get("homeGoalsAgainst",1.35)),  # neutral
                "awayGoalsFor":      float(model_in.get("awayGoalsFor",    1.35)),  # neutral
                "awayGoalsAgainst":  float(model_in.get("awayGoalsAgainst",1.35)),  # neutral
            }

            stat = _poisson(match)
            o    = odds_data

            # Use bookmaker no-vig if available, else Poisson
            if _valid_1x2(o):
                market_probs = _novig(o)
            else:
                market_probs = stat["probs"]

            neutral = {"homeWin": 1/3, "draw": 1/3, "awayWin": 1/3}

            # Build weighted components using adapted weights
            components = {
                "odds":          market_probs,
                "ai":            stat["probs"],
                "table":         neutral,
                "injuriesH2H":   neutral,
                "lastSeason":    neutral,
                "currentSeason": stat["probs"],
            }
            available = {
                k: v141_normalise_three_way(v)
                for k, v in components.items()
                if k in adapted
            }
            total_w = sum(adapted[k] for k in available) or 1
            effective = {k: adapted[k] / total_w for k in available}

            fused = {k: 0.0 for k in ("homeWin", "draw", "awayWin")}
            for name, p in available.items():
                for outcome in fused:
                    fused[outcome] += p[outcome] * effective[name]

            best_key  = max(fused, key=fused.get)
            new_conf  = round(fused[best_key] * 100)
            old_conf  = round(float(probs_old.get(best_key, 0)))

            total_xg = stat["xgHome"] + stat["xgAway"] or 1
            home_sf  = round(stat["xgHome"] / total_xg * 100)

            new_probs = {
                "homeWin":  round(fused["homeWin"] * 100, 1),
                "draw":     round(fused["draw"]    * 100, 1),
                "awayWin":  round(fused["awayWin"] * 100, 1),
                "over35":   round(stat["over35"] * 100, 1),
                "over25":   round(stat["over25"] * 100, 1),
                "over15":   round(stat["over15"] * 100, 1),
                "over05":   round(stat["over05"] * 100, 1),
                "btts":     round(stat["btts"]   * 100, 1),
                "halfTimeHome":  round(fused.get("homeWin", 0) * 80, 1),
                "halfTimeDraw":  min(round(fused.get("draw", 0) * 120, 1), 100),
                "halfTimeAway":  round(fused.get("awayWin", 0) * 80, 1),
                "firstTeamToScoreHome": home_sf,
                "firstTeamToScoreAway": 100 - home_sf,
                "firstTeamToScore": (
                    match["home"] if stat["xgHome"] >= stat["xgAway"] else match["away"]
                ),
                "_learningCycle": _learning_state["cycleCount"] + 1,
                "_adaptedWeights": adapted,
            }

            winner = (
                match["home"] if best_key == "homeWin"
                else "Draw" if best_key == "draw"
                else match["away"]
            )
            new_pred = {
                "bestPick": winner,
                "winner":   winner,
                "confidence": new_conf,
                "probabilities": new_probs,
                "bookmakerOddsUsed": _valid_1x2(o),
                "_refreshedByLearningCycle": True,
                "_cycleNumber": _learning_state["cycleCount"] + 1,
            }

            with v141_learning.connect() as conn:
                conn.execute(
                    """UPDATE predictions
                       SET probabilities=?, prediction=?, predicted_at=?, model_version=?
                       WHERE id=?""",
                    (
                        json.dumps(new_probs),
                        json.dumps(new_pred),
                        now_utc.isoformat(),
                        V141_MODEL_VERSION,   # rename old model versions to current
                        row["id"],
                    ),
                )
            updated += 1
            if abs(new_conf - old_conf) >= 1:
                improved += 1

        except Exception as exc:
            log.warning(
                "Learning cycle: re-score error fixture %s: %s",
                row["fixture_id"], exc
            )

    # ── 4. Update state ───────────────────────────────────────────────────────
    _learning_state.update({
        "lastRunAt":         now_utc.isoformat(),
        "nextRunAt":         (now_utc + timedelta(seconds=V141_LEARNING_CYCLE_SECS)).isoformat(),
        "cycleCount":        _learning_state["cycleCount"] + 1,
        "lastCycleUpdated":  updated,
        "lastCycleImproved": improved,
        "status":            "idle",
    })
    log.info(
        "Learning cycle done: %d re-scored, %d improved (cycle #%d)",
        updated, improved, _learning_state["cycleCount"]
    )


async def _background_learning_cycle():
    """Background task: wait 3 hours then run learning cycle indefinitely."""
    # Small initial delay so server is fully up before first cycle
    await asyncio.sleep(30)
    # Set next-run time immediately so dashboard can show it
    _learning_state["nextRunAt"] = (
        datetime.now(timezone.utc) + timedelta(seconds=V141_LEARNING_CYCLE_SECS - 30)
    ).isoformat()
    while True:
        await asyncio.sleep(V141_LEARNING_CYCLE_SECS)
        try:
            await _run_learning_cycle()
        except Exception as exc:
            log.warning("Background learning cycle error: %s", exc)
            _learning_state["status"] = "error"


async def _background_fixture_cleanup():
    while True:
        await asyncio.sleep(V141_FIXTURE_REFRESH_SECONDS)
        try:
            _fixtures_cache.clear()
            # Purge expired rows from the persistent SQLite cache
            _persistent_cache_purge_expired()
            # Plain format matches the "YYYY-MM-DD HH:MM" kickoff strings in the DB
            cutoff = (
                datetime.now(timezone.utc) - timedelta(hours=3)
            ).strftime("%Y-%m-%d %H:%M")
            with v141_learning.connect() as conn:
                rows = conn.execute(
                    """
                    SELECT id FROM predictions
                    WHERE resolved=0
                    AND kickoff IS NOT NULL
                    AND kickoff < ?
                    """,
                    (cutoff,),
                ).fetchall()
                if rows:
                    conn.executemany(
                        "UPDATE predictions SET resolved=1 WHERE id=?",
                        [(row["id"],) for row in rows],
                    )
        except Exception as exc:
            log.warning("Background fixture cleanup error: %s", exc)

async def _background_prediction_refresh():
    while True:
        await asyncio.sleep(V141_PREDICTION_REFRESH_SECS)
        try:
            v141_cache.clear()
        except Exception as exc:
            log.warning("Background prediction refresh error: %s", exc)

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    v141_learning.init()
    log.info("KasiScore v182 starting on port %d", PORT)
    log.info("API-Football key: %s", "SET" if API_KEY else "NOT SET")

    # Auto-seed admin account on every startup using env vars.
    # This means the admin account survives Render restarts even on the free
    # tier where the SQLite file is wiped — it is recreated within seconds.
    _admin_email = os.getenv("ADMIN_EMAIL", os.getenv("PAYMENT_ADMIN_EMAIL","")).strip().lower()
    _admin_password = os.getenv("ADMIN_PASSWORD","").strip()
    if _admin_email and _admin_password:
        try:
            _c = _auth_db()
            _ph = _pw(_admin_password)
            _existing = _c.execute("SELECT id,pro,role FROM users WHERE lower(email)=?",(_admin_email,)).fetchone()
            if _existing:
                _c.execute("UPDATE users SET password_hash=?,pro=1,role='admin',status='active' WHERE id=?",(_ph,_existing[0]))
                log.info("Admin account refreshed for %s", _admin_email)
            else:
                _c.execute("INSERT INTO users(email,password_hash,pro,role,status,created_at) VALUES(?,?,1,'admin','active',?)",
                           (_admin_email,_ph,datetime.now(timezone.utc).isoformat()))
                log.info("Admin account created for %s", _admin_email)
            _c.commit()
            _c.close()
        except Exception as _ex:
            log.error("Failed to seed admin account: %s", _ex)
    else:
        log.warning("ADMIN_EMAIL or ADMIN_PASSWORD not set — admin account not seeded")

    cleanup_task = asyncio.create_task(_background_fixture_cleanup())
    prediction_task = asyncio.create_task(_background_prediction_refresh())
    learning_task = asyncio.create_task(_background_learning_cycle())

    yield

    cleanup_task.cancel()
    prediction_task.cancel()
    learning_task.cancel()

    with contextlib.suppress(asyncio.CancelledError):
        await cleanup_task
    with contextlib.suppress(asyncio.CancelledError):
        await prediction_task
    with contextlib.suppress(asyncio.CancelledError):
        await learning_task

    global _http, _odds_api_http
    if _http and not _http.is_closed:
        await _http.aclose()
    if _odds_api_http and not _odds_api_http.is_closed:
        await _odds_api_http.aclose()

# Kasi Sports News v226 International SEO & Discoverability
app = FastAPI(
    title="Football Server",
    description="KasiScore Predictive Dashboard <-> API-Football",
    version="1.0.0",
    lifespan=lifespan,
)

# PWA manifest must be registered before SPA/dynamic routes.
# Returning JSON directly prevents index.html/404 fallbacks from being parsed as a manifest.
@app.get("/manifest.webmanifest", include_in_schema=False)
async def serve_manifest():
    manifest = {
        "name": "Kasi Sports News",
        "short_name": "Kasi Sports",
        "description": "Live sports scores, fixtures, news and predictive intelligence.",
        "start_url": "/",
        "scope": "/",
        "display": "standalone",
        "background_color": "#05080b",
        "theme_color": "#05080b",
        "icons": []
    }
    return Response(
        content=json.dumps(manifest, ensure_ascii=False),
        media_type="application/manifest+json",
        headers={"Cache-Control": "no-store, max-age=0"}
    )

# Google crawler assets must be registered before the generic /{lang} SEO route.
# Otherwise paths such as /robots.txt and /sitemap.xml are interpreted as a language slug
# and the SPA/HTML site is returned instead of text/XML.
@app.get("/robots.txt", include_in_schema=False)
def google_robots_txt():
    base = os.getenv("PUBLIC_SITE_URL", os.getenv("PUBLIC_APP_URL", "https://git-repoo-predictive.onrender.com")).rstrip("/")
    body = (
        "User-agent: *\n"
        "Allow: /\n"
        "Disallow: /admin\n"
        "Disallow: /auth\n"
        f"Sitemap: {base}/sitemap.xml\n"
    )
    return Response(content=body, media_type="text/plain; charset=utf-8", headers={"Cache-Control":"public, max-age=300"})

@app.get("/sitemap.xml", include_in_schema=False)
async def google_sitemap_xml():
    base = os.getenv("PUBLIC_SITE_URL", os.getenv("PUBLIC_APP_URL", "https://git-repoo-predictive.onrender.com")).rstrip("/")
    # Prefer the richer SEO registry when available at request time.
    rows = []
    if "_seo_dynamic_rows" in globals():
        try:
            rows = await _seo_dynamic_rows()
        except Exception as exc:
            log.warning("Google sitemap dynamic expansion failed: %s", exc)
    if not rows and "_seo_registry_pages" in globals():
        try:
            rows = _seo_registry_pages()
        except Exception as exc:
            log.warning("Google sitemap registry expansion failed: %s", exc)
    if not rows:
        rows = [{"path": p, "indexable": True} for p in ("/","/today","/weekend","/football","/rugby","/cricket","/tennis","/about","/contact","/privacy","/terms")]

    from xml.sax.saxutils import escape as _xml_safe
    today = datetime.now(timezone.utc).date().isoformat()
    seen = set()
    body = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for row in rows:
        path = str(row.get("path") or "").strip()
        if not path or not path.startswith("/") or path in seen or not row.get("indexable", True):
            continue
        seen.add(path)
        body.append(f"<url><loc>{_xml_safe(base + path)}</loc><lastmod>{today}</lastmod></url>")
    body.append("</urlset>")
    return Response(content="".join(body), media_type="application/xml; charset=utf-8", headers={"Cache-Control":"public, max-age=300, s-maxage=900"})


@app.middleware("http")
async def kasi_timing_middleware(request: Request, call_next):
    started=time.perf_counter()
    response=await call_next(request)
    ms=round((time.perf_counter()-started)*1000,1)
    response.headers["Server-Timing"]=f"app;dur={ms}"
    response.headers["X-Kasi-Response-Ms"]=str(ms)
    response.headers.setdefault("X-Content-Type-Options","nosniff")
    response.headers.setdefault("Referrer-Policy","strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy","camera=(), microphone=(), geolocation=()")
    response.headers.setdefault("X-Frame-Options","SAMEORIGIN")
    if request.url.path.startswith("/auth/"):
        response.headers["Cache-Control"]="no-store"
        response.headers["Pragma"]="no-cache"
    if request.url.scheme == "https":
        response.headers.setdefault("Strict-Transport-Security","max-age=31536000; includeSubDomains")
    if request.url.path in {"/live","/fixtures","/ai-predictions","/player/profile","/team/profile","/sports/news","/sports/scores"}:
        log.info("TIMING %s %.1fms status=%s",request.url.path,ms,response.status_code)
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# HEALTH
# ---------------------------------------------------------------------------


class AuthPayload(BaseModel):
    email: str = ""
    password: str
    identifier: str = ""
    username: str = ""
    phone: str = ""


def _norm_phone(value: str) -> str:
    v=(value or "").strip().replace(" ","").replace("-","").replace("(","").replace(")","")
    if v.startswith("00"): v="+"+v[2:]
    if v.startswith("0") and len(v)==10: v="+27"+v[1:]
    return v

@app.post("/auth/register")
def auth_register(p: AuthPayload, request: Request):
    _require_auth_rate(request,"auth-register",getattr(p,"email",""),limit=6,window=600)
    email=p.email.strip().lower(); username=p.username.strip().lower() or None; phone=_norm_phone(p.phone) or None
    if len(email)<5 or "@" not in email or len(p.password)<8: raise HTTPException(400,"Valid email and password of at least 8 characters required")
    c=_auth_db()
    try:
        ph=_pw(p.password); cur=c.execute("INSERT INTO users(email,password_hash,username,phone,created_at) VALUES(?,?,?,?,?)",(email,ph,username,phone,datetime.now(timezone.utc).isoformat())); c.commit()
        return {"token":_token(cur.lastrowid),"message":"Account created","email":email,"pro":False,"role":"user","username":username,"phone":phone}
    except sqlite3.IntegrityError: raise HTTPException(409,"Email, username or phone number already exists")
    finally:c.close()

@app.post("/auth/login")
def auth_login(p: AuthPayload, request: Request):
    import traceback as _tb
    try:
        _require_auth_rate(request,"auth-login",getattr(p,"email",""),limit=10,window=300)
        identifier=(p.identifier or p.email).strip(); phone=_norm_phone(identifier)
        c=_auth_db(); row=c.execute("SELECT id,email,password_hash,pro,username,phone,COALESCE(role,'user'),COALESCE(status,'active') FROM users WHERE lower(email)=lower(?) OR lower(username)=lower(?) OR phone=?",(identifier,identifier,phone)).fetchone()
        if row and row[7]!="active": c.close(); raise HTTPException(403,"Account disabled")
        if row: c.execute("UPDATE users SET last_login=? WHERE id=?",(datetime.now(timezone.utc).isoformat(),row[0])); c.commit()
        c.close()
        if not row: raise HTTPException(401,"Invalid email, username/phone or password")
        salt,stored=row[2].split("$",1)
        if not hmac.compare_digest(_pw(p.password,salt).split("$",1)[1],stored): raise HTTPException(401,"Invalid email, username/phone or password")
        configured_admin=os.getenv("ADMIN_EMAIL",os.getenv("PAYMENT_ADMIN_EMAIL","jbatuma@yahoo.com")).strip().lower()
        is_configured_admin=bool(configured_admin and str(row[1]).strip().lower()==configured_admin)
        effective_role="admin" if is_configured_admin else str(row[6] or "user").lower()
        effective_pro=True if is_configured_admin else bool(row[3])
        if is_configured_admin and (str(row[6] or "user").lower()!="admin" or not bool(row[3])):
            c=_auth_db()
            try:
                c.execute("UPDATE users SET pro=1, role='admin' WHERE id=?",(row[0],)); c.commit()
            finally:
                c.close()
        return {"token":_token(row[0]),"email":row[1],"username":row[4],"phone":row[5],"pro":effective_pro,"role":effective_role,"admin":effective_role=="admin"}
    except HTTPException:
        raise
    except Exception as _e:
        log.error("LOGIN 500 - full traceback:\n%s", _tb.format_exc())
        raise HTTPException(500, f"Login error: {type(_e).__name__}: {_e}")

@app.get("/auth/debug")
def auth_debug():
    import traceback as _tb
    result = {
        "auth_secret_set": bool(os.getenv("AUTH_SECRET","")),
        "admin_email_env": os.getenv("ADMIN_EMAIL", os.getenv("PAYMENT_ADMIN_EMAIL","NOT SET")),
        "auth_db_path": str(AUTH_DB),
        "auth_db_exists": AUTH_DB.exists(),
        "db_error": None,
        "user_count": None,
        "admin_exists": None,
        "admin_row": None,
    }
    try:
        c = _auth_db()
        result["user_count"] = c.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        admin_email = os.getenv("ADMIN_EMAIL", os.getenv("PAYMENT_ADMIN_EMAIL","jbatuma@yahoo.com")).strip().lower()
        admin_row = c.execute("SELECT id,email,pro,role FROM users WHERE lower(email)=?",(admin_email,)).fetchone()
        result["admin_exists"] = bool(admin_row)
        if admin_row:
            result["admin_row"] = {"id":admin_row[0],"email":admin_row[1],"pro":admin_row[2],"role":admin_row[3]}
        c.close()
    except Exception:
        result["db_error"] = _tb.format_exc()
    return result

@app.post("/auth/setup-admin")
def auth_setup_admin():
    """Create or reset admin account using ADMIN_EMAIL + ADMIN_PASSWORD env vars."""
    admin_email = os.getenv("ADMIN_EMAIL", os.getenv("PAYMENT_ADMIN_EMAIL","")).strip().lower()
    admin_password = os.getenv("ADMIN_PASSWORD","").strip()
    if not admin_email:
        raise HTTPException(400, "Set ADMIN_EMAIL environment variable on Render first")
    if not admin_password:
        raise HTTPException(400, "Set ADMIN_PASSWORD environment variable on Render first")
    c = _auth_db()
    try:
        ph = _pw(admin_password)
        existing = c.execute("SELECT id FROM users WHERE lower(email)=?",(admin_email,)).fetchone()
        if existing:
            c.execute("UPDATE users SET password_hash=?,pro=1,role='admin',status='active' WHERE id=?",(ph,existing[0]))
            msg = "Admin account updated"
            uid = existing[0]
        else:
            c.execute("INSERT INTO users(email,password_hash,pro,role,status,created_at) VALUES(?,?,1,'admin','active',?)",
                      (admin_email,ph,datetime.now(timezone.utc).isoformat()))
            c.commit()
            uid = c.execute("SELECT id FROM users WHERE lower(email)=?",(admin_email,)).fetchone()[0]
            msg = "Admin account created"
        c.commit()
        return {"message": msg, "email": admin_email, "token": _token(uid)}
    except Exception:
        import traceback as _tb2
        raise HTTPException(500, f"Setup error: {_tb2.format_exc()}")
    finally:
        c.close()


class PasswordResetPayload(BaseModel):
    email: str = ""
    identifier: str = ""
    token: str = ""
    password: str = ""

@app.post("/auth/forgot-password")
def auth_forgot_password(p: PasswordResetPayload, request: Request):
    _require_auth_rate(request,"auth-forgot-password",getattr(p,"email",""),limit=5,window=900)
    identifier=(p.identifier or p.email).strip(); phone=_norm_phone(identifier); c=_auth_db(); row=c.execute("SELECT id,email FROM users WHERE lower(email)=lower(?) OR phone=?",(identifier,phone)).fetchone()
    if not row: c.close(); return {"message":"If the account exists, recovery instructions have been sent."}
    email=row[1]; token=secrets.token_urlsafe(32); c.execute("UPDATE users SET reset_token=?,reset_expires=? WHERE id=?",(token,time.time()+1800,row[0])); c.commit(); c.close()
    result={"message":"If the account exists, recovery instructions have been sent."}; host=os.getenv("SMTP_HOST","").strip(); sender=os.getenv("SMTP_FROM",os.getenv("SMTP_USER","")).strip()
    if host and sender:
        try:
            link=os.getenv("PUBLIC_APP_URL","").rstrip("/")+"/?reset_token="+token+"&email="+email
            msg=EmailMessage();msg["Subject"]="Kasi Sports News password reset";msg["From"]=sender;msg["To"]=email;msg.set_content("Reset your Kasi Sports News password within 30 minutes:\n\n"+link+"\n\nIf you did not request this, ignore this email.")
            with smtplib.SMTP(host,int(os.getenv("SMTP_PORT","587")),timeout=15) as s:
                if os.getenv("SMTP_TLS","1")=="1":s.starttls()
                u=os.getenv("SMTP_USER","");pw=os.getenv("SMTP_PASSWORD","")
                if u and pw:s.login(u,pw)
                s.send_message(msg)
        except Exception as exc:log.warning("Password reset email failed: %s",exc)
    return result

@app.post("/auth/forgot-username")
def auth_forgot_username(p: PasswordResetPayload, request: Request):
    _require_auth_rate(request,"auth-forgot-username",getattr(p,"email",""),limit=5,window=900)
    identifier=(p.identifier or p.email).strip(); phone=_norm_phone(identifier); c=_auth_db(); row=c.execute("SELECT username,email FROM users WHERE lower(email)=lower(?) OR phone=?",(identifier,phone)).fetchone(); c.close()
    if not row: return {"message":"If the account exists, username recovery instructions have been sent."}
    username=row[0]
    if not username: return {"message":"Your account does not have a username. You can sign in with your email or phone number."}
    result={"message":"Username recovery instructions have been sent."}
    if os.getenv("RESET_DEV_MODE","0")=="1": result["username"]=username
    host=os.getenv("SMTP_HOST","").strip(); sender=os.getenv("SMTP_FROM",os.getenv("SMTP_USER","")).strip()
    if host and sender:
        try:
            msg=EmailMessage();msg["Subject"]="Kasi Sports News username recovery";msg["From"]=sender;msg["To"]=row[1];msg.set_content("Your Kasi Sports News username is: "+username)
            with smtplib.SMTP(host,int(os.getenv("SMTP_PORT","587")),timeout=15) as s:
                if os.getenv("SMTP_TLS","1")=="1":s.starttls()
                u=os.getenv("SMTP_USER","");pw=os.getenv("SMTP_PASSWORD","")
                if u and pw:s.login(u,pw)
                s.send_message(msg)
        except Exception as exc:log.warning("Username recovery email failed: %s",exc)
    return result

@app.post("/auth/reset-password")
def auth_reset_password(p: PasswordResetPayload):
    if len(p.password)<8 or not p.token:raise HTTPException(400,"Valid recovery token and password of at least 8 characters required")
    email=p.email.strip().lower();c=_auth_db();row=c.execute("SELECT id,reset_token,reset_expires FROM users WHERE email=?",(email,)).fetchone()
    if not row or not row[1] or not hmac.compare_digest(str(row[1]),p.token) or not row[2] or time.time()>float(row[2]):c.close();raise HTTPException(400,"Invalid or expired recovery token")
    c.execute("UPDATE users SET password_hash=?,reset_token=NULL,reset_expires=NULL WHERE id=?",(_pw(p.password),row[0]));c.commit();c.close();return {"message":"Password reset successfully"}

@app.get("/auth/me")
def auth_me(authorization: Optional[str]=Header(default=None)):
    return get_current_user(authorization)

@app.post("/auth/entitlement/{email}")
def set_entitlement(
    email: str,
    pro: bool = Query(...),
    role: str = Query("user"),
    admin_key: str = Query(...)
):
    expected_key = os.getenv("AUTH_ADMIN_KEY", "")
    if not expected_key or not hmac.compare_digest(admin_key, expected_key):
        raise HTTPException(403, "Forbidden")

    role = role.strip().lower()
    if role not in ("user", "admin"):
        raise HTTPException(400, "Role must be 'user' or 'admin'")

    email = email.strip().lower()
    c = _auth_db()
    try:
        cur = c.execute(
            "UPDATE users SET pro=?, role=? WHERE lower(email)=?",
            (1 if pro else 0, role, email)
        )
        c.commit()
        updated = cur.rowcount
    finally:
        c.close()

    if updated == 0:
        raise HTTPException(404, "User not found")

    return {
        "updated": updated,
        "email": email,
        "pro": pro,
        "role": role,
        "admin": role == "admin"
    }


_DISCOVERY_CACHE=TTLCache(maxsize=4,ttl=172800)
@app.get("/discover")
async def discover():
    cached=_DISCOVERY_CACHE.get("main")
    if cached:return cached
    leagues=[39,140,135,78,61]
    async def one(lid):
        try:return await _afoot_get("/players/topscorers",{"league":lid,"season":_current_season()})
        except Exception:return {"response":[]}
    raw=await asyncio.gather(*[one(x) for x in leagues])
    players=[];teams=[];sp=set();st=set()
    for d in raw:
        for r in d.get("response",[])[:8]:
            p=r.get("player") or {};s=(r.get("statistics") or [{}])[0];t=s.get("team") or {};lg=s.get("league") or {}
            if p.get("id") and p["id"] not in sp:
                sp.add(p["id"]);players.append({"id":p["id"],"name":p.get("name"),"photo":p.get("photo"),"team":t.get("name"),"teamId":t.get("id"),"position":(s.get("games") or {}).get("position"),"league":lg.get("name"),"goals":(s.get("goals") or {}).get("total")})
            if t.get("id") and t["id"] not in st:
                st.add(t["id"]);teams.append({"id":t["id"],"name":t.get("name"),"badge":t.get("logo"),"country":lg.get("country"),"league":lg.get("name")})
    rng=random.Random(int(time.time()//172800));rng.shuffle(players);rng.shuffle(teams)
    out={"players":players[:5],"teams":teams[:5]};_DISCOVERY_CACHE["main"]=out;return out

@app.get("/search")
async def global_search(q: str = Query(..., min_length=2), type: str = Query("auto"), limit: int = Query(12, ge=1, le=30)):
    q=q.strip();results=[]
    if type in ("auto","team"):
        d=await _afoot_get("/teams",{"search":q})
        for x in (d.get("response") or [])[:limit]:
            t=x.get("team") or {};results.append({"type":"team","id":t.get("id"),"name":t.get("name"),"country":t.get("country"),"logo":t.get("logo")})
    if type in ("auto","player"):
        d=await _afoot_get("/players",{"search":q,"season":datetime.now().year})
        for x in (d.get("response") or [])[:limit]:
            p=x.get("player") or {};st=(x.get("statistics") or [{}])[0] or {};results.append({"type":"player","id":p.get("id"),"name":p.get("name"),"nationality":p.get("nationality"),"photo":p.get("photo"),"team":(st.get("team") or {}).get("name")})
    return {"query":q,"type":type,"results":results[:limit],"source":"API-Football"}

@app.get("/production-readiness")
def production_readiness():
    checks={
        "apiFootballConfigured":bool(API_KEY),
        "oddsApiConfigured":bool(ODDS_API_KEY) if ODDS_API_ENABLED else True,
        "authSecretPersistent":bool(os.getenv("AUTH_SECRET","").strip()),
        "sportsDbEnabled":bool(SPORTS_DB_ENABLED),
        "authDbPersistentPath":str(AUTH_DB).startswith("/var/data/"),
        "sportsDbPersistentPath":str(SPORTS_DB_PATH).startswith("/var/data/"),
        "publicAppUrlConfigured":bool(os.getenv("PUBLIC_APP_URL","").strip()),
    }
    required=("apiFootballConfigured","authSecretPersistent","sportsDbEnabled","authDbPersistentPath","sportsDbPersistentPath")
    return {
        "readyForProductionBeta":all(checks[k] for k in required),
        "checks":checks,
        "liveRefreshSeconds":180,
        "fixtureRefreshSeconds":1800,
        "oddsRefreshSeconds":1800,
        "generatedAt":datetime.now(timezone.utc).isoformat(),
    }

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "api_key_set": bool(API_KEY),
        "version": "v183",
        "cache_sizes": {
            "fixtures": len(_fixtures_cache),
            "live": len(_live_cache),
            "odds": len(_odds_cache),
            "teams": len(_team_cache),
        },
        "quota": dict(_quota_state),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

# ---------------------------------------------------------------------------
# FIXTURES
# ---------------------------------------------------------------------------

@app.get("/fixtures")
async def fixtures(
    league: str = Query("ALL"),
    type: str = Query("today"),
    range: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    refresh: int = Query(0, ge=0, le=1),
):
    # v183: FastAPI Query(...) defaults are metadata objects when an endpoint
    # function is called directly from another Python endpoint. Normalise them
    # back to ordinary values so internal reuse cannot crash the provider flow.
    league = league if isinstance(league, str) else "ALL"
    type = type if isinstance(type, str) else "today"
    range = range if isinstance(range, str) else None
    date_from = date_from if isinstance(date_from, str) else None
    date_to = date_to if isinstance(date_to, str) else None
    refresh = int(refresh) if isinstance(refresh, (int, bool)) else 0

    # Backward-compatible frontend contract: /fixtures?range=today
    # is accepted and normalised to the canonical `type` parameter.
    if range:
        legacy = range.strip().lower()
        if legacy in {"today", "live", "upcoming"}:
            type = legacy
        elif legacy in {"tomorrow", "next"}:
            type = "upcoming"
            date_from = date_from or (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
            date_to = date_to or date_from
    type = type.strip().lower()

    bucket = (
        datetime.now().strftime("%Y-%m-%d-%H")
        + str(datetime.now().minute // 30)
    )
    # Include the requested date range in the key.  Without this, two
    # different upcoming windows could incorrectly share the same 30-minute
    # cache entry.
    cache_key = (
        f"fixtures:{league}:{type}:"
        f"{date_from or ''}:{date_to or ''}:{bucket}"
    )

    if not refresh:
        cached = _fixtures_cache.get(cache_key)
        if cached is not None:
            return cached

    today = datetime.now().strftime("%Y-%m-%d")
    season = _current_season()
    all_leagues = league.upper() == "ALL"

    if type == "live":
        params = {"live": "all"}
        if not all_leagues:
            params["league"] = _resolve_league_id(league)

        data = await _afoot_get("/fixtures", params)
        raw = data.get("response", [])
        normalised = [_normalise_fixture(f, "") for f in raw]

    elif all_leagues:
        all_raw = []

        for league_name in SCAN_LEAGUES:
            lid = LEAGUE_IDS.get(league_name)
            if lid is None:
                continue

            try:
                if type == "upcoming":
                    params = {
                        "from": date_from or today,
                        "to": date_to or (
                            datetime.now() + timedelta(days=7)
                        ).strftime("%Y-%m-%d"),
                        "timezone": TIMEZONE,
                        "season": season,
                        "league": lid,
                    }
                else:
                    params = {
                        "date": date_from or today,
                        "timezone": TIMEZONE,
                        "season": season,
                        "league": lid,
                    }

                data = await _afoot_get("/fixtures", params)
                all_raw.extend(data.get("response", []))
                await asyncio.sleep(0.15)

            except HTTPException as exc:
                log.warning(
                    "Fixtures ALL: %s failed — %s",
                    league_name,
                    exc.detail,
                )

        normalised = [_normalise_fixture(f, "") for f in all_raw]

        result = {
            "matches": normalised,
            "count": len(normalised),
            "source": "API-Football",
            "league": "ALL",
            "type": type,
            "scanned_leagues": SCAN_LEAGUES,
        }
        _fixtures_cache[cache_key] = result
        return result

    else:
        lid = _resolve_league_id(league)

        if type == "upcoming":
            params = {
                "from": date_from or today,
                "to": date_to or (
                    datetime.now() + timedelta(days=7)
                ).strftime("%Y-%m-%d"),
                "timezone": TIMEZONE,
                "season": season,
                "league": lid,
            }
        else:
            params = {
                "date": date_from or today,
                "timezone": TIMEZONE,
                "season": season,
                "league": lid,
            }

        data = await _afoot_get("/fixtures", params)
        raw = data.get("response", [])
        normalised = [
            _normalise_fixture(
                f,
                _league_name_from_id(lid, league),
            )
            for f in raw
        ]

    result = {
        "matches": normalised,
        "count": len(normalised),
        "source": "API-Football",
        "league": league,
        "type": type,
    }
    _fixtures_cache[cache_key] = result
    return result

# ---------------------------------------------------------------------------
# FRONTEND COMPATIBILITY ALIASES + MATCH STATS
# ---------------------------------------------------------------------------

@app.get("/predictions")
async def predictions_alias(
    limit: int = Query(100, ge=1, le=500),
    refresh: int = Query(0, ge=0, le=1),
    league: str = Query("ALL"),
    type: str = Query("upcoming"),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    """Canonical compatibility alias for the dashboard's /predictions path."""
    return await ai_predictions(
        limit=limit, refresh=refresh, league=league, type=type,
        date_from=date_from, date_to=date_to
    )

@app.get("/injuries")
async def injuries_alias(
    team: int = Query(0, ge=0),
    league: int = Query(0, ge=0),
    season: int = Query(0, ge=0),
):
    return await sports_injuries(team=team, league=league, season=season)

@app.get("/transfers")
async def transfers_alias(
    team: int = Query(0, ge=0),
    page: int = Query(1, ge=1, le=50),
):
    return await sports_transfers(team=team, page=page)

@app.get("/fixtures/{fixture_id}/stats")
async def fixture_stats(fixture_id: int):
    """Live/current match statistics for both fixtures and live matches, cached briefly to protect the provider quota."""
    ck=f"live-stats:{fixture_id}"
    cached=_live_stats_cache.get(ck)
    if cached is not None: return cached
    try:
        data = await _afoot_get("/fixtures/statistics", {"fixture": fixture_id})
        rows = data.get("response") or []
        result={"fixtureId": fixture_id,"count":len(rows),"statistics":rows,"available":bool(rows),"source":"API-Football","updatedAt":datetime.now(timezone.utc).isoformat()}
    except Exception as exc:
        # v188 fail-soft: a provider quota/rate-limit must not prevent the Stats UI from opening.
        log.warning("Fixture stats unavailable fixture=%s: %s", fixture_id, exc)
        result={"fixtureId":fixture_id,"count":0,"statistics":[],"available":False,"source":"API-Football","warning":"Statistics temporarily unavailable; try again shortly.","updatedAt":datetime.now(timezone.utc).isoformat()}
    _live_stats_cache[ck]=result
    return result



async def _fetch_team_form_detailed(team_id: int, league_id: int, season: int, last_n: int = 5):
    """Return the actual recent fixtures, not just W/D/L."""
    try:
        d = await _afoot_get("/fixtures", {
            "team": team_id, "league": league_id, "season": season,
            "status": "FT", "last": last_n,
        })
        return d.get("response", [])
    except Exception as exc:
        log.warning("Detailed form fetch failed team=%s: %s", team_id, exc)
        return []

@app.get("/fixtures/{fixture_id}/live-bundle")
async def fixture_live_bundle(fixture_id: int):
    """One frontend request for fixture + current stats + lineups. Upstream is limited to three cached calls."""
    fd,sd,ld,pd,ed=await asyncio.gather(
        _afoot_get("/fixtures", {"id":fixture_id}),
        fixture_stats(fixture_id),
        fixture_lineups(fixture_id),
        _afoot_get("/fixtures/players", {"fixture":fixture_id}),
        fixture_events(fixture_id),
        return_exceptions=True,
    )
    f=((fd.get("response") or [{}])[0] if isinstance(fd,dict) else {})
    return {
        "fixture":f,
        "statistics":sd.get("statistics",[]) if isinstance(sd,dict) else [],
        "lineups":ld.get("teams",[]) if isinstance(ld,dict) else [],
        "players":pd.get("response",[]) if isinstance(pd,dict) else [],
        "events":ed.get("events",[]) if isinstance(ed,dict) else [],
        "statisticsAvailable":bool(sd.get("statistics",[])) if isinstance(sd,dict) else False,
        "lineupsAvailable":bool(ld.get("teams",[])) if isinstance(ld,dict) else False,
        "playersAvailable":bool(pd.get("response",[])) if isinstance(pd,dict) else False,
        "source":"API-Football",
        "updatedAt":datetime.now(timezone.utc).isoformat(),
    }

@app.get("/match/{fixture_id}/stats")
async def match_stats_alias(fixture_id: int):
    return await fixture_stats(fixture_id)


@app.get("/fixtures/{fixture_id}/lineups")
async def fixture_lineups(fixture_id: int):
    """Starting XI, substitutes and player ratings for a fixture."""
    data = await _afoot_get("/fixtures/lineups", {"fixture": fixture_id})
    rows = data.get("response") or []
    teams = []
    for row in rows:
        team = row.get("team") or {}
        players = []
        for item in row.get("startXI") or []:
            players.append({"id": (item.get("player") or {}).get("id"), "name": (item.get("player") or {}).get("name"), "number": (item.get("player") or {}).get("number"), "pos": (item.get("player") or {}).get("pos"), "grid": (item.get("player") or {}).get("grid"), "starter": True})
        for item in row.get("substitutes") or []:
            players.append({"id": (item.get("player") or {}).get("id"), "name": (item.get("player") or {}).get("name"), "number": (item.get("player") or {}).get("number"), "pos": (item.get("player") or {}).get("pos"), "grid": (item.get("player") or {}).get("grid"), "starter": False})
        teams.append({"team": team, "coach": row.get("coach") or {}, "formation": row.get("formation"), "players": players})
    return {"fixtureId": fixture_id, "teams": teams, "source": "API-Football", "updatedAt": datetime.now(timezone.utc).isoformat()}

@app.get("/fixtures/{fixture_id}/players/{player_id}")
async def fixture_player_statistics(fixture_id: int, player_id: int):
    """Fast match-context player profile with fail-soft season enrichment."""
    async def safe(path,params):
        try:return await _afoot_get(path,params)
        except Exception as exc:
            log.debug("Match player optional call failed %s %s: %s",fixture_id,player_id,exc);return {}
    current=await safe("/fixtures/players",{"fixture":fixture_id})
    current_rows=current.get("response") or []
    current_player=None
    for teamrow in current_rows:
        for item in teamrow.get("players") or []:
            pl=item.get("player") or {}
            if int(pl.get("id") or 0)==player_id:
                current_player={"player":pl,"statistics":item.get("statistics") or [],"team":teamrow.get("team") or {}};break
        if current_player:break
    season=_current_season()
    aggregate,recent=await asyncio.gather(
        safe("/players",{"id":player_id,"season":season}),
        safe("/fixtures",{"player":player_id,"season":season,"last":20}),
    )
    rows=aggregate.get("response") or []
    profile=rows[0] if rows else {"player":(current_player or {}).get("player") or {},"statistics":[]}
    return {"fixtureId":fixture_id,"playerId":player_id,"currentGame":current_player or {"player":{},"statistics":[],"team":{}},"season":season,"seasonStatistics":profile.get("statistics") or [],"player":profile.get("player") or (current_player or {}).get("player") or {},"recentMatches":recent.get("response") or [],"source":"API-Football · match context","updatedAt":datetime.now(timezone.utc).isoformat()}


@app.get("/fixtures/{fixture_id}/events")
async def fixture_events(fixture_id: int):
    """Timeline events used by the match Details/Commentary panels."""
    data = await _afoot_get("/fixtures/events", {"fixture": fixture_id})
    events = []
    for x in data.get("response") or []:
        team = x.get("team") or {}
        player = x.get("player") or {}
        assist = x.get("assist") or {}
        events.append({
            "time": x.get("time") or {},
            "type": x.get("type") or "",
            "detail": x.get("detail") or "",
            "comments": x.get("comments") or "",
            "team": {"id": team.get("id"), "name": team.get("name"), "logo": team.get("logo")},
            "player": {"id": player.get("id"), "name": player.get("name")},
            "assist": {"id": assist.get("id"), "name": assist.get("name")},
        })
    return {"fixtureId": fixture_id, "events": events, "source": "API-Football",
            "updatedAt": datetime.now(timezone.utc).isoformat()}


@app.get("/fixtures/{fixture_id}/odds-detail")
async def fixture_odds_detail(fixture_id: int):
    """All useful bookmaker markets for a match, with Odds API fallback."""
    try:
        data = await _afoot_get_deadline("/odds", {"fixture": fixture_id}, ODDS_API_TIMEOUT)
        bookmakers = []
        for item in data.get("response") or []:
            bk = item.get("bookmaker") or {}
            markets = []
            for bet in item.get("bets") or []:
                values = [{"value": v.get("value"), "odd": v.get("odd")} for v in bet.get("values") or []]
                if values:
                    markets.append({"id": bet.get("id"), "name": bet.get("name"), "values": values})
            if markets:
                bookmakers.append({"id": bk.get("id"), "name": bk.get("name"), "markets": markets})
        preferred = {"Pinnacle":0,"Bet365":1,"1xBet":2,"William Hill":3,"Unibet":4,"Bwin":5}
        bookmakers.sort(key=lambda x: preferred.get(x["name"],99))
        selected = next((b for b in bookmakers if any(m["values"] for m in b["markets"])), None)
        if bookmakers:
            return {"fixtureId": fixture_id, "selected": selected, "bookmakers": bookmakers[:12], "source":"API-Football", "updatedAt":datetime.now(timezone.utc).isoformat()}
    except Exception as exc:
        log.warning("odds-detail primary failed for %s: %s", fixture_id, exc)

    if ODDS_API_ENABLED and ODDS_API_KEY:
        meta = _fixture_meta_cache.get(str(fixture_id), {})
        try:
            sport_key = _odds_api_sport_key(meta.get("league", "")) or "soccer_epl"
            events = await _odds_api_get(f"/sports/{sport_key}/odds", {"regions": ODDS_API_REGIONS, "markets": ODDS_API_MARKETS, "oddsFormat":"decimal"})
            for event in events if isinstance(events, list) else []:
                if not _event_matches_fixture(event, meta):
                    continue
                bookmakers=[]
                for bk in event.get("bookmakers") or []:
                    markets=[]
                    for market in bk.get("markets") or []:
                        values=[{"value":o.get("name"),"odd":o.get("price")} for o in market.get("outcomes") or []]
                        if values:
                            markets.append({"id":market.get("key"),"name":market.get("key"),"values":values})
                    if markets:
                        bookmakers.append({"id":bk.get("key"),"name":bk.get("title"),"markets":markets})
                selected=bookmakers[0] if bookmakers else None
                return {"fixtureId":fixture_id,"selected":selected,"bookmakers":bookmakers[:12],"source":"The Odds API","fallback":True,"oddsApiEventId":event.get("id"),"updatedAt":datetime.now(timezone.utc).isoformat()}
        except Exception as exc:
            log.warning("odds-detail fallback failed for %s: %s", fixture_id, exc)

    return {"fixtureId":fixture_id,"selected":None,"bookmakers":[],"source":"Unavailable","updatedAt":datetime.now(timezone.utc).isoformat()}



@app.get("/sports/videos")
async def sports_videos(
    sport: str = Query("football"),
    q: str = Query(""),
    limit: int = Query(6, ge=1, le=12),
):
    """Return recent YouTube search-feed videos without requiring a YouTube API key."""
    sport = sport.lower().strip()
    search = q.strip() or {
        "football": "football match highlights goals today",
        "rugby": "rugby match highlights Springboks URC Bulls Stormers",
        "cricket": "cricket match highlights Proteas SA20",
    }.get(sport, f"{sport} sports highlights")
    url = "https://www.youtube.com/feeds/videos.xml?search_query=" + urllib.parse.quote(search)
    try:
        c = await _sports_client()
        r = await c.get(url, headers={"User-Agent":"Mozilla/5.0 (compatible; KasiScore/1790)"})
        r.raise_for_status()
        root = ET.fromstring(r.text)
        ns={"yt":"http://www.youtube.com/xml/schemas/2015","media":"http://search.yahoo.com/mrss/","atom":"http://www.w3.org/2005/Atom"}
        items=[]
        for entry in root.findall("atom:entry",ns)[:limit]:
            vid=(entry.findtext("yt:videoId",default="",namespaces=ns) or "").strip()
            title=(entry.findtext("atom:title",default="",namespaces=ns) or "").strip()
            published=(entry.findtext("atom:published",default="",namespaces=ns) or "").strip()
            link_el=entry.find("atom:link",ns)
            link=link_el.attrib.get("href","") if link_el is not None else (f"https://www.youtube.com/watch?v={vid}" if vid else "")
            thumb=f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg" if vid else ""
            items.append({"id":vid,"title":title,"published":published,"link":link,"image":thumb,"source":"YouTube"})
        return {"sport":sport,"query":search,"count":len(items),"items":items,"source":"YouTube RSS","updatedAt":datetime.now(timezone.utc).isoformat()}
    except Exception as exc:
        log.warning("Video provider unavailable: %s", exc)
        return {"sport":sport,"query":search,"count":0,"items":[],"source":"YouTube RSS","error":str(exc)}

@app.get("/news/home")
async def home_news(limit: int = Query(24, ge=6, le=60)):
    """Fast multi-publisher football headlines with publisher-supplied thumbnails where available."""
    BIG_TEAMS = "Liverpool OR Chelsea OR Arsenal OR Manchester United OR Manchester City OR Barcelona OR Real Madrid OR Bayern Munich OR PSG OR Juventus OR Inter Milan OR AC Milan OR Atletico Madrid OR Borussia Dortmund"
    feeds=[
        ("GOAL", "https://www.goal.com/en-za/news?fmt=rss"),
        ("Metro", "https://metro.co.uk/sport/football/feed/"),
        ("LiveScore", "https://www.livescore.com/en/news/"),
        ("Soccer Laduma", "https://www.soccerladuma.co.za/feed/"),
    ]
    fallback_queries = {
        "GOAL": f"site:goal.com ({BIG_TEAMS}) football news -en-us",
        "Metro": f"site:metro.co.uk/sport/football ({BIG_TEAMS})",
        "LiveScore": f"site:livescore.com/en/news ({BIG_TEAMS}) football",
        "Soccer Laduma": "site:soccerladuma.co.za football",
    }
    per=max(6,min(14,limit//4+3))
    async def load(label,url):
        try:
            items = await _publisher_rss(url,label,per)
            if items: return items
            raise ValueError("empty feed")
        except Exception as exc:
            log.debug("Publisher RSS %s unavailable (%s), falling back to Google News",label,exc)
            query = fallback_queries.get(label, f"site:goal.com {label} football {BIG_TEAMS}")
            try:
                rows=await _google_news(query,per)
                for x in rows: x["publisher"]=label
                return rows
            except Exception:
                return []
    groups=await asyncio.gather(*(load(*x) for x in feeds))
    items=[item for group in groups for item in group]
    # Deduplicate by title prefix
    seen=set(); deduped=[]
    for it in items:
        key=(it.get("title") or "")[:60].lower()
        if key not in seen: seen.add(key); deduped.append(it)
    deduped.sort(key=lambda x:x.get("published","") or "", reverse=True)
    return {"count":len(deduped[:limit]),"items":deduped[:limit],"sources":[x[0] for x in feeds],"updatedAt":datetime.now(timezone.utc).isoformat()}

@app.get("/fixtures/{fixture_id}/insights")
async def fixture_insights(fixture_id: int, lite: int = Query(0, ge=0, le=1)):
    """Complete match intelligence; lite=1 returns only the fixture envelope to avoid quota-heavy fan-out on live pages."""
    """Complete pre-match intelligence for a fixture.

    Returns the fixture context plus team form, H2H, injuries/suspensions,
    standings and bookmaker markets. This is deliberately separate from the
    prediction gate: a fixture can display its intelligence even when it has
    no qualifying 1X2 bookmaker odds.
    """
    fd = await _afoot_get("/fixtures", {"id": fixture_id})
    fixtures = fd.get("response") or []
    if not fixtures:
        raise HTTPException(status_code=404, detail="Fixture not found")

    f = fixtures[0]
    if lite:
        return {"fixture": f, "source":"API-Football", "generatedAt":datetime.now(timezone.utc).isoformat()}
    teams = f.get("teams") or {}
    league = f.get("league") or {}
    home = teams.get("home") or {}
    away = teams.get("away") or {}
    home_id = home.get("id")
    away_id = away.get("id")
    league_id = league.get("id")
    season = int(league.get("season") or _current_season())

    # Fetch all contextual data concurrently where possible.
    tasks = {}
    if home_id:
        tasks["home_form"] = _fetch_team_form_detailed(home_id, league_id, season, 10)
        tasks["home_injuries"] = _afoot_get("/injuries", {"team": home_id, "season": season})
    if away_id:
        tasks["away_form"] = _fetch_team_form_detailed(away_id, league_id, season, 10)
        tasks["away_injuries"] = _afoot_get("/injuries", {"team": away_id, "season": season})
    if home_id and away_id:
        tasks["h2h"] = _afoot_get(
            "/fixtures/headtohead",
            {"h2h": f"{home_id}-{away_id}", "last": 10},
        )
    if league_id:
        tasks["standings"] = _fetch_standings_for_league(league_id, season)

    tasks["odds"] = _afoot_get("/odds", {"fixture": fixture_id})

    keys = list(tasks)
    values = await asyncio.gather(
        *(tasks[k] for k in keys), return_exceptions=True
    )
    data = {
        k: (v if not isinstance(v, Exception) else None)
        for k, v in zip(keys, values)
    }

    def result_rows(items, team_id):
        out = []
        for x in (items or []):
            ts = x.get("teams") or {}
            gh = (x.get("goals") or {}).get("home")
            ga = (x.get("goals") or {}).get("away")
            opponent = (
                (ts.get("away") or {}).get("name")
                if (ts.get("home") or {}).get("id") == team_id
                else (ts.get("home") or {}).get("name")
            )
            is_home = (ts.get("home") or {}).get("id") == team_id
            gf, gc = (gh or 0, ga or 0) if is_home else (ga or 0, gh or 0)
            res = "W" if gf > gc else "D" if gf == gc else "L"
            out.append({
                "fixtureId": (x.get("fixture") or {}).get("id"),
                "date": (x.get("fixture") or {}).get("date"),
                "opponent": opponent,
                "home": (ts.get("home") or {}).get("name"),
                "away": (ts.get("away") or {}).get("name"),
                "score": f"{gf}-{gc}",
                "result": res,
                "goalsFor": gf,
                "goalsAgainst": gc,
            })
        return out

    home_form = data.get("home_form") or []
    away_form = data.get("away_form") or []
    h2h_raw = data.get("h2h") or {}
    h2h_items = h2h_raw.get("response", []) if isinstance(h2h_raw, dict) else []

    def h2h_summary(items):
        hw = dr = aw = btts = over25 = 0
        meetings = []
        for x in items:
            ts = x.get("teams") or {}
            gh = (x.get("goals") or {}).get("home")
            ga = (x.get("goals") or {}).get("away")
            if gh is None or ga is None:
                continue
            hi = (ts.get("home") or {}).get("id") == home_id
            a = int(gh); b = int(ga)
            if hi:
                hw += a > b; aw += a < b
            else:
                hw += a < b; aw += a > b
            dr += a == b
            btts += a > 0 and b > 0
            over25 += a + b > 2
            meetings.append({
                "date": (x.get("fixture") or {}).get("date"),
                "home": (ts.get("home") or {}).get("name"),
                "away": (ts.get("away") or {}).get("name"),
                "score": f"{a}-{b}",
            })
        n = len(meetings) or 1
        return {
            "played": len(meetings),
            "homeWins": hw,
            "draws": dr,
            "awayWins": aw,
            "bttsPct": round(btts * 100 / n, 1),
            "over25Pct": round(over25 * 100 / n, 1),
            "meetings": meetings,
        }

    odds_raw = data.get("odds") or {}
    bookmaker_rows = odds_raw.get("response", []) if isinstance(odds_raw, dict) else []
    bookmaker_options = []
    selected_odds = {}
    preferred = {"Pinnacle": 0, "Bet365": 1, "1xBet": 2, "William Hill": 3,
                 "Unibet": 5, "Bwin": 6, "Ladbrokes": 7, "Coral": 8, "Paddy Power": 9}

    for item in bookmaker_rows:
        bk = item.get("bookmaker") or {}
        name = bk.get("name") or "Unknown"
        norm = _normalise_odds([bk])
        valid = _valid_1x2(norm)
        bookmaker_options.append({
            "id": bk.get("id"),
            "name": name,
            "valid1x2": valid,
            "odds": norm,
        })
    bookmaker_options.sort(key=lambda x: preferred.get(x["name"], 99))
    for bk in bookmaker_options:
        if bk["valid1x2"]:
            selected_odds = bk["odds"]
            break

    standings = data.get("standings") or []
    home_table = next((x for x in standings if (x.get("team") or {}).get("id") == home_id), None)
    away_table = next((x for x in standings if (x.get("team") or {}).get("id") == away_id), None)

    def injury_rows(raw):
        items = raw.get("response", []) if isinstance(raw, dict) else []
        return [{
            "player": (x.get("player") or {}).get("name"),
            "type": (x.get("player") or {}).get("type"),
            "reason": (x.get("player") or {}).get("reason"),
            "date": x.get("date"),
        } for x in items]

    return {
        "fixture": {
            "id": fixture_id,
            "date": (f.get("fixture") or {}).get("date"),
            "timezone": (f.get("fixture") or {}).get("timezone"),
            "status": (f.get("fixture") or {}).get("status"),
            "venue": (f.get("fixture") or {}).get("venue"),
            "referee": (f.get("fixture") or {}).get("referee"),
            "home": home,
            "away": away,
            "league": league,
        },
        "form": {
            "home": {"team": home, "last10": result_rows(home_form, home_id)},
            "away": {"team": away, "last10": result_rows(away_form, away_id)},
        },
        "h2h": h2h_summary(h2h_items),
        "injuries": {
            "home": injury_rows(data.get("home_injuries")),
            "away": injury_rows(data.get("away_injuries")),
        },
        "standings": {
            "home": home_table,
            "away": away_table,
            "totalTeams": len(standings),
        },
        "bookmakers": {
            "selected": next((x["name"] for x in bookmaker_options if x["valid1x2"]), None),
            "selectedOdds": selected_odds,
            "available": bookmaker_options,
        },
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": "API-Football",
    }

# ---------------------------------------------------------------------------
# LIVE — IMPORTANT: NOW RUNS _prediction()
# ---------------------------------------------------------------------------


_TEAM_BADGE_CACHE=TTLCache(maxsize=1000,ttl=86400)

@app.get("/sports/football/team-badge/{team_id}")
async def football_team_badge(team_id:int):
    if team_id<=0: raise HTTPException(404,"Unknown team")
    cached=_TEAM_BADGE_CACHE.get(team_id)
    if cached:
        content,ct=cached
        return Response(content=content,media_type=ct,headers={"Cache-Control":"public, max-age=86400"})
    url=f"https://media.api-sports.io/football/teams/{team_id}.png"
    try:
        c=await _sports_client()
        r=await c.get(url,timeout=httpx.Timeout(5,connect=2),follow_redirects=True)
        r.raise_for_status()
        ct=r.headers.get("content-type","image/png")
        if not ct.startswith("image/"): raise HTTPException(404,"Badge unavailable")
        content=r.content
        if len(content)>1_000_000: raise HTTPException(413,"Badge too large")
        _TEAM_BADGE_CACHE[team_id]=(content,ct)
        return Response(content=content,media_type=ct,headers={"Cache-Control":"public, max-age=86400"})
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(404,"Badge unavailable")


def _public_slug(name:str)->str:
    return re.sub(r"[^a-z0-9]+","-",str(name or "").lower()).strip("-") or "profile"
def _public_token(kind:str,pid:int)->str:
    raw=int(pid).to_bytes(4,"big"); secret=os.getenv("PUBLIC_ID_SECRET",os.getenv("SECRET_KEY","kasi-public")).encode()
    sig=hmac.new(secret,(kind+":").encode()+raw,hashlib.sha256).digest()[:6]
    return base64.urlsafe_b64encode(raw+sig).decode().rstrip("=")
def _public_ref(kind:str,pid:int,name:str)->str:return f"{_public_slug(name)}--{_public_token(kind,pid)}"
def _public_decode(kind:str,ref:str)->int:
    try:
        tok=str(ref).rsplit("--",1)[-1];blob=base64.urlsafe_b64decode(tok+"="*((4-len(tok)%4)%4));raw,sig=blob[:4],blob[4:10]
        secret=os.getenv("PUBLIC_ID_SECRET",os.getenv("SECRET_KEY","kasi-public")).encode();good=hmac.new(secret,(kind+":").encode()+raw,hashlib.sha256).digest()[:6]
        if len(raw)!=4 or not hmac.compare_digest(sig,good):raise ValueError()
        return int.from_bytes(raw,"big")
    except Exception:raise HTTPException(404,"Profile not found")

# ---------------------------------------------------------------------------
# Kasi Sports SQL data layer (v216)
# Provider IDs remain internal. Public pages/search use opaque public refs.
# Reads are SQL-first; scheduled/provider sync refreshes stale snapshots.
# ---------------------------------------------------------------------------
# Render-safe sports database configuration.
# Prefer SPORTS_DB_PATH when configured (for example /var/data/kasi_sports.db
# when a Render persistent disk is mounted). If that location cannot be
# created/written, fall back to a writable local data directory so a database
# path problem never prevents the whole API from starting.
_SPORTS_DB_CONFIGURED = os.getenv("SPORTS_DB_PATH", "").strip()
SPORTS_DB_ENABLED=os.getenv("SPORTS_DB_ENABLED","1").strip().lower() not in {"0","false","no"}
SPORTS_DB_FALLBACK = False
SPORTS_DB_INIT_ERROR = None

def _resolve_sports_db_path():
    global SPORTS_DB_FALLBACK
    preferred = Path(_SPORTS_DB_CONFIGURED) if _SPORTS_DB_CONFIGURED else (BASE_DIR / "kasi_sports.db")
    try:
        preferred.parent.mkdir(parents=True, exist_ok=True)
        # Verify the directory is actually writable before SQLite opens it.
        probe = preferred.parent / ".kasi_sports_write_test"
        probe.touch(exist_ok=True)
        probe.unlink(missing_ok=True)
        return preferred
    except (OSError, PermissionError):
        SPORTS_DB_FALLBACK = True
        fallback_dir = BASE_DIR / "data"
        try:
            fallback_dir.mkdir(parents=True, exist_ok=True)
            return fallback_dir / "kasi_sports.db"
        except (OSError, PermissionError):
            # /tmp is writable on Render/Linux but is ephemeral. This final
            # fallback keeps the service online until persistent storage is fixed.
            fallback_dir = Path("/tmp") / "kasi-sports-news"
            fallback_dir.mkdir(parents=True, exist_ok=True)
            return fallback_dir / "kasi_sports.db"

SPORTS_DB_PATH = _resolve_sports_db_path()

def _sports_db():
    SPORTS_DB_PATH.parent.mkdir(parents=True,exist_ok=True)
    con=sqlite3.connect(str(SPORTS_DB_PATH),timeout=20,check_same_thread=False)
    con.row_factory=sqlite3.Row
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("PRAGMA synchronous=NORMAL")
    con.execute("PRAGMA busy_timeout=20000")
    return con

def _sports_db_init():
    if not SPORTS_DB_ENABLED:return
    with _sports_db() as db:
        db.executescript("""
        CREATE TABLE IF NOT EXISTS teams(
          provider_id INTEGER PRIMARY KEY,name TEXT NOT NULL,code TEXT,country TEXT,
          founded INTEGER,national INTEGER,badge TEXT,venue_json TEXT,
          public_ref TEXT NOT NULL UNIQUE,provider_updated_at TEXT,synced_at TEXT NOT NULL);
        CREATE INDEX IF NOT EXISTS idx_teams_name ON teams(name COLLATE NOCASE);
        CREATE TABLE IF NOT EXISTS players(
          provider_id INTEGER PRIMARY KEY,name TEXT NOT NULL,firstname TEXT,lastname TEXT,
          age INTEGER,birth_date TEXT,birth_place TEXT,birth_country TEXT,nationality TEXT,
          height TEXT,weight TEXT,injured INTEGER,photo TEXT,public_ref TEXT NOT NULL UNIQUE,
          provider_updated_at TEXT,synced_at TEXT NOT NULL);
        CREATE INDEX IF NOT EXISTS idx_players_name ON players(name COLLATE NOCASE);
        CREATE TABLE IF NOT EXISTS leagues(
          provider_id INTEGER NOT NULL,season INTEGER NOT NULL,name TEXT,country TEXT,logo TEXT,flag TEXT,
          synced_at TEXT NOT NULL,PRIMARY KEY(provider_id,season));
        CREATE TABLE IF NOT EXISTS team_leagues(
          team_id INTEGER NOT NULL,league_id INTEGER NOT NULL,season INTEGER NOT NULL,
          rank INTEGER,points INTEGER,form TEXT,stats_json TEXT,synced_at TEXT NOT NULL,
          PRIMARY KEY(team_id,league_id,season));
        CREATE TABLE IF NOT EXISTS player_teams(
          player_id INTEGER NOT NULL,team_id INTEGER NOT NULL,season INTEGER NOT NULL,
          number INTEGER,position TEXT,synced_at TEXT NOT NULL,
          PRIMARY KEY(player_id,team_id,season));
        CREATE TABLE IF NOT EXISTS player_season_stats(
          player_id INTEGER NOT NULL,team_id INTEGER NOT NULL,league_id INTEGER NOT NULL,season INTEGER NOT NULL,
          stats_json TEXT NOT NULL,synced_at TEXT NOT NULL,
          PRIMARY KEY(player_id,team_id,league_id,season));
        CREATE TABLE IF NOT EXISTS injuries(
          player_id INTEGER NOT NULL,team_id INTEGER NOT NULL,league_id INTEGER NOT NULL DEFAULT 0,
          season INTEGER NOT NULL,date TEXT,type TEXT,reason TEXT,payload_json TEXT,synced_at TEXT NOT NULL,
          PRIMARY KEY(player_id,team_id,league_id,season,date,type));
        CREATE TABLE IF NOT EXISTS team_fixtures(
          fixture_id INTEGER PRIMARY KEY,team_id INTEGER NOT NULL,season INTEGER,payload_json TEXT NOT NULL,
          fixture_date TEXT,synced_at TEXT NOT NULL);
        CREATE INDEX IF NOT EXISTS idx_tf_team_date ON team_fixtures(team_id,fixture_date DESC);
        CREATE TABLE IF NOT EXISTS sync_state(
          sync_key TEXT PRIMARY KEY,last_success_at TEXT,last_attempt_at TEXT,status TEXT,
          records INTEGER DEFAULT 0,error TEXT,next_due_at TEXT);
        """)

def _db_json(v):
    try:return json.dumps(v,ensure_ascii=False,separators=(",",":"))
    except Exception:return "{}"

def _db_load(v,default=None):
    try:return json.loads(v) if v else (default if default is not None else {})
    except Exception:return default if default is not None else {}

def _sync_hours(now=None):
    """6h on Tue/Wed/Thu and weekends; 12h on Mon/Fri."""
    now=now or datetime.now(timezone.utc)
    return 6 if now.weekday() in {1,2,3,5,6} else 12

def _sync_due(last_iso):
    if not last_iso:return True
    try:last=datetime.fromisoformat(str(last_iso).replace("Z","+00:00"))
    except Exception:return True
    if last.tzinfo is None:last=last.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc)-last >= timedelta(hours=_sync_hours())

def _db_team(pid):
    if not SPORTS_DB_ENABLED:return None
    with _sports_db() as db:r=db.execute("SELECT * FROM teams WHERE provider_id=?",(int(pid),)).fetchone()
    return dict(r) if r else None

def _db_player(pid):
    if not SPORTS_DB_ENABLED:return None
    with _sports_db() as db:r=db.execute("SELECT * FROM players WHERE provider_id=?",(int(pid),)).fetchone()
    return dict(r) if r else None

def _db_upsert_team(t,venue=None):
    if not SPORTS_DB_ENABLED or not t or not t.get("id"):return
    now=datetime.now(timezone.utc).isoformat();pid=int(t["id"])
    with _sports_db() as db:
        db.execute("""INSERT INTO teams(provider_id,name,code,country,founded,national,badge,venue_json,public_ref,provider_updated_at,synced_at)
        VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(provider_id) DO UPDATE SET
        name=excluded.name,code=excluded.code,country=excluded.country,founded=excluded.founded,national=excluded.national,
        badge=excluded.badge,venue_json=excluded.venue_json,public_ref=excluded.public_ref,
        provider_updated_at=excluded.provider_updated_at,synced_at=excluded.synced_at""",
        (pid,t.get("name") or "Team",t.get("code"),t.get("country"),t.get("founded"),1 if t.get("national") else 0,
         t.get("logo"),_db_json(venue or {}),_public_ref("team",pid,t.get("name") or "team"),t.get("updated"),now))

def _db_upsert_player(p):
    if not SPORTS_DB_ENABLED or not p or not p.get("id"):return
    now=datetime.now(timezone.utc).isoformat();pid=int(p["id"]);birth=p.get("birth") or {}
    with _sports_db() as db:
        db.execute("""INSERT INTO players(provider_id,name,firstname,lastname,age,birth_date,birth_place,birth_country,nationality,height,weight,injured,photo,public_ref,provider_updated_at,synced_at)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(provider_id) DO UPDATE SET
        name=excluded.name,firstname=excluded.firstname,lastname=excluded.lastname,age=excluded.age,birth_date=excluded.birth_date,
        birth_place=excluded.birth_place,birth_country=excluded.birth_country,nationality=excluded.nationality,height=excluded.height,
        weight=excluded.weight,injured=excluded.injured,photo=excluded.photo,public_ref=excluded.public_ref,
        provider_updated_at=excluded.provider_updated_at,synced_at=excluded.synced_at""",
        (pid,p.get("name") or "Player",p.get("firstname"),p.get("lastname"),p.get("age"),birth.get("date"),birth.get("place"),
         birth.get("country"),p.get("nationality"),p.get("height"),p.get("weight"),1 if p.get("injured") else 0,p.get("photo"),
         _public_ref("player",pid,p.get("name") or "player"),p.get("updated"),now))

async def _sql_sync_team(team_id:int,season:int,force:bool=False):
    """One bounded refresh per stale team; never a per-visitor/per-player fanout."""
    if not SPORTS_DB_ENABLED:return None
    season=season or _current_season();key=f"team:{team_id}:{season}"
    with _sports_db() as db:state=db.execute("SELECT * FROM sync_state WHERE sync_key=?",(key,)).fetchone()
    if not force and state and not _sync_due(state["last_success_at"]):return {"cached":True}
    now=datetime.now(timezone.utc).isoformat()
    with _sports_db() as db:
        db.execute("""INSERT INTO sync_state(sync_key,last_attempt_at,status) VALUES(?,?,'running')
        ON CONFLICT(sync_key) DO UPDATE SET last_attempt_at=excluded.last_attempt_at,status='running',error=NULL""",(key,now))
    async def safe(path,params):
        try:return await _afoot_get(path,params)
        except Exception:return {"response":[]}
    prof,squad,recent,future=await asyncio.gather(
        safe("/teams",{"id":team_id}),safe("/players/squads",{"team":team_id}),
        safe("/fixtures",{"team":team_id,"season":season,"last":10}),safe("/fixtures",{"team":team_id,"season":season,"next":10}))
    pr=(prof.get("response") or [{}])[0];_db_upsert_team(pr.get("team") or {"id":team_id},pr.get("venue") or {})
    league_hint=None
    for f in (future.get("response") or [])+(recent.get("response") or []):
        lg=f.get("league") or {}
        if lg.get("id"):
            league_hint=(int(lg["id"]),int(lg.get("season") or season));break
    stats_data={"response":{}};inj_data={"response":[]};stand_data=[]
    if league_hint:
        stats_data,inj_data,stand_data=await asyncio.gather(
            safe("/teams/statistics",{"team":team_id,"league":league_hint[0],"season":league_hint[1]}),
            safe("/injuries",{"team":team_id,"season":season}),
            _fetch_standings_for_league(*league_hint),return_exceptions=False)
    players=[]
    for sr in squad.get("response") or []:
        for p in sr.get("players") or []:
            if p.get("id"):players.append(p)
    if not players:
        fd=await safe("/players",{"team":team_id,"season":season,"page":1})
        for x in fd.get("response") or []:
            p=x.get("player") or {}
            if p.get("id"):players.append(p)
    with _sports_db() as db:
        for p in players:
            _db_upsert_player(p)
            db.execute("""INSERT INTO player_teams(player_id,team_id,season,number,position,synced_at) VALUES(?,?,?,?,?,?)
            ON CONFLICT(player_id,team_id,season) DO UPDATE SET number=excluded.number,position=excluded.position,synced_at=excluded.synced_at""",
            (int(p["id"]),team_id,season,p.get("number"),p.get("position"),now))
        if league_hint:
            db.execute("""INSERT INTO leagues(provider_id,season,name,country,logo,flag,synced_at) VALUES(?,?,?,?,?,?,?)
            ON CONFLICT(provider_id,season) DO UPDATE SET name=excluded.name,country=excluded.country,logo=excluded.logo,flag=excluded.flag,synced_at=excluded.synced_at""",
            (league_hint[0],league_hint[1],None,None,None,None,now))
            rank=points=None;form=None
            for row in stand_data or []:
                if int((row.get("team") or {}).get("id") or 0)==team_id:
                    rank=row.get("rank");points=row.get("points");form=row.get("form");break
            db.execute("""INSERT INTO team_leagues(team_id,league_id,season,rank,points,form,stats_json,synced_at)
            VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(team_id,league_id,season) DO UPDATE SET rank=excluded.rank,points=excluded.points,
            form=excluded.form,stats_json=excluded.stats_json,synced_at=excluded.synced_at""",
            (team_id,league_hint[0],league_hint[1],rank,points,form,_db_json(stats_data.get("response") or {}),now))
            for x in inj_data.get("response") or []:
                p=x.get("player") or {}
                if p.get("id"):
                    _db_upsert_player(p)
                    db.execute("""INSERT OR REPLACE INTO injuries(player_id,team_id,league_id,season,date,type,reason,payload_json,synced_at)
                    VALUES(?,?,?,?,?,?,?,?,?)""",(int(p["id"]),team_id,league_hint[0],season,x.get("date"),p.get("type"),
                    p.get("reason"),_db_json(x),now))
        for f in (recent.get("response") or [])+(future.get("response") or []):
            fid=(f.get("fixture") or {}).get("id")
            if fid:db.execute("""INSERT INTO team_fixtures(fixture_id,team_id,season,payload_json,fixture_date,synced_at) VALUES(?,?,?,?,?,?)
            ON CONFLICT(fixture_id) DO UPDATE SET payload_json=excluded.payload_json,fixture_date=excluded.fixture_date,synced_at=excluded.synced_at""",
            (int(fid),team_id,season,_db_json(f),(f.get("fixture") or {}).get("date"),now))
        db.execute("UPDATE sync_state SET last_success_at=?,status='ok',records=?,error=NULL WHERE sync_key=?",(now,len(players),key))
    return {"cached":False,"players":len(players)}

async def _sql_sync_player(player_id:int,season:int,force:bool=False):
    if not SPORTS_DB_ENABLED:return None
    season=season or _current_season();key=f"player:{player_id}:{season}"
    with _sports_db() as db:state=db.execute("SELECT * FROM sync_state WHERE sync_key=?",(key,)).fetchone()
    if not force and state and not _sync_due(state["last_success_at"]):return {"cached":True}
    now=datetime.now(timezone.utc).isoformat()
    async def safe(path,params):
        try:return await _afoot_get(path,params)
        except Exception:return {"response":[]}
    data=await safe("/players",{"id":player_id,"season":season})
    rows=data.get("response") or []
    if not rows:
        data=await safe("/players/profiles",{"player":player_id});rows=data.get("response") or []
    if rows:
        p=rows[0].get("player") or {};_db_upsert_player(p)
        with _sports_db() as db:
            for st in rows[0].get("statistics") or []:
                t=st.get("team") or {};lg=st.get("league") or {}
                if t.get("id"):_db_upsert_team(t)
                if t.get("id") and lg.get("id"):
                    db.execute("""INSERT INTO player_season_stats(player_id,team_id,league_id,season,stats_json,synced_at)
                    VALUES(?,?,?,?,?,?) ON CONFLICT(player_id,team_id,league_id,season) DO UPDATE SET stats_json=excluded.stats_json,synced_at=excluded.synced_at""",
                    (player_id,int(t["id"]),int(lg["id"]),season,_db_json(st),now))
    with _sports_db() as db:
        db.execute("""INSERT INTO sync_state(sync_key,last_success_at,last_attempt_at,status,records) VALUES(?,?,?,'ok',?)
        ON CONFLICT(sync_key) DO UPDATE SET last_success_at=excluded.last_success_at,last_attempt_at=excluded.last_attempt_at,status='ok',records=excluded.records,error=NULL""",
        (key,now,now,len(rows)))
    return {"cached":False,"records":len(rows)}

def _sql_team_profile(team_id:int,season:int):
    t=_db_team(team_id)
    if not t:return None
    with _sports_db() as db:
        squad=db.execute("""SELECT p.*,pt.number,pt.position FROM player_teams pt JOIN players p ON p.provider_id=pt.player_id
        WHERE pt.team_id=? AND pt.season=? ORDER BY COALESCE(pt.number,999),p.name""",(team_id,season)).fetchall()
        fixtures=db.execute("SELECT payload_json FROM team_fixtures WHERE team_id=? AND season=? ORDER BY fixture_date DESC LIMIT 20",(team_id,season)).fetchall()
        stats=db.execute("SELECT * FROM team_leagues WHERE team_id=? AND season=?",(team_id,season)).fetchall()
        inj=db.execute("""SELECT i.*,p.name,p.photo FROM injuries i LEFT JOIN players p ON p.provider_id=i.player_id
        WHERE i.team_id=? AND i.season=? ORDER BY i.date DESC LIMIT 30""",(team_id,season)).fetchall()
    rawfx=[_db_load(x["payload_json"],{}) for x in fixtures]
    past=[];future=[];now=datetime.now(timezone.utc)
    for f in rawfx:
        try:dt=datetime.fromisoformat(str((f.get("fixture") or {}).get("date")).replace("Z","+00:00"))
        except Exception:dt=now
        (future if dt>now else past).append(f)
    def norm(items):
        out=[]
        for f in items:
            fx=f.get("fixture") or {};ts=f.get("teams") or {};g=f.get("goals") or {};lg=f.get("league") or {}
            out.append({"id":fx.get("id"),"date":fx.get("date"),"status":(fx.get("status") or {}).get("short"),
            "home":(ts.get("home") or {}).get("name"),"away":(ts.get("away") or {}).get("name"),
            "homeId":(ts.get("home") or {}).get("id"),"awayId":(ts.get("away") or {}).get("id"),
            "homeLogo":(ts.get("home") or {}).get("logo"),"awayLogo":(ts.get("away") or {}).get("logo"),
            "homeScore":g.get("home"),"awayScore":g.get("away"),"league":lg.get("name"),"leagueId":lg.get("id")})
        return out
    return {"team":{"id":team_id,"name":t["name"],"code":t["code"],"country":t["country"],"founded":t["founded"],"national":bool(t["national"]),"logo":t["badge"]},
            "venue":_db_load(t["venue_json"],{}),
            "players":[{"id":x["provider_id"],"name":x["name"],"age":x["age"],"number":x["number"],"position":x["position"],"photo":x["photo"],"nationality":x["nationality"]} for x in squad],
            "past10":norm(past[:10]),"future":norm(list(reversed(future))[:10]),
            "standings":[{"rank":x["rank"],"points":x["points"],"form":x["form"],"team":{"id":team_id,"name":t["name"],"logo":t["badge"]}} for x in stats],
            "form":list((stats[0]["form"] or "")[-5:]) if stats else [],
            "teamStats":_db_load(stats[0]["stats_json"],{}) if stats else {},
            "injuries":[{"id":x["player_id"],"name":x["name"],"photo":x["photo"],"type":x["type"],"reason":x["reason"],"date":x["date"]} for x in inj],
            "season":season,"fromSql":True,"syncedAt":t["synced_at"]}

def _sql_player_profile(player_id:int,season:int):
    p=_db_player(player_id)
    if not p:return None
    with _sports_db() as db:
        stats=db.execute("""SELECT ps.stats_json,t.name team_name,t.badge team_badge FROM player_season_stats ps
        LEFT JOIN teams t ON t.provider_id=ps.team_id WHERE ps.player_id=? AND ps.season=?""",(player_id,season)).fetchall()
        teams=db.execute("""SELECT pt.*,t.name,t.badge FROM player_teams pt LEFT JOIN teams t ON t.provider_id=pt.team_id
        WHERE pt.player_id=? AND pt.season=?""",(player_id,season)).fetchall()
    pobj={"id":player_id,"name":p["name"],"firstname":p["firstname"],"lastname":p["lastname"],"age":p["age"],
          "nationality":p["nationality"],"height":p["height"],"weight":p["weight"],"injured":bool(p["injured"]),"photo":p["photo"],
          "birth":{"date":p["birth_date"],"place":p["birth_place"],"country":p["birth_country"]}}
    return {"player":pobj,"statistics":[_db_load(x["stats_json"],{}) for x in stats],
            "teams":[{"id":x["team_id"],"name":x["name"],"logo":x["badge"],"number":x["number"],"position":x["position"]} for x in teams],
            "recentMatches":[],"transfers":[],"injuries":[],"trophies":[],"career":[],"form":[],"matchRatings":[],
            "season":season,"fromSql":True,"syncedAt":p["synced_at"]}



def _extract_xg(stats_rows):
    out={"home":None,"away":None}
    for i,row in enumerate(stats_rows or []):
        vals=row.get("statistics") or []
        for st in vals:
            typ=str(st.get("type") or "").lower().replace(" ","")
            if typ in {"expectedgoals","xg"}:
                v=st.get("value")
                try:v=float(str(v).replace("%",""))
                except Exception:pass
                out["home" if i==0 else "away"]=v
    return out

def _extract_scorers(events):
    out=[]
    for e in events or []:
        if str(e.get("type") or "").lower()=="goal":
            p=e.get("player") or {};assist=e.get("assist") or {};tm=e.get("team") or {};time=e.get("time") or {}
            out.append({"playerId":p.get("id"),"player":p.get("name"),"teamId":tm.get("id"),"team":tm.get("name"),
                        "minute":time.get("elapsed"),"extra":time.get("extra"),"detail":e.get("detail"),
                        "assistId":assist.get("id"),"assist":assist.get("name")})
    return out


def _normalise_lineups(rows):
    out=[]
    for row in rows or []:
        team=row.get("team") or {};coach=row.get("coach") or {}
        starters=[];subs=[]
        for x in row.get("startXI") or []:
            p=x.get("player") or {}
            starters.append({"id":p.get("id"),"name":p.get("name"),"number":p.get("number"),"position":p.get("pos"),"grid":p.get("grid"),"role":"Starting XI"})
        for x in row.get("substitutes") or []:
            p=x.get("player") or {}
            subs.append({"id":p.get("id"),"name":p.get("name"),"number":p.get("number"),"position":p.get("pos"),"grid":p.get("grid"),"role":"Substitute"})
        out.append({"team":{"id":team.get("id"),"name":team.get("name"),"logo":team.get("logo")},
                    "formation":row.get("formation"),"coach":{"id":coach.get("id"),"name":coach.get("name"),"photo":coach.get("photo")},
                    "startingXI":starters,"substitutes":subs})
    return out

@app.get("/match/lineups/{fixture_id}")
async def match_lineups(fixture_id:int):
    ck=f"match-lineups:{fixture_id}"
    cached=_live_cache.get(ck)
    if cached is not None:return cached
    try:d=await _afoot_get("/fixtures/lineups",{"fixture":fixture_id})
    except Exception:d={"response":[]}
    result={"fixtureId":fixture_id,"lineups":_normalise_lineups(d.get("response") or [])}
    _live_cache[ck]=result
    return result
@app.get("/match/details/{fixture_id}")
async def match_details_on_demand(fixture_id: int):
    """Expensive match detail fetched only after the user opens a match."""
    enrichment,lineups=await asyncio.gather(
        match_enrichment(fixture_id),
        match_lineups(fixture_id),
        return_exceptions=True,
    )
    if isinstance(enrichment,Exception):
        enrichment={"fixtureId":fixture_id,"goalScorers":[],"xg":{"home":None,"away":None},"available":{"goalScorers":False,"xg":False}}
    if isinstance(lineups,Exception):
        lineups={"fixtureId":fixture_id,"lineups":[],"available":False}
    return {"fixtureId":fixture_id,"enrichment":enrichment,"lineups":lineups,"loadedOnDemand":True}


@app.get("/match/enrichment/{fixture_id}")
async def match_enrichment(fixture_id:int):
    """Goal scorers and xG for a live/past game. Missing xG stays null, never false zero."""
    ck=f"match-enrichment:{fixture_id}"
    cached=_live_cache.get(ck)
    if cached is not None:return cached
    async def safe(path,params):
        try:return await _afoot_get(path,params)
        except Exception:return {"response":[]}
    events,stats=await asyncio.gather(
        safe("/fixtures/events",{"fixture":fixture_id}),
        safe("/fixtures/statistics",{"fixture":fixture_id}))
    result={"fixtureId":fixture_id,"goalScorers":_extract_scorers(events.get("response") or []),
            "xg":_extract_xg(stats.get("response") or []),
            "available":{"goalScorers":bool(events.get("response")),"xg":any(v is not None for v in _extract_xg(stats.get("response") or []).values())}}
    _live_cache[ck]=result
    return result

@app.get("/sports/directory")
async def sports_directory(sport:str=Query(...)):
    sport=sport.strip().lower()
    if sport not in {"rugby","cricket"}:return {"teams":[],"players":[]}
    teams={}
    players={}
    # Reuse the app's normalized cross-sport feed/cache; no new browser/provider fanout.
    try:
        data=await sports_live(refresh=0)
    except Exception:
        data={}
    rows=[]
    if isinstance(data,dict):
        rows=data.get(sport) or data.get("matches") or data.get("games") or []
    if not isinstance(rows,list):rows=[]
    for m in rows:
        ms=str(m.get("sport") or m.get("type") or "").lower()
        if ms and sport not in ms:continue
        for side in ("home","away"):
            obj=m.get(side+"Team") or {}
            name=obj.get("name") or m.get(side) or m.get(side+"Name")
            if not name:continue
            key=re.sub(r"[^a-z0-9]+","-",str(name).lower()).strip("-")
            teams[key]={"name":name,"badge":obj.get("logo") or obj.get("badge") or m.get(side+"Logo"),
                        "country":obj.get("country") or m.get("country"),"league":m.get("leagueName") or m.get("league"),
                        "ref":f"{sport}-{key}"}
        for p in m.get("players") or []:
            name=p.get("name")
            if name:
                key=re.sub(r"[^a-z0-9]+","-",str(name).lower()).strip("-")
                players[key]={"name":name,"photo":p.get("photo"),"team":p.get("team"),"league":m.get("leagueName") or m.get("league"),
                              "ref":f"{sport}-{key}"}
    return {"sport":sport,"teams":list(teams.values()),"players":list(players.values()),"source":"cached sports data"}

@app.get("/sports/directory/search")
async def sports_directory_search(q:str=Query(...,min_length=2),sport:str=Query(...)):
    d=await sports_directory(sport)
    ql=q.strip().lower()
    return {"sport":sport,
      "teams":[x for x in d.get("teams",[]) if ql in str(x.get("name","")).lower()][:12],
      "players":[x for x in d.get("players",[]) if ql in str(x.get("name","")).lower()][:12]}

@app.get("/sports-db/status")
async def sports_db_status():
    if not SPORTS_DB_ENABLED:return {"enabled":False}
    if SPORTS_DB_INIT_ERROR:
        return {"enabled":True,"status":"degraded","path":str(SPORTS_DB_PATH),
          "fallback":SPORTS_DB_FALLBACK,"error":SPORTS_DB_INIT_ERROR}
    try:
        with _sports_db() as db:
            return {"enabled":True,"status":"ok","path":str(SPORTS_DB_PATH),
              "fallback":SPORTS_DB_FALLBACK,
              "teams":db.execute("SELECT COUNT(*) FROM teams").fetchone()[0],
              "players":db.execute("SELECT COUNT(*) FROM players").fetchone()[0],
              "playerStats":db.execute("SELECT COUNT(*) FROM player_season_stats").fetchone()[0],
              "syncHoursNow":_sync_hours(),"syncPolicy":"6h Tue/Wed/Thu/Sat/Sun; 12h Mon/Fri"}
    except Exception as exc:
        return {"enabled":True,"status":"degraded","path":str(SPORTS_DB_PATH),
          "fallback":SPORTS_DB_FALLBACK,"error":f"{type(exc).__name__}: {exc}"}

@app.post("/sports-db/sync/team/{team_id}")
async def sports_db_sync_team(team_id:int,season:int=Query(0,ge=0),force:int=Query(0,ge=0,le=1)):
    return await _sql_sync_team(team_id,season or _current_season(),bool(force))

@app.post("/sports-db/sync/player/{player_id}")
async def sports_db_sync_player(player_id:int,season:int=Query(0,ge=0),force:int=Query(0,ge=0,le=1)):
    return await _sql_sync_player(player_id,season or _current_season(),bool(force))

# Do not let a sports-cache database failure take down authentication, news,
# health checks, or the rest of Kasi Sports News during application import.
if SPORTS_DB_ENABLED:
    try:
        _sports_db_init()
    except Exception as exc:
        SPORTS_DB_INIT_ERROR = f"{type(exc).__name__}: {exc}"
        logger.exception("Sports database initialisation failed; continuing in degraded mode")

@app.get("/public-route/{kind}/{provider_id}")
async def public_route(kind:str,provider_id:int,name:str=Query(""),response:Response=None):
    if kind not in {"team","player"}:raise HTTPException(404,"Profile not found")
    if response is not None: response.headers["Cache-Control"]="public, max-age=86400"
    ref=_public_ref(kind,provider_id,name or kind);return {"ref":ref,"url":f"/{'teams' if kind=='team' else 'players'}/{ref}"}
@app.get("/public-resolve/{kind}/{ref}")
async def public_resolve(kind:str,ref:str):
    if kind not in {"team","player"}:raise HTTPException(404,"Profile not found")
    return {"id":_public_decode(kind,ref)}
_PLAYERS_EXPLORER_CACHE=TTLCache(maxsize=200,ttl=21600)
@app.get("/players/explorer")
async def players_explorer(league:int=Query(39,ge=1),season:int=Query(0,ge=0)):
    season=season or _current_season();key=f"explorer:{league}:{season}";c=_PLAYERS_EXPLORER_CACHE.get(key)
    if c:return c
    try:d=await _afoot_get("/teams",{"league":league,"season":season})
    except Exception:return {"teams":[],"season":season}
    teams=[]
    for x in d.get("response") or []:
        t=x.get("team") or {}
        if t.get("id"):teams.append({"name":t.get("name"),"badge":t.get("logo"),"country":t.get("country"),"internalId":t["id"],"publicRef":_public_ref("team",int(t["id"]),t.get("name") or "team")})
    if SPORTS_DB_ENABLED:
        for x in d.get("response") or []:_db_upsert_team(x.get("team") or {},x.get("venue") or {})
    out={"teams":teams,"season":season};_PLAYERS_EXPLORER_CACHE[key]=out;return out
@app.get("/players/team-squad")
async def players_team_squad(team:int=Query(...,ge=1)):
    key=f"squad:{team}";c=_PLAYERS_EXPLORER_CACHE.get(key)
    if c:return c
    try:d=await _afoot_get("/players/squads",{"team":team})
    except Exception:return {"players":[]}
    rows=(d.get("response") or [{}])[0].get("players") or []
    if SPORTS_DB_ENABLED:
        for p in rows:_db_upsert_player(p)
    out={"players":[{"name":p.get("name"),"photo":p.get("photo"),"age":p.get("age"),"number":p.get("number"),"position":p.get("position"),"publicRef":_public_ref("player",int(p["id"]),p.get("name") or "player")} for p in rows if p.get("id")]}
    _PLAYERS_EXPLORER_CACHE[key]=out;return out
@app.get("/directory/discover")
async def directory_discover(league:int=Query(39,ge=1),season:int=Query(0,ge=0)):
    season=season or _current_season();key=f"discover:{league}:{season}";c=_PLAYERS_EXPLORER_CACHE.get(key)
    if c:return c
    async def safe(path,params):
        try:return await _afoot_get(path,params)
        except Exception:return {"response":[]}
    sc,sd=await asyncio.gather(safe("/players/topscorers",{"league":league,"season":season}),safe("/standings",{"league":league,"season":season}))
    players=[]
    for x in (sc.get("response") or [])[:5]:
        p=x.get("player") or {};st=(x.get("statistics") or [{}])[0];t=st.get("team") or {}
        if p.get("id"):players.append({"name":p.get("name"),"photo":p.get("photo"),"team":t.get("name"),"position":(st.get("games") or {}).get("position"),"goals":(st.get("goals") or {}).get("total"),"publicRef":_public_ref("player",int(p["id"]),p.get("name") or "player")})
    try:table=((sd.get("response") or [])[0].get("league") or {}).get("standings",[[]])[0]
    except Exception:table=[]
    teams=[]
    for x in table[:5]:
        t=x.get("team") or {}
        if t.get("id"):teams.append({"name":t.get("name"),"badge":t.get("logo"),"rank":x.get("rank"),"points":x.get("points"),"form":x.get("form"),"publicRef":_public_ref("team",int(t["id"]),t.get("name") or "team")})
    out={"players":players,"teams":teams};_PLAYERS_EXPLORER_CACHE[key]=out;return out
@app.get("/directory/search")
async def directory_search(q:str=Query(...,min_length=2,max_length=80),season:int=Query(0,ge=0)):
    season=season or _current_season();q=q.strip()
    if SPORTS_DB_ENABLED:
        like=f"%{q}%"
        with _sports_db() as db:
            tr=db.execute("SELECT * FROM teams WHERE name LIKE ? COLLATE NOCASE ORDER BY name LIMIT 8",(like,)).fetchall()
            pr=db.execute("SELECT * FROM players WHERE name LIKE ? COLLATE NOCASE ORDER BY name LIMIT 8",(like,)).fetchall()
        if tr or pr:
            return {"teams":[{"name":x["name"],"badge":x["badge"],"country":x["country"],"publicRef":x["public_ref"]} for x in tr],
                    "players":[{"name":x["name"],"photo":x["photo"],"nationality":x["nationality"],"publicRef":x["public_ref"]} for x in pr],
                    "fromSql":True}
    key=f"search:{q.lower()}:{season}";c=_PLAYERS_EXPLORER_CACHE.get(key)
    if c:return c
    async def safe(path,params):
        try:return await _afoot_get(path,params)
        except Exception:return {"response":[]}
    td,pd=await asyncio.gather(safe("/teams",{"search":q}),safe("/players",{"search":q,"season":season}) if len(q)>=4 else asyncio.sleep(0,result={"response":[]}))
    teams=[];players=[]
    for x in (td.get("response") or [])[:8]:
        t=x.get("team") or {}
        if t.get("id"):teams.append({"name":t.get("name"),"badge":t.get("logo"),"country":t.get("country"),"publicRef":_public_ref("team",int(t["id"]),t.get("name") or "team")})
    for x in (pd.get("response") or [])[:8]:
        p=x.get("player") or {};st=(x.get("statistics") or [{}])[0];t=st.get("team") or {}
        if p.get("id"):players.append({"name":p.get("name"),"photo":p.get("photo"),"team":t.get("name"),"league":(st.get("league") or {}).get("name"),"publicRef":_public_ref("player",int(p["id"]),p.get("name") or "player")})
    out={"teams":teams,"players":players};_PLAYERS_EXPLORER_CACHE[key]=out;return out
@app.get("/live")
async def live(
    league: str = Query("ALL"),
    refresh: int = Query(0, ge=0, le=1),
):
    """Fast live rail: one upstream fixture call, then cache.
    Detailed stats/odds are intentionally deferred until a match is opened.
    """
    ck=f"live:{league.upper()}"
    cached=_live_cache.get(ck) if not refresh else None
    if cached is not None:
        return cached

    params={"live":"all"}
    if league.upper()!="ALL":
        params["league"]=_resolve_league_id(league)

    try:
        fd=await _afoot_get("/fixtures",params)
        raw=fd.get("response",[])
    except Exception as exc:
        stale=_live_cache.get(ck)
        if stale is not None:
            return {**stale,"stale":True,"providerWarning":str(exc)}
        return {"matches":[],"count":0,"source":"API-Football LIVE","providerError":str(exc),
                "quota":dict(_quota_state),"generatedAt":datetime.now(timezone.utc).isoformat()}

    matches=[]
    for f in raw:
        m=_normalise_fixture(f)
        # Explicit stable aliases consumed by the frontend.
        m["fixtureId"]=m.get("_afootFixtureId")
        m["homeTeamId"]=m.get("homeId") or m.get("_teamHomeId")
        m["awayTeamId"]=m.get("awayId") or m.get("_teamAwayId")
        m["homeBadge"]=m.get("homeLogo") or (f"/sports/football/team-badge/{m.get('homeTeamId')}" if m.get("homeTeamId") else "")
        m["awayBadge"]=m.get("awayLogo") or (f"/sports/football/team-badge/{m.get('awayTeamId')}" if m.get("awayTeamId") else "")
        m["countryFlag"]=m.get("leagueFlag") or ""
        m["homeTeam"]={
            "id":m.get("homeTeamId"),
            "name":m.get("home") or "Home",
            "logo":m.get("homeLogo") or m.get("homeBadge") or "",
            "country":m.get("leagueFlag") or "",
        }
        m["awayTeam"]={
            "id":m.get("awayTeamId"),
            "name":m.get("away") or "Away",
            "logo":m.get("awayLogo") or m.get("awayBadge") or "",
            "country":m.get("leagueFlag") or "",
        }
        m["isLive"]=True
        m["liveStatus"]={
            "short":f.get("fixture",{}).get("status",{}).get("short"),
            "elapsed":f.get("fixture",{}).get("status",{}).get("elapsed"),
        }
        matches.append(m)

    result={
        "matches":matches,"count":len(matches),
        "source":"API-Football LIVE — fast fixture feed",
        "detailsDeferred":True,
        "quota":dict(_quota_state),
        "generatedAt":datetime.now(timezone.utc).isoformat(),
    }
    _live_cache[ck]=result
    return result


@app.get("/api/live-scores-with-odds")
async def live_scores_with_odds(
    league: str = Query("ALL"),
    refresh: int = Query(0, ge=0, le=1),
):
    """Combined live-score feed for the dashboard.

    API-Football remains the source of truth for fixture identity, score,
    status, minute, teams and badges. The Odds API only supplements the
    bookmaker market. Existing live (180s) and odds (1800s) caches are reused.
    """
    live_data = await live(league=league, refresh=refresh)
    rows = [dict(m) for m in (live_data.get("matches", []) if isinstance(live_data, dict) else [])]

    odds_meta = {"checked": False, "matched": 0, "events": 0, "error": None}
    if rows and ODDS_API_ENABLED and ODDS_API_KEY:
        try:
            events = await _odds_api_events(league, refresh=False)
            odds_meta.update({"checked": True, "events": len(events)})
            for match in rows:
                match["odds"] = None
                match["oddsAvailable"] = False
                match["oddsSource"] = None
                match["oddsMarketPhase"] = None

                for event in events:
                    if not _event_matches_fixture(event, match):
                        continue
                    odds = _normalise_odds_api_event(event)
                    if not _valid_1x2(odds):
                        continue

                    # Do not call a market "live odds" unless the provider feed
                    # itself is being consumed as a current market for a match
                    # API-Football confirms is live. UI still labels it clearly.
                    match["odds"] = odds
                    match["oddsAvailable"] = True
                    match["oddsSource"] = "The Odds API"
                    match["oddsMarketPhase"] = "current/in-play"
                    eh = _normalise_team_name(event.get("home_team"))
                    ea = _normalise_team_name(event.get("away_team"))
                    fh = _normalise_team_name(match.get("home") or match.get("homeTeam"))
                    fa = _normalise_team_name(match.get("away") or match.get("awayTeam"))
                    exact_pair = (eh == fh and ea == fa)
                    match["oddsMatchedBy"] = "exact/alias+kickoff" if exact_pair else "fuzzy-both-teams+kickoff"
                    if not exact_pair:
                        match["oddsMatchConfidence"] = {
                            "home": round(_team_similarity(eh, fh), 1),
                            "away": round(_team_similarity(ea, fa), 1),
                        }
                    match["oddsApiEventId"] = event.get("id")
                    odds_meta["matched"] += 1
                    break
        except Exception as exc:
            odds_meta["error"] = str(exc)
            log.warning("Combined live-score odds supplement failed: %s", exc)

    # Keep a stable frontend contract even when no market is available.
    for match in rows:
        match.setdefault("odds", None)
        match.setdefault("oddsAvailable", False)
        match.setdefault("oddsSource", None)
        match.setdefault("oddsMarketPhase", None)

    return {
        "matches": rows,
        "count": len(rows),
        "source": "API-Football live + The Odds API market",
        "liveCacheSeconds": 180,
        "oddsCacheSeconds": 1800,
        "oddsApi": odds_meta,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }

@app.get("/home/matches")
async def home_matches(league: str = Query("ALL")):
    """Live matches first; if none, return yesterday's completed matches."""
    live_data=await live(league=league,refresh=0)
    live_rows=live_data.get("matches",[]) if isinstance(live_data,dict) else []
    if live_rows:
        return {"mode":"live","heading":"Live Matches","count":len(live_rows),"matches":live_rows,"source":live_data.get("source","API-Football LIVE")}
    yesterday=(datetime.now()-timedelta(days=1)).strftime("%Y-%m-%d")
    recent=await fixtures(league=league,type="today",range=None,date_from=yesterday,date_to=yesterday,refresh=0)
    rows=recent.get("matches",[]) if isinstance(recent,dict) else []
    completed=[]
    for m in rows:
        st=str(m.get("status") or m.get("statusShort") or "").upper()
        if st in {"FT","AET","PEN","AWD","WO"} or "FINISH" in st: completed.append(m)
    if not completed: completed=rows
    majors=("premier league","champions league","europa","la liga","serie a","bundesliga","ligue 1","psl","premiership","world cup","africa cup","cup")
    def rank(m):
        lg=str(m.get("league") or "").lower()
        return (2 if any(x in lg for x in majors) else 0)+int(bool(m.get("homeLogo")))+int(bool(m.get("awayLogo")))
    completed=sorted(completed,key=rank,reverse=True)[:12]
    return {"mode":"recent","heading":"Yesterday's Top Matches","date":yesterday,"count":len(completed),"matches":completed,"source":"API-Football completed fixtures"}

# ---------------------------------------------------------------------------
# PRE-MATCH ODDS
# ---------------------------------------------------------------------------

async def _fetch_prematch_odds_by_dates(dates, league_ids: list[int] | None = None):
    """Fetch pre-match odds filtered to specific league IDs.

    Instead of paginating ALL leagues globally (which can hit 59+ pages),
    we fetch odds per league per date — capped at MAX_ODDS_PAGES pages each.
    If league_ids is None/empty we fall back to SCAN_LEAGUES.
    """
    MAX_ODDS_PAGES = 3  # safety cap per league per date (~75 fixtures max)
    by_id = {}

    # Derive season from the dates using the football-calendar helper
    season = _current_season()

    # Resolve league IDs to fetch
    if not league_ids:
        league_ids = [lid for name in SCAN_LEAGUES if (lid := LEAGUE_IDS.get(name))]

    for date in sorted(set(x for x in dates if x)):
        for lid in league_ids:
            page = 1
            while page <= MAX_ODDS_PAGES:
                data = await _afoot_get(
                    "/odds",
                    {"date": date, "league": lid, "season": season, "page": page},
                )

                for item in data.get("response", []):
                    fixture_id = item.get("fixture", {}).get("id")
                    if fixture_id is None:
                        continue
                    norm = _normalise_odds(item.get("bookmakers", []))
                    if _valid_1x2(norm):
                        by_id[str(fixture_id)] = norm
                        _odds_cache[f"odds:{fixture_id}"] = {
                            "fixture_id": fixture_id,
                            "odds": norm,
                            "source": "API-Football",
                            "fetchedAt": datetime.now(timezone.utc).isoformat(),
                        }

                paging = data.get("paging") or {}
                total_pages = int(paging.get("total") or page)
                if page >= total_pages:
                    break
                page += 1

    return by_id

@app.get("/fixtures/with-odds")
async def fixtures_with_odds(
    league: str = Query(...),
    type: str = Query("today"),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    refresh: int = Query(0, ge=0, le=1),
):
    # v183: this endpoint is also called directly by prediction/summary routes.
    # Strip FastAPI Query metadata defaults before they can leak into fixtures().
    league = league if isinstance(league, str) else "ALL"
    type = type if isinstance(type, str) else "today"
    date_from = date_from if isinstance(date_from, str) else None
    date_to = date_to if isinstance(date_to, str) else None
    refresh = int(refresh) if isinstance(refresh, (int, bool)) else 0

    # IMPORTANT: do not put a wall-clock deadline around the entire ALL-league
    # fixture loader.  It may legitimately require one API-Football request per
    # configured league.  Each upstream request already has its own 20-second
    # httpx timeout/retry policy in _afoot_get().
    #
    # The previous 5-second wrapper caused a partial/failed API-Football fixture
    # load to be replaced by The Odds API, which has no API-Football statistics,
    # lineups, form, injuries or player data.
    try:
        result = await fixtures(
            league=league,
            type=type,
            date_from=date_from,
            date_to=date_to,
            refresh=refresh,
        )
    except Exception as primary_exc:
        if ODDS_API_ENABLED and ODDS_API_KEY:
            log.warning(
                "Primary fixture provider failed (%s); attempting odds-only fallback",
                primary_exc,
            )
            try:
                fallback = await _odds_api_fallback_fixtures(league)
                fallback["providerWarning"] = (
                    "API-Football fixture loading failed; fallback contains odds/event data only."
                )
                return fallback
            except Exception as fallback_exc:
                log.error("The Odds API fallback failed: %s", fallback_exc)
        raise

    matches = result.get("matches", [])
    if not matches:
        return {
            **result,
            "oddsComplete": 0,
            "oddsBookmaker": 0,
            "hasBookmakerOdds": False,
            "hasValidOdds": False,
            "oddsUnavailable": False,
            "provider": "API-Football",
            "providerError": None,
            "quota": dict(_quota_state),
        }

    real_by_id = {}
    odds_source_by_id = {}
    dates = []

    for match in matches:
        raw_date = match.get("datetime") or ""
        if raw_date:
            dates.append(raw_date[:10])

    if not refresh:
        for match in matches:
            fid = match.get("_afootFixtureId")
            cached = _odds_cache.get(f"odds:{fid}") if fid else None
            odds_value = cached.get("odds", {}) if cached else {}
            if _valid_1x2(odds_value):
                real_by_id[str(fid)] = odds_value

    # v184: cache the entire odds scan, including an EMPTY result. Without this,
    # a day with no bookmaker odds caused every dashboard poll to rescan API-Football.
    batch_key = f"prematch:{league.upper()}:{','.join(sorted(set(dates)))}"
    cached_batch = _prematch_odds_batch_cache.get(batch_key) if not refresh else None
    if cached_batch is not None:
        real_by_id.update(cached_batch.get("odds", {}))

    if refresh or cached_batch is None:
        try:
            # Resolve league IDs — avoids paginating all 59+ pages globally
            if league.upper() == "ALL":
                lids = [lid for name in SCAN_LEAGUES if (lid := LEAGUE_IDS.get(name))]
            else:
                try:
                    lids = [_resolve_league_id(league)]
                except Exception:
                    lids = [lid for name in SCAN_LEAGUES if (lid := LEAGUE_IDS.get(name))]
            # Bulk odds discovery can span multiple leagues/dates.  Do not
            # apply the 5-second single-request deadline to the whole batch.
            # _afoot_get() still enforces an individual HTTP timeout.
            fetched = await _fetch_prematch_odds_by_dates(
                dates, league_ids=lids
            )
            real_by_id.update(fetched)
            _prematch_odds_batch_cache[batch_key] = {
                "odds": dict(fetched),
                "fetchedAt": datetime.now(timezone.utc).isoformat(),
                "error": None,
            }
        except Exception as exc:
            # Cache the failed/empty scan briefly under the normal 30-minute batch TTL
            # so concurrent dashboard widgets cannot create a provider request storm.
            _prematch_odds_batch_cache[batch_key] = {
                "odds": dict(real_by_id),
                "fetchedAt": datetime.now(timezone.utc).isoformat(),
                "error": str(exc),
            }
            log.warning("Pre-match odds fetch failed or timed out: %s", exc)

    bookmaker_count = 0

    for match in matches:
        fid = match.get("_afootFixtureId")
        odds_value = real_by_id.get(str(fid), {})
        valid = _valid_1x2(odds_value)

        if valid:
            bookmaker_count += 1
            match["odds"] = odds_value
            match["oddsSource"] = odds_source_by_id.get(str(fid), "API-Football")
        else:
            match["odds"] = {
                "homeWin": 0,
                "draw": 0,
                "awayWin": 0,
                "over05": 0,
                "over15": 0,
                "over25": 0,
                "btts": 0,
                "firstHalfHome": 0,
                "scoreFirst": 0,
                "expectedGoalscorer": 0,
            }
            match["oddsSource"] = "Unavailable"

        match["oddsAvailable"] = valid
        match["hasBookmakerOdds"] = valid
        match["bookmakerGatePassed"] = valid

    # v217: API-Football remains the football source; The Odds API fills missing 1X2.
    odds_api_meta = await _supplement_odds_from_odds_api(matches, league=league, refresh=bool(refresh))
    bookmaker_count = sum(1 for m in matches if _valid_1x2(m.get("odds", {})))
    api_football_odds_count = sum(1 for m in matches if m.get("oddsSource") == "API-Football" and _valid_1x2(m.get("odds", {})))
    odds_api_count = sum(1 for m in matches if m.get("oddsSource") == "The Odds API" and _valid_1x2(m.get("odds", {})))

    return {
        **result,
        "matches": matches,
        "oddsComplete": bookmaker_count,
        "oddsBookmaker": bookmaker_count,
        "oddsStatistical": 0,
        "oddsSource": "API-Football + The Odds API",
        "oddsSources": {"apiFootball": api_football_odds_count, "theOddsApi": odds_api_count},
        "oddsApi": odds_api_meta,
        "oddsUnavailable": bool(matches) and bookmaker_count == 0,
        "hasBookmakerOdds": bookmaker_count > 0,
        "hasValidOdds": bookmaker_count > 0,
        "provider": result.get("source", "API-Football"),
        "providerWarning": result.get("providerWarning"),
        "quota": dict(_quota_state),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }

@app.get("/odds")
async def odds(
    fixture_id: int = Query(...),
    refresh: int = Query(0, ge=0, le=1),
):
    cache_key = f"odds:{fixture_id}"

    if not refresh:
        cached = _odds_cache.get(cache_key)
        if cached and _valid_1x2(cached.get("odds", {})):
            return {**cached, "available": True}

    try:
        data = await _afoot_get_deadline("/odds", {"fixture": fixture_id}, ODDS_API_TIMEOUT, force_fresh=bool(refresh))
        raw = data.get("response", [])
        norm = _normalise_odds(raw[0].get("bookmakers", [])) if raw else {}
        valid = _valid_1x2(norm)
        result = {
            "fixture_id": fixture_id, "odds": norm if valid else {},
            "source": "API-Football" if valid else "Unavailable",
            "available": valid, "bookmakerGatePassed": valid,
            "quota": dict(_quota_state),
        }
        if valid:
            _odds_cache[cache_key] = {
                "fixture_id": fixture_id, "odds": norm, "source": "API-Football",
                "fetchedAt": datetime.now(timezone.utc).isoformat(),
            }
            return result
    except Exception as exc:
        log.warning("Primary /odds failed or exceeded %.1fs for fixture %s: %s", ODDS_API_TIMEOUT, fixture_id, exc)

    if ODDS_API_ENABLED and ODDS_API_KEY:
        meta = _fixture_meta_cache.get(str(fixture_id), {})
        try:
            sport_key = _odds_api_sport_key(meta.get("league", "")) or "soccer_epl"
            events = await _odds_api_get(
                f"/sports/{sport_key}/odds",
                {"regions": ODDS_API_REGIONS, "markets": ODDS_API_MARKETS, "oddsFormat": "decimal"},
            )
            for event in events if isinstance(events, list) else []:
                if _event_matches_fixture(event, meta):
                    norm = _normalise_odds_api_event(event)
                    valid = _valid_1x2(norm)
                    return {
                        "fixture_id": fixture_id, "odds": norm if valid else {},
                        "source": "The Odds API" if valid else "Unavailable",
                        "available": valid, "bookmakerGatePassed": valid,
                        "oddsApiEventId": event.get("id"),
                        "fallback": True,
                    }
        except Exception as exc:
            log.warning("The Odds API fixture fallback failed: %s", exc)

    return {
        "fixture_id": fixture_id, "odds": {}, "source": "Unavailable",
        "available": False, "bookmakerGatePassed": False,
        "fallback": False, "quota": dict(_quota_state),
    }


@app.get("/odds/batch")
async def odds_batch(
    fixture_ids: str = Query(...),
    use_backup: int = Query(0),
    refresh: int = Query(0, ge=0, le=1),
):
    try:
        ids = [int(x.strip()) for x in fixture_ids.split(",") if x.strip()]
    except ValueError:
        raise HTTPException(400, "fixture_ids must be comma-separated integers")
    if not ids:
        raise HTTPException(400, "fixture_ids is empty")
    if len(ids) > 100:
        raise HTTPException(400, "Maximum 100 fixture IDs per batch request")

    result = {}
    for fixture_id in ids:
        cache_key = f"odds:{fixture_id}"
        cached = _odds_cache.get(cache_key) if not refresh else None
        if cached and _valid_1x2(cached.get("odds", {})):
            result[str(fixture_id)] = {"odds": cached["odds"], "source": "API-Football", "available": True}
            continue

        try:
            data = await _afoot_get_deadline("/odds", {"fixture": fixture_id}, ODDS_API_TIMEOUT, force_fresh=bool(refresh))
            raw = data.get("response", [])
            norm = _normalise_odds(raw[0].get("bookmakers", [])) if raw else {}
            if _valid_1x2(norm):
                _odds_cache[cache_key] = {"fixture_id": fixture_id, "odds": norm, "source": "API-Football", "fetchedAt": datetime.now(timezone.utc).isoformat()}
                result[str(fixture_id)] = {"odds": norm, "source": "API-Football", "available": True}
                continue
        except Exception as exc:
            log.warning("odds/batch primary fixture %s failed: %s", fixture_id, exc)

        # The frontend normally uses /odds for single fixture fallback. Keep
        # batch resilient as well so bulk widgets get the same behaviour.
        if ODDS_API_ENABLED and ODDS_API_KEY:
            fallback = await odds(fixture_id=fixture_id, refresh=0)
            if fallback.get("available"):
                result[str(fixture_id)] = {
                    "odds": fallback.get("odds", {}),
                    "source": fallback.get("source", "The Odds API"),
                    "available": True,
                    "fallback": True,
                }

    return {
        "odds": result, "count": len(result), "fetched": [int(x) for x in result.keys()],
        "source": "Mixed: API-Football + The Odds API fallback" if result else "Unavailable",
        "quota": dict(_quota_state),
    }


# ---------------------------------------------------------------------------
# TEAM HISTORY / SCAN
# ---------------------------------------------------------------------------

@app.get("/team/history")
async def team_history(
    team: str = Query(...),
    league_id: int = Query(0),
    last: int = Query(20),
):
    cache_key = f"team:{team}:{league_id}:{last}"

    cached = _team_cache.get(cache_key)
    if cached is not None:
        return cached

    search = await _afoot_get("/teams", {"search": team})
    teams = search.get("response", [])

    if not teams:
        raise HTTPException(404, f"Team not found: {team!r}")

    team_id = teams[0]["team"]["id"]
    team_name = teams[0]["team"]["name"]

    params = {
        "team": team_id,
        "season": _current_season(),
        "last": last,
    }
    if league_id:
        params["league"] = league_id

    data = await _afoot_get("/fixtures", params)
    matches = []

    for fixture in data.get("response", []):
        status = fixture.get("fixture", {}).get("status", {}).get("short", "")
        if status not in ("FT", "AET", "PEN"):
            continue

        teams_obj = fixture.get("teams", {})
        goals = fixture.get("goals", {})
        is_home = teams_obj.get("home", {}).get("id") == team_id

        home_goals = goals.get("home", 0) or 0
        away_goals = goals.get("away", 0) or 0

        matches.append({
            "hg": home_goals if is_home else away_goals,
            "ag": away_goals if is_home else home_goals,
            "isHome": is_home,
        })

    result = {
        "team_id": team_id,
        "team_name": team_name,
        "matches": matches,
        "count": len(matches),
        "source": "API-Football",
    }
    _team_cache[cache_key] = result
    return result


@app.get("/team/profile")
async def team_profile(team: str = Query(...), season: int = Query(0, ge=0)):
    """Cached team profile with identity, squad, fixtures, table and season data."""
    season=season or _current_season()
    raw=str(team).strip()
    if raw.isdigit() and SPORTS_DB_ENABLED:
        tid=int(raw); sql_profile=_sql_team_profile(tid,season)
        if sql_profile:
            row=_db_team(tid)
            if row and _sync_due(row.get("synced_at")):
                asyncio.create_task(_sql_sync_team(tid,season))
            return sql_profile
    cache_key=f"team-profile-v216:{raw.lower()}:{season}"
    cached=_team_profile_page_cache.get(cache_key)
    if cached is not None:return cached

    if raw.isdigit(): team_id,team_name=int(raw),raw
    else: team_id,team_name=await _resolve_team_id(raw)

    async def safe(path,params):
        try:return await _afoot_get(path,params)
        except Exception as exc:
            log.warning("TEAM_PROFILE upstream=%s team=%s error=%s",path,team_id,exc)
            return {"response":[]}

    profile,squad,recent,future=await asyncio.gather(
        safe("/teams",{"id":team_id}),
        safe("/players/squads",{"team":team_id}),
        safe("/fixtures",{"team":team_id,"season":season,"last":10}),
        safe("/fixtures",{"team":team_id,"season":season,"next":10}),
    )
    p=(profile.get("response") or [{}])[0]
    team_obj=p.get("team") or {"id":team_id,"name":team_name}
    team_obj["id"]=team_obj.get("id") or team_id
    if not team_obj.get("logo"):team_obj["logo"]=f"/sports/football/team-badge/{team_id}"

    players=[]
    for sr in squad.get("response") or []:
        for pl in sr.get("players") or []:
            if pl.get("id"):players.append({"id":pl.get("id"),"name":pl.get("name"),"age":pl.get("age"),"number":pl.get("number"),"position":pl.get("position"),"photo":pl.get("photo"),"nationality":pl.get("nationality")})

    # A squad can occasionally be empty while season player data is available.
    # One cached fallback request restores the team page without a per-player fanout.
    if not players:
        fallback=await safe("/players",{"team":team_id,"season":season,"page":1})
        for row in fallback.get("response") or []:
            pl=row.get("player") or {}
            if pl.get("id"):players.append({"id":pl.get("id"),"name":pl.get("name"),"age":pl.get("age"),"number":None,"position":((row.get("statistics") or [{}])[0].get("games") or {}).get("position"),"photo":pl.get("photo"),"nationality":pl.get("nationality")})

    def norm(items):
        out=[]
        for f in items:
            ts=f.get("teams") or {};g=f.get("goals") or {};fs=f.get("fixture") or {};lg=f.get("league") or {}
            out.append({"id":fs.get("id"),"date":fs.get("date"),"status":(fs.get("status") or {}).get("short"),"statusLong":(fs.get("status") or {}).get("long"),
                        "home":(ts.get("home") or {}).get("name"),"away":(ts.get("away") or {}).get("name"),
                        "homeId":(ts.get("home") or {}).get("id"),"awayId":(ts.get("away") or {}).get("id"),
                        "homeLogo":(ts.get("home") or {}).get("logo"),"awayLogo":(ts.get("away") or {}).get("logo"),
                        "homeScore":g.get("home"),"awayScore":g.get("away"),"league":lg.get("name"),"leagueId":lg.get("id"),
                        "leagueLogo":lg.get("logo"),"leagueFlag":lg.get("flag")})
        return out
    past=norm(recent.get("response") or []);upcoming=norm(future.get("response") or [])

    league_hint=None
    for fx in (future.get("response") or [])+(recent.get("response") or []):
        lg=fx.get("league") or {}
        if lg.get("id"):league_hint=(int(lg["id"]),int(lg.get("season") or season));break

    standings=[];team_stats={};injuries=[]
    if league_hint:
        standings_task=_fetch_standings_for_league(*league_hint)
        stats_task=safe("/teams/statistics",{"team":team_id,"league":league_hint[0],"season":league_hint[1]})
        injuries_task=safe("/injuries",{"team":team_id,"season":season})
        sd,st,inj=await asyncio.gather(standings_task,stats_task,injuries_task,return_exceptions=True)
        if isinstance(sd,list):standings=sd
        if isinstance(st,dict):team_stats=st.get("response") or {}
        if isinstance(inj,dict):
            for x in (inj.get("response") or [])[:20]:
                pl=x.get("player") or {}
                injuries.append({"id":pl.get("id"),"name":pl.get("name"),"photo":pl.get("photo"),"type":pl.get("type"),"reason":pl.get("reason"),"date":x.get("date"),"team":x.get("team") or {},"league":x.get("league") or {}})

    form=[];gf=ga=0
    for x in reversed(past):
        hs=x.get("homeScore");av=x.get("awayScore")
        if hs is None or av is None:continue
        hs=int(hs);av=int(av)
        if x.get("homeId")==team_id:gf+=hs;ga+=av;r="W" if hs>av else "D" if hs==av else "L"
        else:gf+=av;ga+=hs;r="W" if av>hs else "D" if av==hs else "L"
        form.append(r)
    form=form[-5:]

    result={"team":team_obj,"venue":p.get("venue") or {},"players":players,"past10":past,"future":upcoming,
            "standings":standings,"league":({"id":league_hint[0],"season":league_hint[1]} if league_hint else {}),
            "season":season,"form":form,"goalsFor":gf,"goalsAgainst":ga,"teamStats":team_stats,"injuries":injuries,
            "nextOdds":{},"updatedAt":datetime.now(timezone.utc).isoformat()}
    _team_profile_page_cache[cache_key]=result
    _team_profile_page_cache[f"team-profile-v216:{team_id}:{season}"]=result
    return result

@app.get("/player/profile")
async def player_profile(player: int = Query(..., ge=1), season: int = Query(0, ge=0)):
    """Fast dedicated player profile.

    First paint is intentionally bounded: current profile/statistics, recent
    fixtures, transfers, injuries and trophies are fetched concurrently.
    Historical season fan-out and per-fixture rating fan-out are not performed
    on the critical path.
    """
    season=season or _current_season()
    if SPORTS_DB_ENABLED:
        sql_profile=_sql_player_profile(player,season)
        if sql_profile:
            row=_db_player(player)
            if row and _sync_due(row.get("synced_at")):
                asyncio.create_task(_sql_sync_player(player,season))
            return sql_profile
    key=f"player-profile-fast:{player}:{season}"
    cached=_team_cache.get(key)
    if cached is not None:
        return cached

    async def safe(path,params):
        try:
            return await _afoot_get(path,params)
        except Exception as exc:
            log.debug("Player profile %s failed for %s: %s",path,player,exc)
            return {"response":[]}

    base,recent,transfers_raw,injuries_raw,trophies_raw=await asyncio.gather(
        safe("/players",{"id":player,"season":season}),
        safe("/fixtures",{"player":player,"season":season,"last":10}),
        safe("/transfers",{"player":player}),
        safe("/injuries",{"player":player,"season":season}),
        safe("/trophies",{"player":player}),
    )

    rows=base.get("response") or []
    profile=rows[0] if rows else {}
    pobj=profile.get("player") or {}
    stats=profile.get("statistics") or []
    if not pobj.get("name"):
        profile_fallback=await safe("/players/profiles",{"player":player})
        prow=(profile_fallback.get("response") or [{}])[0]
        pobj=prow.get("player") or pobj
    if not pobj.get("id"):pobj["id"]=player

    def split(st):
        return {
            "team":st.get("team") or {},"league":st.get("league") or {},
            "games":st.get("games") or {},"goals":st.get("goals") or {},
            "shots":st.get("shots") or {},"passes":st.get("passes") or {},
            "tackles":st.get("tackles") or {},"duels":st.get("duels") or {},
            "dribbles":st.get("dribbles") or {},"fouls":st.get("fouls") or {},
            "cards":st.get("cards") or {},"penalty":st.get("penalty") or {},
        }

    teams=[split(x) for x in stats]
    recent_rows=recent.get("response") or []

    transfers=[]
    for block in transfers_raw.get("response") or []:
        for tr in block.get("transfers") or []:
            transfers.append({"date":tr.get("date"),"type":tr.get("type"),
                              "reason":tr.get("reason"),"team":tr.get("teams") or {}})

    injuries=[]
    for x in injuries_raw.get("response") or []:
        pl=x.get("player") or {}
        injuries.append({"id":pl.get("id"),"name":pl.get("name"),"photo":pl.get("photo"),
                         "type":pl.get("type"),"reason":pl.get("reason"),"date":x.get("date"),
                         "fixture":x.get("fixture") or {},"team":x.get("team") or {},
                         "league":x.get("league") or {}})

    trophies=[{"league":x.get("league"),"country":x.get("country"),"season":x.get("season"),
               "place":x.get("place"),"status":x.get("status")}
              for x in trophies_raw.get("response") or []]

    # Current team is preserved explicitly for frontend routing.
    current_team=(stats[0].get("team") if stats else {}) or {}
    result={
        "player":pobj,
        "currentTeam":current_team,
        "statistics":stats,
        "teams":teams,
        "recentMatches":recent_rows,
        "transfers":transfers,
        "injuries":injuries,
        "trophies":trophies,
        "career":[],
        "form":[],
        "matchRatings":[],
        "ratingSummary":{"count":0,"average":None,"best":None},
        "season":season,
        "detailsDeferred":True,
        "updatedAt":datetime.now(timezone.utc).isoformat(),
    }
    _team_cache[key]=result
    return result


async def _resolve_team_id(name: str) -> tuple[int, str]:
    search = await _afoot_get("/teams", {"search": name})
    teams = search.get("response", [])
    if not teams:
        raise HTTPException(404, f"Team not found: {name!r}")
    return teams[0]["team"]["id"], teams[0]["team"]["name"]


@app.get("/team/h2h")
async def team_h2h(
    home: str = Query(...),
    away: str = Query(...),
    last: int = Query(10, ge=1, le=20),
):
    """Head-to-head record between two named teams — used for match-insight
    panels (Fixtures/Predictions rows). Cached per team pair."""
    cache_key = f"h2h:{home.lower()}:{away.lower()}:{last}"
    cached = _team_cache.get(cache_key)
    if cached is not None:
        return cached

    home_id, home_name = await _resolve_team_id(home)
    away_id, away_name = await _resolve_team_id(away)

    data = await _afoot_get(
        "/fixtures/headtohead",
        {"h2h": f"{home_id}-{away_id}", "last": last},
    )

    meetings = []
    home_wins = away_wins = draws = 0
    btts_count = over25_count = 0

    for fixture in data.get("response", []):
        status = fixture.get("fixture", {}).get("status", {}).get("short", "")
        if status not in ("FT", "AET", "PEN"):
            continue

        teams_obj = fixture.get("teams", {})
        goals = fixture.get("goals", {})
        fixture_home_id = teams_obj.get("home", {}).get("id")

        hg = goals.get("home", 0) or 0
        ag = goals.get("away", 0) or 0
        total = hg + ag

        # Normalise so "home"/"away" always refer to the *current* fixture's
        # home/away teams, regardless of who hosted historically.
        if fixture_home_id == home_id:
            our_home_goals, our_away_goals = hg, ag
        else:
            our_home_goals, our_away_goals = ag, hg

        if our_home_goals > our_away_goals:
            home_wins += 1
        elif our_away_goals > our_home_goals:
            away_wins += 1
        else:
            draws += 1

        if hg > 0 and ag > 0:
            btts_count += 1
        if total > 2.5:
            over25_count += 1

        meetings.append({
            "date": fixture.get("fixture", {}).get("date", "")[:10],
            "league": fixture.get("league", {}).get("name", ""),
            "homeTeam": teams_obj.get("home", {}).get("name", ""),
            "awayTeam": teams_obj.get("away", {}).get("name", ""),
            "hg": hg,
            "ag": ag,
        })

    played = len(meetings)
    result = {
        "homeTeam": home_name,
        "awayTeam": away_name,
        "played": played,
        "homeWins": home_wins,
        "awayWins": away_wins,
        "draws": draws,
        "bttsPct": round(100 * btts_count / played, 1) if played else 0,
        "over25Pct": round(100 * over25_count / played, 1) if played else 0,
        "meetings": meetings,
        "source": "API-Football",
    }
    _team_cache[cache_key] = result
    return result


@app.get("/team/injuries")
async def team_injuries(
    team: str = Query(...),
):
    """Current-season injuries/suspensions for a named team. Used as a
    lightweight risk flag alongside predictions — not a weighted model
    input (kept separate from the prediction engine's own H2H component)."""
    cache_key = f"injuries:{team.lower()}"
    cached = _team_cache.get(cache_key)
    if cached is not None:
        return cached

    team_id, team_name = await _resolve_team_id(team)
    season = _current_season()

    try:
        data = await _afoot_get(
            "/injuries", {"team": team_id, "season": season}
        )
        raw = data.get("response", [])
    except HTTPException:
        raw = []

    players = []
    for item in raw[:12]:
        player = item.get("player", {})
        players.append({
            "name": player.get("name", "Unknown"),
            "type": player.get("type", ""),      # e.g. "Missing Fixture"
            "reason": player.get("reason", ""),  # e.g. "Hamstring Injury"
        })

    result = {
        "team_id": team_id,
        "team_name": team_name,
        "count": len(players),
        "players": players,
        "source": "API-Football",
    }
    _team_cache[cache_key] = result
    return result


@app.get("/scan")
async def scan(
    leagues: str = Query("epl,la_liga,bundesliga,serie_a,ligue1"),
    type: str = Query("today"),
):
    aliases = {
        "epl": "Premier League",
        "la_liga": "La Liga",
        "bundesliga": "Bundesliga",
        "serie_a": "Serie A",
        "ligue1": "Ligue 1",
    }

    names = [
        aliases.get(x.strip().lower(), x.strip())
        for x in leagues.split(",")
        if x.strip()
    ]

    all_matches = []
    errors = []

    for name in names:
        try:
            result = await fixtures(
                league=name,
                type=type,
            )
            all_matches.extend(result.get("matches", []))
            await asyncio.sleep(0.2)
        except Exception as exc:
            errors.append(f"{name}: {exc}")

    return {
        "matches": all_matches,
        "count": len(all_matches),
        "errors": errors,
        "leagues": names,
        "source": "API-Football",
    }

# ---------------------------------------------------------------------------
# AI / PREDICTION ENDPOINTS
# ---------------------------------------------------------------------------

def _save_prediction_to_db(match: dict, prediction_result: dict):
    """
    Persist a computed prediction to the learning DB so /best-predictions
    and /learning-stats have data to work with.
    Runs synchronously (SQLite is fast). Swallows errors so a DB hiccup
    never breaks the API response.
    """
    try:
        pred_block = prediction_result.get("prediction", {})
        probs = pred_block.get("probabilities", {})
        fid = match.get("_afootFixtureId") or match.get("fixtureId")
        if not fid:
            return

        raw_kickoff = match.get("datetime") or match.get("kickoff") or ""
        # Normalise to "YYYY-MM-DD HH:MM" so SQLite string comparisons work
        # consistently with the cutoff queries in best_predictions.
        kickoff_stored = raw_kickoff.replace("T", " ")[:16] if raw_kickoff else None

        payload = {
            "fixtureId": int(fid),
            "kickoff": kickoff_stored,
            "homeTeam": match.get("home") or match.get("homeTeam"),
            "awayTeam": match.get("away") or match.get("awayTeam"),
            "probabilities": probs,
            "odds": match.get("odds", {}),
            "modelInputs": prediction_result.get("goalRating", {}),
            "prediction": {
                k: v for k, v in pred_block.items()
                if k != "probabilities"
            },
            "modelVersion": V141_MODEL_VERSION,
        }

        v141_learning.save_prediction(payload)

    except Exception as exc:
        log.warning("Failed to save prediction for fixture %s: %s", fid, exc)



@app.get("/fixtures/high-scoring")
async def fixtures_high_scoring(
    league: str = Query("ALL"),
    min_xg: float = Query(2.5, ge=0.0, le=10.0),
    min_over25: float = Query(55.0, ge=0.0, le=100.0),
    limit: int = Query(30, ge=1, le=100),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    """Return upcoming fixtures ranked by high-scoring likelihood.

    Scoring formula (0-100):
      • 40% — Poisson over-2.5-goals probability
      • 25% — Poisson over-3.5-goals probability
      • 20% — combined xG (home + away), normalised to a 5-goal ceiling
      • 15% — bookmaker over-2.5 implied probability (if available)

    Only fixtures with over-2.5 probability >= min_over25 AND combined
    xG >= min_xg are returned.  Results are sorted highest score first.
    """
    today    = datetime.now().strftime("%Y-%m-%d")
    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")

    fixtures_data = await fixtures_with_odds(
        league=league,
        type="upcoming",
        date_from=date_from or today,
        date_to=date_to or tomorrow,
        refresh=0,
    )

    current_season = _current_season()
    results: list[dict] = []

    for match in fixtures_data.get("matches", []):
        if match.get("isFinished"):
            continue

        league_id = match.get("_leagueId") or match.get("leagueId") or match.get("league_id")
        season    = match.get("_leagueSeason") or current_season
        if league_id:
            try:
                match = await _enrich_match(match, int(league_id), int(season))
            except Exception as exc:
                log.warning("high_scoring enrich failed %s: %s", match.get("_afootFixtureId"), exc)
            await asyncio.sleep(0.15)

        stat = _poisson(match)
        o    = match.get("odds", {})

        over25_prob = round(stat["over25"] * 100, 1)
        over35_prob = round(stat["over35"] * 100, 1)
        xg_home     = round(stat["xgHome"], 2)
        xg_away     = round(stat["xgAway"], 2)
        xg_total    = round(xg_home + xg_away, 2)
        btts_prob   = round(stat["btts"] * 100, 1)

        # Bookmaker over-2.5 implied probability
        bk_over25_odds = o.get("over25", 0)
        bk_over25_pct  = round(100 / bk_over25_odds, 1) if bk_over25_odds and bk_over25_odds > 1 else 0.0

        # Apply filters
        if over25_prob < min_over25 or xg_total < min_xg:
            continue

        # Composite high-scoring score (0-100)
        score = round(
            0.40 * over25_prob
            + 0.25 * over35_prob
            + 0.20 * min(xg_total / 5.0, 1.0) * 100
            + 0.15 * (bk_over25_pct if bk_over25_pct else over25_prob),
            1,
        )

        results.append({
            "fixtureId":    match.get("_afootFixtureId") or match.get("id"),
            "home":         match.get("home"),
            "away":         match.get("away"),
            "league":       match.get("league") or match.get("_league"),
            "leagueId":     league_id,
            "kickoff":      match.get("kickoff") or match.get("date"),
            "highScoringScore": score,
            "xgHome":       xg_home,
            "xgAway":       xg_away,
            "xgTotal":      xg_total,
            "over25Pct":    over25_prob,
            "over35Pct":    over35_prob,
            "over15Pct":    round(stat["over15"] * 100, 1),
            "bttsPct":      btts_prob,
            "bkOver25Pct":  bk_over25_pct,
            "bkOver25Odds": bk_over25_odds,
            "homeGoalsFor": round(match.get("homeGoalsFor", xg_home), 2),
            "awayGoalsFor": round(match.get("awayGoalsFor", xg_away), 2),
            "hasBookmakerOdds": _valid_1x2(o),
        })

    results.sort(key=lambda x: x["highScoringScore"], reverse=True)

    return {
        "count":       len(results[:limit]),
        "filters":     {"minXg": min_xg, "minOver25Pct": min_over25},
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "fixtures":    results[:limit],
    }

@app.get("/ai-predictions")
async def ai_predictions(
    limit: int = Query(20, ge=1, le=100),
    refresh: int = Query(1, ge=0, le=1),
    league: str = Query("ALL"),
    type: str = Query("upcoming"),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    today = datetime.now().strftime("%Y-%m-%d")
    tomorrow = (
        datetime.now() + timedelta(days=1)
    ).strftime("%Y-%m-%d")

    try:
        fixtures_data = await fixtures_with_odds(
            league=league,
            type=type,
            date_from=date_from or today,
            date_to=date_to or tomorrow,
            refresh=refresh,
        )
    except Exception as exc:
        # Prediction UI should remain usable when a provider/quota temporarily
        # fails. Return an empty, structured response rather than a raw HTTP 500.
        log.warning("AI predictions provider failure: %s", exc)
        return {
            "predictions": [], "matches": [], "count": 0,
            "eligibleFixtures": 0, "rejectedNoBookmaker1X2": 0,
            "winRateThreshold": WIN_RATE_THRESHOLD, "winRateGateActive": False,
            "winRateDescription": "Prediction service temporarily unavailable.",
            "source": "Kasi Sports News server model + API-Football bookmaker odds",
            "modelVersion": V141_MODEL_VERSION,
            "oddsRequired": "complete current bookmaker 1X2",
            "error": "Prediction service temporarily unavailable",
            "quota": dict(_quota_state),
            "generatedAt": datetime.now(timezone.utc).isoformat(),
        }

    eligible = []
    model_only = []
    rejected = 0

    # Resolve current season year for API-Football calls
    current_season = _current_season()

    for match in fixtures_data.get("matches", []):
        if match.get("isFinished"):
            continue

        if not _valid_1x2(match.get("odds", {})):
            rejected += 1
            # Keep a clearly-labelled statistical AI prediction available as a
            # fallback. It is not bookmaker-qualified and is never a Game of Day.
            pred_result = _prediction(match)
            try:
                _save_prediction_to_db(match, pred_result)
            except Exception as exc:
                log.debug("Model-only prediction snapshot not stored fixture=%s: %s", match.get("_afootFixtureId") or match.get("id"), exc)
            model_only.append({**match, **pred_result, "oddsAvailable":False, "bookmakerGatePassed":False, "predictionEligible":False, "gamesOfDayEligible":False, "modelOnly":True, "predictionBasis":"available team/statistical data; no current bookmaker 1X2"})
            continue

        # Fast initial prediction: use the fixture + cached bookmaker data immediately.
        # Standings/form enrichment is deliberately not performed in this request because
        # it created a provider fan-out and left the homepage stuck on "Predictions loading".
        pred_result = _prediction(match)
        _save_prediction_to_db(match, pred_result)
        item = {
            **match,
            **pred_result,
            "oddsAvailable": True,
            "bookmakerGatePassed": True,
            "predictionEligible": True,
            "gamesOfDayEligible": True,
            # Expose win-rate metadata for the dashboard
            "homeWinRate":    match.get("_homeWinRate", None),
            "awayWinRate":    match.get("_awayWinRate", None),
            "homeGamesPlayed": match.get("_homeGamesPlayed", 0),
            "awayGamesPlayed": match.get("_awayGamesPlayed", 0),
        }
        eligible.append(item)

    # ── Confidence threshold ───────────────────────────────────────────────
    # Predictions below 52% are near-random but are still included so the
    # dashboard can show them. They are flagged with lowConfidenceFlag=True
    # so the UI can render a visual warning instead of hiding them entirely.
    MIN_CONFIDENCE = 52

    # ── Flag low-confidence and odds-model disagreement ────────────────────
    # lowConfidenceFlag is set when EITHER:
    #   • the model confidence is below 52 %, OR
    #   • bookmaker odds and our model disagree on the predicted winner
    #     (disagreement > 20 percentage points on the winner outcome).
    for p in eligible:
        probs = p["prediction"].get("probabilities", {})
        odds  = p.get("odds", {})
        conf  = p["prediction"].get("confidence", 0)

        winner_key = max(("homeWin", "draw", "awayWin"), key=lambda k: probs.get(k, 0))
        odds_key   = max(("homeWin", "draw", "awayWin"), key=lambda k: odds.get(k, 0) if odds.get(k, 0) > 0 else 0)

        odds_model_agree = (winner_key == odds_key)
        below_threshold  = conf < MIN_CONFIDENCE

        p["prediction"]["oddsModelAgree"]    = odds_model_agree
        p["prediction"]["belowConfidence"]   = below_threshold
        p["prediction"]["lowConfidenceFlag"] = below_threshold or not odds_model_agree

    eligible.sort(
        key=lambda x: (
            x["prediction"].get("oddsModelAgree", False),  # agreement first
            x["prediction"].get("confidence", 0),           # then by confidence
        ),
        reverse=True,
    )

    # Keep bookmaker-qualified picks first, then add model-only predictions.
    # Model-only rows remain clearly labelled and never qualify for Tip of the Day.
    ranked_model_only = sorted(model_only, key=lambda x: x.get("prediction",{}).get("confidence",0), reverse=True)
    display_predictions = (eligible + ranked_model_only)[:limit]
    return {
        "predictions": display_predictions,
        "matches": display_predictions,
        "count": len(display_predictions),
        "eligibleFixtures": len(eligible),
        "modelOnlyFixtures": len(model_only),
        "fallbackMode": bool(not eligible and model_only),
        "rejectedNoBookmaker1X2": rejected,
        "winRateThreshold": WIN_RATE_THRESHOLD,
        "winRateGateActive": False,
        "winRateDescription": "Win-rate gate disabled — all fixtures with valid bookmaker 1X2 odds qualify.",
        "source": "Kasi Sports News server model + API-Football bookmaker odds",
        "modelVersion": V141_MODEL_VERSION,
        "oddsRequired": "complete current bookmaker 1X2",
        "quota": dict(_quota_state),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }

@app.get("/prediction-markets")
async def prediction_markets(
    limit: int = Query(20, ge=1, le=100),
):
    data = await ai_predictions(
        limit=limit, refresh=0, league="ALL", type="upcoming",
        date_from=None, date_to=None
    )
    return {
        **data,
        "cache": {
            "ttlHours": 0.5,
            "savedAt": datetime.now(timezone.utc).isoformat(),
        },
    }

@app.get("/dashboard-summary")
async def dashboard_summary(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    pred_limit: int = Query(20, ge=1, le=100),
):
    d0 = date_from or datetime.now().strftime("%Y-%m-%d")
    d1 = date_to or (
        datetime.now() + timedelta(days=1)
    ).strftime("%Y-%m-%d")

    fixtures_data = await fixtures_with_odds(
        league="ALL",
        type="upcoming",
        date_from=d0,
        date_to=d1,
        refresh=0,
    )
    live_data = await live("ALL", refresh=0)

    predictions = []

    for match in fixtures_data.get("matches", []):
        if match.get("isFinished"):
            continue
        if not _valid_1x2(match.get("odds", {})):
            continue

        pred_result = _prediction(match)
        _save_prediction_to_db(match, pred_result)
        predictions.append({
            **match,
            **pred_result,
            "oddsAvailable": True,
            "bookmakerGatePassed": True,
            "predictionEligible": True,
            "gamesOfDayEligible": True,
        })

    predictions.sort(
        key=lambda x: x["prediction"]["confidence"],
        reverse=True,
    )

    return {
        "fixtures": fixtures_data.get("matches", []),
        "live": live_data.get("matches", []),
        "predictions": predictions[:pred_limit],
        "quota": dict(_quota_state),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }

# ---------------------------------------------------------------------------
# LEARNING
# ---------------------------------------------------------------------------

@app.post("/learning/trigger")
async def trigger_learning_cycle():
    """
    Manually trigger a full learning cycle:
    - Auto-resolves finished fixtures from API-Football
    - Re-scores ALL pending predictions with updated KasiScore AI Model weights
    - Clears prediction cache so /ai-predictions immediately returns improved data
    """
    try:
        await _run_learning_cycle()
        v141_cache.clear()  # force fresh predictions on next /ai-predictions call
        stats = v141_learning.stats()
        return {
            "triggered": True,
            "cycleCount": _learning_state["cycleCount"],
            "updated": _learning_state["lastCycleUpdated"],
            "improved": _learning_state["lastCycleImproved"],
            "autoResolved": _learning_state.get("lastAutoResolved", 0),
            "nextRunAt": _learning_state["nextRunAt"],
            "totalPredictions": stats["totalPredictions"],
            "resolvedPredictions": stats["resolvedPredictions"],
            "pendingPredictions": stats["pendingPredictions"],
            "modelVersion": V141_MODEL_VERSION,
            "adaptedWeights": _learning_state["adaptedWeights"],
        }
    except Exception as exc:
        log.error("Learning trigger error: %s", exc)
        raise HTTPException(500, detail=str(exc))

@app.get("/learning/status")
async def learning_status():
    """Return current learning cycle state without triggering anything."""
    return {
        **v141_learning.stats(),
        "learningCycle": {
            "cycleCount":        _learning_state["cycleCount"],
            "lastRunAt":         _learning_state["lastRunAt"],
            "nextRunAt":         _learning_state["nextRunAt"],
            "status":            _learning_state["status"],
            "lastCycleUpdated":  _learning_state["lastCycleUpdated"],
            "lastCycleImproved": _learning_state["lastCycleImproved"],
            "adaptedWeights":    _learning_state["adaptedWeights"],
            "baseWeights":       V141_PREDICTION_WEIGHTS,
            "intervalHours":     V141_LEARNING_CYCLE_SECS // 3600,
        },
        "modelVersion": V141_MODEL_VERSION,
    }


@app.get("/learning-stats")
async def learning_stats():
    return {
        **v141_learning.stats(),
        "modelVersion": V141_MODEL_VERSION,
        "predictionWeights": V141_PREDICTION_WEIGHTS,
    }

@app.get("/ml/stats")
async def ml_stats():
    return await learning_stats()

@app.get("/prediction-cycle-status")
async def prediction_cycle_status():
    return {
        "running": True,
        "status": "active",
        "message": (
            "Background tasks running: fixtures every 30 min, "
            "prediction cache every 5 min."
        ),
        "fixtureRefreshMins": V141_FIXTURE_REFRESH_SECONDS // 60,
        "predictionRefreshMins": V141_PREDICTION_REFRESH_SECS // 60,
        "modelVersion": V141_MODEL_VERSION,
        "predictionWeights": V141_PREDICTION_WEIGHTS,
    }

@app.get("/best-predictions")
async def best_predictions(
    limit: int = Query(20, ge=1, le=100),
    candidates: int = Query(200, ge=1, le=500),
):
    # Cutoff in plain "YYYY-MM-DD HH:MM" format to match the kickoff strings
    # stored by _normalise_fixture (e.g. "2026-08-21 18:00").
    # ISO format (with T and +00:00) compares incorrectly against those strings
    # because space (ASCII 32) < "T" (ASCII 84), making ALL kickoffs invisible.
    cutoff = (
        datetime.now(timezone.utc) - timedelta(hours=3)
    ).strftime("%Y-%m-%d %H:%M")

    with v141_learning.connect() as conn:
        rows = conn.execute(
            """
            SELECT id,fixture_id,kickoff,home_team,away_team,
                   model_version,probabilities,odds,model_inputs,
                   prediction,predicted_at,resolved
            FROM predictions
            WHERE resolved=0
            AND (kickoff IS NULL OR kickoff >= ?)
            ORDER BY predicted_at DESC
            LIMIT ?
            """,
            (cutoff, candidates),
        ).fetchall()

    items = []

    for row in rows:
        item = dict(row)

        for field in (
            "probabilities",
            "odds",
            "model_inputs",
            "prediction",
        ):
            try:
                item[field] = json.loads(item[field] or "{}")
            except Exception:
                item[field] = {}

        probabilities = item.get("probabilities") or {}
        outcomes = {
            "homeWin": float(probabilities.get("homeWin", 0) or 0),
            "draw": float(probabilities.get("draw", 0) or 0),
            "awayWin": float(probabilities.get("awayWin", 0) or 0),
        }

        best_key, best_probability = max(
            outcomes.items(),
            key=lambda x: x[1],
        )

        # Enrich with all stored market probability keys
        for k in ("over35", "over25", "over15", "over05", "btts",
                   "halfTimeHome", "halfTimeDraw", "halfTimeAway",
                   "firstTeamToScoreHome", "firstTeamToScoreAway",
                   "firstTeamToScore"):
            if k in probabilities:
                outcomes[k] = probabilities[k]

        home_name = item.get("home_team", "")
        away_name = item.get("away_team", "")

        item.update({
            "home": home_name,
            "away": away_name,
            "homeTeam": home_name,
            "awayTeam": away_name,
            "datetime": item.get("kickoff") or "",
            "status": "Upcoming",
            "score": "vs",
            "predictionId": item.pop("id"),
            "fixtureId": item.pop("fixture_id"),
            "_afootFixtureId": item.get("fixtureId"),
            "bestOutcome": best_key,
            "confidence": best_probability,
            "probabilities": outcomes,
            "markets": {
                "over35": outcomes.get("over35"),
                "over25": outcomes.get("over25"),
                "over15": outcomes.get("over15"),
                "over05": outcomes.get("over05"),
                "btts": outcomes.get("btts"),
                "halfTime": {
                    "home": outcomes.get("halfTimeHome"),
                    "draw": outcomes.get("halfTimeDraw"),
                    "away": outcomes.get("halfTimeAway"),
                },
                "firstTeamToScore": outcomes.get("firstTeamToScore"),
                "firstTeamToScoreHome": outcomes.get("firstTeamToScoreHome"),
                "firstTeamToScoreAway": outcomes.get("firstTeamToScoreAway"),
            },
        })

        items.append(item)

    items.sort(
        key=lambda x: float(x.get("confidence", 0) or 0),
        reverse=True,
    )

    return {
        "predictions": items[:limit],
        "matches": items[:limit],
        "candidates": items[:limit],
        "count": len(items[:limit]),
        "limit": limit,
        "source": "local-learning-db",
        "modelVersion": V141_MODEL_VERSION,
    }

class V141PredictionPayload(BaseModel):
    fixtureId: int
    kickoff: Optional[str] = None
    homeTeam: Optional[str] = None
    awayTeam: Optional[str] = None
    probabilities: Dict[str, Any] = Field(default_factory=dict)  # Any: floats + firstTeamToScore string
    odds: Dict[str, Any] = Field(default_factory=dict)
    modelInputs: Dict[str, Any] = Field(default_factory=dict)
    prediction: Dict[str, Any] = Field(default_factory=dict)
    modelVersion: str = V141_MODEL_VERSION

@app.post("/ml/predictions")
async def save_prediction(payload: V141PredictionPayload):
    return {
        "saved": True,
        "record": v141_learning.save_prediction(
            payload.model_dump()
        ),
    }

@app.post("/ml/results/{fixture_id}")
async def save_result(
    fixture_id: int,
    home_goals: int = Query(...),
    away_goals: int = Query(...),
    actual_result: str = Query(...),
):
    with v141_learning.connect() as conn:
        row = conn.execute(
            """
            SELECT id, probabilities FROM predictions
            WHERE fixture_id=? AND resolved=0
            ORDER BY id DESC LIMIT 1
            """,
            (fixture_id,),
        ).fetchone()

    if not row:
        return {
            "saved": False,
            "fixtureId": fixture_id,
            "reason": "no_pending_prediction",
        }

    # Grade each market against the actual result
    try:
        probs = json.loads(row["probabilities"] or "{}")
        total_goals = home_goals + away_goals
        btts_actual = home_goals > 0 and away_goals > 0

        predicted_winner = (
            "homeWin" if probs.get("homeWin", 0) >= probs.get("awayWin", 0)
                         and probs.get("homeWin", 0) >= probs.get("draw", 0)
            else "draw" if probs.get("draw", 0) >= probs.get("awayWin", 0)
            else "awayWin"
        )

        market_accuracy = {
            "predictedWinner": predicted_winner,
            "actualResult": actual_result,
            "winnerCorrect": (
                predicted_winner == actual_result
                if actual_result in ("homeWin", "draw", "awayWin")
                else None
            ),
            "over35Correct": (total_goals > 3) == (probs.get("over35", 0) >= 50),
            "over25Correct": (total_goals > 2) == (probs.get("over25", 0) >= 50),
            "over15Correct": (total_goals > 1) == (probs.get("over15", 0) >= 50),
            "over05Correct": (total_goals > 0) == (probs.get("over05", 0) >= 50),
            "bttsCorrect": btts_actual == (probs.get("btts", 0) >= 50),
            "totalGoals": total_goals,
            "gradedAt": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as exc:
        log.warning("market_accuracy grading error for fixture %s: %s", fixture_id, exc)
        market_accuracy = {}

    v141_learning.save_result(
        int(row["id"]),
        fixture_id,
        home_goals,
        away_goals,
        actual_result,
        market_accuracy,
    )

    return {
        "saved": True,
        "fixtureId": fixture_id,
        "marketAccuracy": market_accuracy,
    }

# ---------------------------------------------------------------------------
# LEARNING — /learning/missed-today
# ---------------------------------------------------------------------------

@app.get("/learning/missed-today")
async def learning_missed_today():
    """
    Dashboard Learning widget data feed.
    Returns live stats, accuracy, future predictions and unknown outcomes.
    """
    stats = v141_learning.stats()
    # stats() now computes accuracy directly; use it if available
    accuracy = stats.pop("accuracy", None)

    # Future pending predictions (kickoff in the future or no kickoff stored)
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")
    best = []
    try:
        with v141_learning.connect() as conn:
            rows = conn.execute(
                """
                SELECT id, fixture_id, kickoff, home_team, away_team,
                       model_version, probabilities, prediction, predicted_at
                FROM predictions
                WHERE resolved=0
                  AND (kickoff IS NULL OR kickoff > ?)
                ORDER BY kickoff ASC, predicted_at DESC
                LIMIT 50
                """,
                (now_str,),
            ).fetchall()

        for row in rows:
            item = dict(row)
            for field in ("probabilities", "prediction"):
                try:
                    item[field] = json.loads(item[field] or "{}")
                except Exception:
                    item[field] = {}

            probs = item.get("probabilities") or {}
            outcomes = {
                "homeWin": float(probs.get("homeWin", 0) or 0),
                "draw":    float(probs.get("draw",    0) or 0),
                "awayWin": float(probs.get("awayWin", 0) or 0),
            }
            best_key, best_prob = max(outcomes.items(), key=lambda x: x[1])

            best.append({
                "fixtureId":   item.get("fixture_id"),
                "home":        item.get("home_team", ""),
                "away":        item.get("away_team", ""),
                "kickoff":     item.get("kickoff", ""),
                "bestOutcome": best_key,
                "confidence":  round(float(best_prob), 1),
                "probabilities": probs,
                "modelVersion": V141_MODEL_VERSION,   # always current name
            })

        best.sort(key=lambda x: float(x.get("confidence", 0) or 0), reverse=True)

    except Exception as exc:
        log.warning("learning/missed-today best-predictions query error: %s", exc)

    # Fetch games with unknown outcome: resolved=0, kickoff has passed, not in best (future)
    unknown_outcomes = []
    try:
        cutoff_unk = (datetime.now(timezone.utc) - timedelta(minutes=105)).strftime("%Y-%m-%d %H:%M")
        with v141_learning.connect() as conn:
            unk_rows = conn.execute(
                """
                SELECT id, fixture_id, kickoff, home_team, away_team,
                       model_version, probabilities, predicted_at
                FROM predictions
                WHERE resolved=0
                  AND kickoff IS NOT NULL
                  AND kickoff <= ?
                ORDER BY kickoff DESC
                LIMIT 30
                """,
                (cutoff_unk,),
            ).fetchall()
        for r in unk_rows:
            item = dict(r)
            try:
                probs = json.loads(item["probabilities"] or "{}")
            except Exception:
                probs = {}
            item["probabilities"] = probs
            outcomes = {
                "homeWin": float(probs.get("homeWin", 0) or 0),
                "draw":    float(probs.get("draw",    0) or 0),
                "awayWin": float(probs.get("awayWin", 0) or 0),
            }
            best_key, best_prob = max(outcomes.items(), key=lambda x: x[1])
            unknown_outcomes.append({
                "fixtureId": item["fixture_id"],
                "home": item["home_team"] or "Home",
                "away": item["away_team"] or "Away",
                "kickoff": item["kickoff"],
                "predictedWinner": best_key,
                "confidence": round(best_prob, 1),
                "probabilities": probs,
                "modelVersion": item["model_version"],
                "predictedAt": item["predicted_at"],
                "status": "unknown_outcome",
            })
    except Exception as exc:
        log.warning("learning/missed-today unknown_outcomes query error: %s", exc)

    return {
        **stats,
        "accuracy": accuracy,
        "modelVersion": V141_MODEL_VERSION,
        "predictionWeights": _learning_state["adaptedWeights"],
        "baseWeights": V141_PREDICTION_WEIGHTS,
        "bestPredictions": best,
        "count": len(best),
        "resolvedPredictions": stats.get("resolvedPredictions", 0),
        "pendingPredictions": stats.get("pendingPredictions", 0),
        "unknownOutcomes": unknown_outcomes,
        "unknownOutcomeCount": len(unknown_outcomes),
        "lastAutoResolved": _learning_state.get("lastAutoResolved", 0),
        "improvementsNeeded": _learning_state.get("lastCycleImproved", 0),
        "improvementsDone": _learning_state.get("lastCycleUpdated", 0),
        "learningCycle": {
            "cycleCount":        _learning_state["cycleCount"],
            "lastRunAt":         _learning_state["lastRunAt"],
            "nextRunAt":         _learning_state["nextRunAt"],
            "status":            _learning_state["status"],
            "lastCycleUpdated":  _learning_state["lastCycleUpdated"],
            "lastCycleImproved": _learning_state["lastCycleImproved"],
            "autoResolved":      _learning_state.get("lastAutoResolved", 0),
            "adaptedWeights":    _learning_state["adaptedWeights"],
            "intervalHours":     V141_LEARNING_CYCLE_SECS // 3600,
        },
    }


# ---------------------------------------------------------------------------
# LEARNING — /learning/recent-results  (last 3 days of resolved games)
# ---------------------------------------------------------------------------

@app.get("/learning/recent-results")
async def learning_recent_results():
    """
    Returns resolved predictions from the last 3 days, split into
    correctly-guessed and incorrectly-guessed lists.
    Old entries (>3 days) are automatically excluded.
    """
    cutoff = (datetime.now(timezone.utc) - timedelta(days=3)).strftime("%Y-%m-%d %H:%M")
    correct_games = []
    wrong_games = []
    try:
        with v141_learning.connect() as conn:
            rows = conn.execute(
                """
                SELECT p.home_team, p.away_team, p.kickoff,
                       r.actual_result, r.market_accuracy, r.resolved_at
                FROM results r
                JOIN predictions p ON p.id = r.prediction_id
                WHERE r.resolved_at >= ?
                ORDER BY r.resolved_at DESC
                LIMIT 200
                """,
                (cutoff,),
            ).fetchall()
        for row in rows:
            try:
                ma = json.loads(row["market_accuracy"] or "{}")
            except Exception:
                ma = {}
            entry = {
                "home":           row["home_team"] or "Home",
                "away":           row["away_team"] or "Away",
                "kickoff":        row["kickoff"] or "",
                "resolvedAt":     row["resolved_at"],
                "actualResult":   row["actual_result"] or "",
                "predictedWinner": ma.get("predictedWinner", ""),
                "homeGoals":      ma.get("homeGoals"),
                "awayGoals":      ma.get("awayGoals"),
                "winnerCorrect":  ma.get("winnerCorrect", False),
            }
            if ma.get("winnerCorrect"):
                correct_games.append(entry)
            else:
                wrong_games.append(entry)
    except Exception as exc:
        log.warning("learning/recent-results error: %s", exc)

    return {
        "cutoffDays": 3,
        "correctGames": correct_games,
        "wrongGames": wrong_games,
        "totalCorrect": len(correct_games),
        "totalWrong": len(wrong_games),
    }


# ---------------------------------------------------------------------------
# API-FOOTBALL COMPATIBILITY ROUTES
# ---------------------------------------------------------------------------

async def _v141_existing_api_call(path, params):
    try:
        return await _afoot_get(path, params)
    except HTTPException as exc:
        log.warning(
            "API adapter call failed: %s %s — %s",
            path,
            params,
            exc.detail,
        )
        return {
            "get": path.lstrip("/"),
            "parameters": params,
            "results": 0,
            "response": [],
            "error": str(exc.detail),
        }

async def _v141_cached_provider(path, params):
    key = path + ":" + json.dumps(
        params,
        sort_keys=True,
        default=str,
    )

    cached = v141_cache.get(key)
    if cached is not None:
        value = dict(cached)
        value["cache"] = {
            "hit": True,
            "ttlSeconds": V141_CACHE_TTL_SECONDS,
        }
        return value

    value = await _v141_existing_api_call(path, params)
    v141_cache.set(key, value)

    value = dict(value)
    value["cache"] = {
        "hit": False,
        "ttlSeconds": V141_CACHE_TTL_SECONDS,
    }
    return value

@app.get("/api-football/fixtures")
async def api_football_fixtures(
    date: Optional[str] = Query(None),
    timezone: Optional[str] = Query(None),
    league: Optional[int] = Query(None),
    season: Optional[int] = Query(None),
    team: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
):
    params = {
        k: v
        for k, v in {
            "date": date,
            "timezone": timezone or TIMEZONE,
            "league": league,
            "season": season,
            "team": team,
            "status": status,
        }.items()
        if v is not None
    }
    return await _v141_cached_provider("/fixtures", params)

@app.get("/api-football/odds")
async def api_football_odds(
    fixture: Optional[int] = Query(None),
    league: Optional[int] = Query(None),
    season: Optional[int] = Query(None),
):
    params = {
        k: v
        for k, v in {
            "fixture": fixture,
            "league": league,
            "season": season,
        }.items()
        if v is not None
    }
    return await _v141_cached_provider("/odds", params)


@app.get("/standings/2026-27")
async def standings_current_season(
    league: str = Query("ALL"),
):
    """League tables for the 2026/27 season only (season hardcoded to 2026).

    Pass league=<name|id> for a single league, or league=ALL for every
    league in SCAN_LEAGUES.  Results are cached for 1 hour.
    """
    SEASON = 2026
    _cache_key = f"standings2627:{league}"
    cached = _standings_cache.get(_cache_key)
    if cached is not None:
        return cached

    async def _fetch_one(lid: int, name: str) -> dict:
        fallback_season = SEASON
        try:
            data = await _afoot_get("/standings", {"league": lid, "season": SEASON})
            response_list = data.get("response", [])
            # Some competitions publish the new season later than the football
            # calendar. Keep the page useful by falling back to the immediately
            # previous season when the current season has no table yet.
            if not response_list:
                prev = SEASON - 1
                prev_data = await _afoot_get("/standings", {"league": lid, "season": prev})
                response_list = prev_data.get("response", [])
                fallback_season = prev
            else:
                fallback_season = SEASON
            standings_outer = (
                response_list[0].get("league", {}).get("standings", [])
                if response_list else []
            )
            table = standings_outer[0] if standings_outer else []
            return {
                "league":   name,
                "leagueId": lid,
                "season":   fallback_season,
                "table": [
                    {
                        "rank":         e.get("rank"),
                        "team":         e.get("team", {}).get("name"),
                        "teamId":       e.get("team", {}).get("id"),
                        "logo":         e.get("team", {}).get("logo"),
                        "played":       e.get("all", {}).get("played", 0),
                        "win":          e.get("all", {}).get("win", 0),
                        "draw":         e.get("all", {}).get("draw", 0),
                        "lose":         e.get("all", {}).get("lose", 0),
                        "goalsFor":     e.get("all", {}).get("goals", {}).get("for", 0),
                        "goalsAgainst": e.get("all", {}).get("goals", {}).get("against", 0),
                        "goalDiff":     e.get("goalsDiff", 0),
                        "points":       e.get("points", 0),
                        "form":         e.get("form", ""),
                        "description":  e.get("description", ""),
                    }
                    for e in table
                ],
            }
        except Exception as exc:
            log.warning("standings_current_season league=%s error=%s", name, exc)
            return {"league": name, "leagueId": lid, "season": fallback_season, "table": [], "error": str(exc)}

    if league.upper() == "ALL":
        tasks = [
            _fetch_one(LEAGUE_IDS[name], name)
            for name in SCAN_LEAGUES
            if name in LEAGUE_IDS
        ]
        results = await asyncio.gather(*tasks, return_exceptions=False)
        out = {"season": "2026/27", "leagues": list(results)}
    else:
        lid = _resolve_league_id(league)
        league_name = _league_name_from_id(lid, league)
        out = {"season": "2026/27", "leagues": [await _fetch_one(lid, league_name)]}

    _standings_cache[_cache_key] = out
    return out


@app.get("/players/expected-scorers")
async def players_expected_scorers(
    min_chance: float = Query(80.0, ge=0.0, le=100.0),
    _t: Optional[int] = Query(None),
):
    """Players with an implied goalscoring probability >= min_chance (default 80%).

    Scans the learning DB for unresolved predictions that carry a bookmaker
    expectedGoalscorer decimal-odds value, converts to implied probability, and
    returns all fixtures where that probability meets the threshold.
    Results are sorted highest-probability first.
    """
    cache_key = f"expected_scorers:{min_chance}"
    if _t is None:
        cached = _players_cache.get(cache_key)
        if cached is not None:
            return cached

    rows = []
    try:
        with v141_learning.connect() as conn:
            rows = conn.execute(
                """
                SELECT fixture_id, home_team, away_team, kickoff,
                       probabilities, model_inputs
                FROM predictions
                WHERE resolved = 0
                ORDER BY kickoff ASC
                LIMIT 500
                """
            ).fetchall()
    except Exception as exc:
        log.warning("expected_scorers: DB read error: %s", exc)

    scorers: list[dict] = []
    seen: set[str] = set()

    for row in rows:
        try:
            probs_raw  = json.loads(row["probabilities"] or "{}")
            inputs_raw = json.loads(row["model_inputs"]  or "{}")
            eg_odds    = float(
                inputs_raw.get("expectedGoalscorer")
                or probs_raw.get("expectedGoalscorer")
                or 0
            )
            if eg_odds <= 1.0:
                continue
            implied_pct = round(100 / eg_odds, 1)
            if implied_pct < min_chance:
                continue
            key = f"{row['fixture_id']}:{eg_odds}"
            if key in seen:
                continue
            seen.add(key)
            scorers.append({
                "fixture":     f"{row['home_team']} vs {row['away_team']}",
                "fixtureId":   row["fixture_id"],
                "kickoff":     row["kickoff"],
                "homeTeam":    row["home_team"],
                "awayTeam":    row["away_team"],
                "oddsDecimal": eg_odds,
                "impliedPct":  implied_pct,
            })
        except Exception:
            pass

    # Also sweep the live odds cache
    for ck, odds_data in list(_odds_cache.items()):
        if not ck.startswith("odds:"):
            continue
        try:
            eg_odds = float(odds_data.get("odds", {}).get("expectedGoalscorer") or 0)
            if eg_odds <= 1.0:
                continue
            implied_pct = round(100 / eg_odds, 1)
            if implied_pct < min_chance:
                continue
            fid = ck.split(":", 1)[1]
            key = f"live:{fid}:{eg_odds}"
            if key in seen:
                continue
            seen.add(key)
            scorers.append({
                "fixture":     f"Fixture #{fid}",
                "fixtureId":   fid,
                "kickoff":     None,
                "homeTeam":    None,
                "awayTeam":    None,
                "oddsDecimal": eg_odds,
                "impliedPct":  implied_pct,
            })
        except Exception:
            pass

    scorers.sort(key=lambda x: x["impliedPct"], reverse=True)
    result = {
        "minChancePct": min_chance,
        "count":        len(scorers),
        "season":       "2026/27",
        "scorers":      scorers,
    }
    _players_cache[cache_key] = result
    return result


@app.get("/api-football/standings")
async def api_football_standings(
    league: int = Query(...),
    season: int = Query(...),
):
    return await _v141_cached_provider(
        "/standings",
        {"league": league, "season": season},
    )

@app.get("/api-football/predictions")
async def api_football_predictions(
    fixture: Optional[int] = Query(None),
):
    components = {
        k: {
            "homeWin": 1 / 3,
            "draw": 1 / 3,
            "awayWin": 1 / 3,
        }
        for k in V141_PREDICTION_WEIGHTS
    }

    return {
        "fixtureId": fixture,
        "modelVersion": V141_MODEL_VERSION,
        "prediction": v141_weight_prediction(components),
        "placeholderComponents": True,
    }

# ---------------------------------------------------------------------------
# CONFIG / DIAGNOSTICS
# ---------------------------------------------------------------------------

@app.get("/odds/diagnostics")
async def odds_diagnostics():
    return {
        "quota": dict(_quota_state),
        "preMatchCached": sum(
            1
            for value in _odds_cache.values()
            if isinstance(value, dict)
            and _valid_1x2(value.get("odds", {}))
        ),
        "liveCached": len(_live_cache),
        "rateLimitPerMinute": RATE_LIMIT_PER_MINUTE,
        "kasiScoreDailyBudget": KASISCORE_DAILY_BUDGET,
        "providerReserve": KASISCORE_PROVIDER_RESERVE,
        "oddsFallback": {
            "enabled": ODDS_API_ENABLED,
            "configured": bool(ODDS_API_KEY),
            "timeoutSeconds": ODDS_API_TIMEOUT,
            "regions": ODDS_API_REGIONS,
            "markets": ODDS_API_MARKETS,
        },
        "message": (
            "Use /live for in-play odds and predictions; "
            "/fixtures/with-odds or /odds for pre-match bookmaker odds."
        ),
    }



# ============================================================================
# MULTI-SPORT PLATFORM — PHASE 1 → PHASE 3
# Football remains on the existing API-Football engine. Rugby/Basketball use
# API-Sports when configured, while cricket/tennis and other sports use the
# ESPN public JSON feeds. News is headline/link metadata only; no copyrighted
# article body is republished.
# ============================================================================
import urllib.parse
import xml.etree.ElementTree as ET

SPORTS_CACHE = TTLCache(maxsize=200, ttl=60)  # v184: cross-sport live cache
NEWS_CACHE = TTLCache(maxsize=100, ttl=300)
SPORTS_HTTP: Optional[httpx.AsyncClient] = None

SPORTS_API_KEYS = {
    "rugby": os.getenv("RUGBY_API_KEY", ""),
    "basketball": "",
    "football": API_KEY,
}
SPORTS_API_BASES = {
    "rugby": "https://v1.rugby.api-sports.io",
    "basketball": "",
}
ESPN_LEAGUES = {
    "cricket": ["sa20", "icc", "domestic", "test", "odi", "t20"],
    "tennis": ["atp", "wta"],
    "basketball": ["nba"],
    "rugby": ["rugby/union", "rugby/club"],
    "american-football": ["nfl"],
    "baseball": ["mlb"],
    "hockey": ["nhl"],
    "golf": ["pga", "lpga"],
    "motorsport": ["f1"],
    "mma": ["ufc"],
}
SPORT_LABELS = {"football":"Football", "rugby":"Rugby", "cricket":"Cricket"}

async def _sports_client():
    global SPORTS_HTTP
    if SPORTS_HTTP is None or SPORTS_HTTP.is_closed:
        SPORTS_HTTP = httpx.AsyncClient(timeout=httpx.Timeout(18, connect=5), headers={"User-Agent": "KasiScore-Sports-Platform/1.0"})
    return SPORTS_HTTP

async def _sports_get(url: str, params: dict | None = None, headers: dict | None = None):
    c = await _sports_client()
    r = await c.get(url, params=params or {}, headers=headers or {})
    r.raise_for_status()
    return r.json()

def _espn_event(e: dict, sport: str, league: str):
    comps = (e.get("competitions") or [])
    comp = comps[0] if comps else {}
    competitors = comp.get("competitors") or []
    home = next((x for x in competitors if x.get("homeAway") == "home"), competitors[0] if competitors else {})
    away = next((x for x in competitors if x.get("homeAway") == "away"), competitors[1] if len(competitors)>1 else {})
    status = e.get("status") or comp.get("status") or {}
    st = status.get("type") or {}
    return {
        "id": str(e.get("id", "")), "sport": sport, "league": (e.get("league") or {}).get("name") or league,
        "leagueSlug": league, "date": e.get("date"),
        "home": (home.get("team") or {}).get("displayName") or home.get("athlete", {}).get("displayName") or home.get("displayName") or "Home",
        "away": (away.get("team") or {}).get("displayName") or away.get("athlete", {}).get("displayName") or away.get("displayName") or "Away",
        "homeId": (home.get("team") or {}).get("id"), "awayId": (away.get("team") or {}).get("id"),
        "homeLogo": ((home.get("team") or {}).get("logo") or ""),
        "awayLogo": ((away.get("team") or {}).get("logo") or ""),
        "leagueLogo": ((e.get("league") or {}).get("logo") or ""),
        "homeScore": home.get("score"), "awayScore": away.get("score"),
        "status": st.get("name") or st.get("detail") or "Scheduled", "statusShort": st.get("state") or "pre",
        "venue": ((comp.get("venue") or {}).get("fullName") or ""),
        "source": "ESPN",
        "link": (e.get("links") or [{}])[0].get("href", "") if e.get("links") else "",
    }

def _apisports_event(g: dict, sport: str):
    teams = g.get("teams") or {}
    scores = g.get("scores") or {}
    fixture = g.get("fixture") or g.get("game") or {}
    status = fixture.get("status") or g.get("status") or {}
    return {
        "id": str(fixture.get("id") or g.get("id") or ""), "sport": sport,
        "league": (g.get("league") or {}).get("name", ""), "leagueSlug": str((g.get("league") or {}).get("id") or ""), "leagueLogo": (g.get("league") or {}).get("logo", ""), "leagueFlag": (g.get("country") or {}).get("flag", "") if isinstance(g.get("country"), dict) else "", "date": fixture.get("date") or g.get("date"),
        "home": (teams.get("home") or {}).get("name", "Home"), "away": (teams.get("away") or {}).get("name", "Away"),
        "homeId": (teams.get("home") or {}).get("id"), "awayId": (teams.get("away") or {}).get("id"),
        "homeLogo": (teams.get("home") or {}).get("logo", ""), "awayLogo": (teams.get("away") or {}).get("logo", ""),
        "homeScore": (scores.get("home") if isinstance(scores, dict) else None),
        "awayScore": (scores.get("away") if isinstance(scores, dict) else None),
        "status": status.get("long") or status.get("short") or "Scheduled", "statusShort": status.get("short") or "",
        "venue": ((fixture.get("venue") or {}).get("name") or ""), "source": "API-Sports",
    }

async def _apisports_scores(sport: str, date: str | None = None, live: bool = False):
    key = SPORTS_API_KEYS.get(sport)
    if not key or sport not in SPORTS_API_BASES:
        return []
    base = SPORTS_API_BASES[sport]
    headers = {"x-apisports-key": key, "Accept": "application/json"}
    params = {"live": "all"} if live else {"date": date or datetime.now().strftime("%Y-%m-%d")}
    data = await _sports_get(base + "/games", params, headers)
    return [_apisports_event(x, sport) for x in (data.get("response") or [])]

async def _espn_scores(sport: str, date: str | None = None, league: str | None = None):
    # Cricket is split across several ESPN league feeds. Query the useful
    # South-African/international feeds instead of relying on one generic
    # "domestic" feed, which can legitimately return no events.
    leagues = [league] if league else ESPN_LEAGUES.get(sport, [])
    out=[]
    seen=set()
    for lg in leagues:
        url=f"https://site.api.espn.com/apis/site/v2/sports/{sport}/{lg}/scoreboard"
        params={}
        if date: params["dates"]=date.replace("-", "")
        try:
            data=await _sports_get(url, params)
            for e in (data.get("events") or []):
                item=_espn_event(e, sport, lg)
                eid=str(item.get("id") or "")
                if eid and eid in seen: continue
                if eid: seen.add(eid)
                out.append(item)
        except Exception as exc:
            log.debug("ESPN %s/%s failed: %s", sport, lg, exc)
    return out

async def _attach_odds_api_to_sport_games(games: list[dict], sport: str) -> list[dict]:
    """Attach real The Odds API h2h prices to cross-sport games when a match exists.
    This never fabricates an odds value; unmatched games simply remain without odds.
    """
    if not games or not ODDS_API_ENABLED or not ODDS_API_KEY:
        return games
    keys={
        "cricket": ["cricket_international_t20", "cricket_odi", "cricket_test_match", "cricket_t20"],
    }.get(sport, [])
    if not keys: return games
    events=[]
    for key in keys:
        try:
            data=await _odds_api_get(f"/sports/{key}/odds", {"regions":ODDS_API_REGIONS,"markets":ODDS_API_MARKETS,"oddsFormat":"decimal"})
            if isinstance(data,list): events.extend(data)
        except Exception as exc:
            log.debug("Odds API %s failed: %s", key, exc)
    for game in games:
        match=next((e for e in events if _event_matches_fixture(e, game)), None)
        if not match: continue
        game["odds"]=_normalise_odds_api_event(match)
        game["oddsSource"]="The Odds API"
        game["oddsApiEventId"]=match.get("id")
        game["oddsAvailable"]=_valid_1x2(game["odds"])
    return games

async def _sports_scores(sport: str, date: str | None = None, live: bool = False, league: str | None = None):
    sport=sport.lower().strip()
    key=f"{sport}:{date or 'today'}:{live}:{league or 'all'}"
    if key in SPORTS_CACHE: return SPORTS_CACHE[key]
    out=[]
    if sport == "football":
        try:
            params={"live":"all"} if live else {"date": date or datetime.now().strftime("%Y-%m-%d")}
            if league: params["league"]=_resolve_league_id(league)
            fd=await _afoot_get("/fixtures", params)
            for f in (fd.get("response") or []):
                fs=f.get("fixture") or {}; ts=f.get("teams") or {}; goals=f.get("goals") or {}; st=fs.get("status") or {}
                out.append({"id":str(fs.get("id") or ""),"sport":"football","league":(f.get("league") or {}).get("name") or "Football","leagueSlug":str((f.get("league") or {}).get("id") or ""),"leagueLogo":(f.get("league") or {}).get("logo") or "","leagueFlag":(f.get("league") or {}).get("flag") or "","date":fs.get("date"),"home":(ts.get("home") or {}).get("name") or "Home","away":(ts.get("away") or {}).get("name") or "Away","homeId":(ts.get("home") or {}).get("id"),"awayId":(ts.get("away") or {}).get("id"),"homeLogo":(ts.get("home") or {}).get("logo") or "","awayLogo":(ts.get("away") or {}).get("logo") or "","homeScore":goals.get("home"),"awayScore":goals.get("away"),"status":st.get("long") or st.get("short") or "Scheduled","statusShort":st.get("short") or "","elapsed":st.get("elapsed") or 0,"venue":(fs.get("venue") or {}).get("name") or "","source":"API-Football"})
        except Exception as exc: log.warning("API-Football live/scores failed: %s", exc)
    elif sport == "rugby":
        # v184: do not hammer API-Sports with unauthorised requests when no rugby key is configured.
        if SPORTS_API_KEYS.get("rugby"):
            try: out=await _apisports_scores(sport, date, live)
            except Exception as exc: log.warning("API-Sports %s failed: %s", sport, exc)
        else:
            log.debug("Rugby API key not configured; using ESPN fallback")
    if not out and not live:
        out=await _espn_scores(sport, date, league)
    elif not out and live:
        out=await _espn_scores(sport, date, league)
        out=[x for x in out if str(x.get("statusShort") or "").lower() in ("in","live") or re.search(r"live|progress|halftime|period|quarter|inning|1h|2h|ht|et", str(x.get("status") or ""), re.I)]
    if sport == "cricket" and out:
        try:
            out = await _attach_odds_api_to_sport_games(out, sport)
        except Exception as exc:
            log.debug("Cricket odds enrichment failed: %s", exc)
    # Newest/live first, then kickoff.
    out=sorted(out, key=lambda x: (x.get("statusShort") != "in", x.get("date") or ""))
    SPORTS_CACHE[key]=out
    return out

async def _publisher_rss(feed_url: str, publisher: str, limit: int = 12):
    """Fetch a publisher RSS feed and preserve media/enclosure images when supplied."""
    key=f"publisher-rss:{feed_url}:{limit}"
    if key in NEWS_CACHE: return NEWS_CACHE[key]
    c=await _sports_client()
    r=await c.get(feed_url, headers={"User-Agent":"KasiScore/178 (+news aggregation)"})
    r.raise_for_status()
    root=ET.fromstring(r.text)
    items=[]
    for item in root.findall(".//item")[:limit]:
        title=(item.findtext("title") or "").strip()
        link=(item.findtext("link") or "").strip()
        pub=(item.findtext("pubDate") or "").strip()
        source=item.find("source")
        src=(source.text or publisher) if source is not None else publisher
        image=""
        for ns in ("http://search.yahoo.com/mrss/","http://search.yahoo.com/mrss"):
            for tag in ("content","thumbnail"):
                media=item.find(f"{{{ns}}}{tag}")
                if media is not None and media.attrib.get("url"):
                    image=media.attrib.get("url"); break
            if image: break
        if not image:
            enc=item.find("enclosure")
            if enc is not None: image=enc.attrib.get("url","")
        if not image:
            desc=item.findtext("description") or ""
            m=re.search(r"<img[^>]+(?:src|data-src|url)=[\"\']([^\"\']+)",desc,re.I)
            if m: image=unescape(m.group(1))
        items.append({"title":title,"link":link,"published":pub,"source":src,"publisher":publisher,"image":image})
    NEWS_CACHE[key]=items
    return items


def _is_generic_news_image(url: str) -> bool:
    u=(url or "").strip().lower()
    if not u:
        return True
    try:
        host=(urllib.parse.urlparse(u).hostname or "").lower()
    except Exception:
        host=""
    if any(x in host for x in ("google.", "gstatic.", "googleusercontent.")):
        return True
    return any(x in u for x in (
        "news.google", "google.com/images", "google_news", "googlelogo",
        "favicon", "branding", "logo_google", "googleg/",
        "/logo/", "/logos/", "logo.", "logo_", "logo-",
        "placeholder", "default-image", "default_image", "sprite"
    ))

async def _google_news(query: str, limit: int = 20):
    q=urllib.parse.quote(query)
    url=f"https://news.google.com/rss/search?q={q}&hl=en-ZA&gl=ZA&ceid=ZA:en"
    key=f"news:{query}:{limit}"
    if key in NEWS_CACHE: return NEWS_CACHE[key]
    c=await _sports_client()
    r=await c.get(url); r.raise_for_status()
    root=ET.fromstring(r.text)
    items=[]
    for item in root.findall(".//item")[:limit]:
        title=(item.findtext("title") or "").strip()
        link=(item.findtext("link") or "").strip()
        pub=(item.findtext("pubDate") or "").strip()
        source=item.find("source")
        src=(source.text or "") if source is not None else "News"
        # Google News RSS can expose a media thumbnail/enclosure. Keep only the
        # remote image URL; article pages remain the publisher's canonical page.
        thumb=""
        media = item.find("{http://search.yahoo.com/mrss/}content") or item.find("{http://search.yahoo.com/mrss/}thumbnail")
        if media is not None:
            thumb = media.attrib.get("url","")
        # Some Google News feeds put the publisher image only inside the
        # description HTML. Extract that image as a fast, publisher-supplied
        # thumbnail instead of making a second request to the article page.
        desc = item.findtext("description") or ""
        publisher_link=""
        for hm in re.finditer(r'href=["\\\']([^"\\\']+)["\\\']', desc, re.I):
            cand=unescape(hm.group(1))
            host=(urllib.parse.urlparse(cand).hostname or "").lower()
            if cand.startswith(("http://","https://")) and "google." not in host:
                publisher_link=cand
                break
        if not thumb:
            m = re.search(r'<img[^>]+(?:src|data-src|url)=["\\\']([^"\\\']+)["\\\']', desc, re.I)
            if m:
                thumb = unescape(m.group(1))
        if not thumb:
            enc=item.find("enclosure")
            if enc is not None and str(enc.attrib.get("type","")).startswith("image/"):
                thumb=enc.attrib.get("url","")
        items.append({"title":title,"link":link,"publisherLink":publisher_link,"published":pub,"source":src,"image":("" if _is_generic_news_image(thumb) else thumb),"imageOrigin":("rss" if thumb and not _is_generic_news_image(thumb) else "")})
    # Async best-effort OG image fetch for items missing thumbnails (max 4 at once, 2s timeout)
    async def _fetch_og(item):
        if item.get("image"): return
        try:
            c2=await _sports_client()
            r2=await c2.get(item.get("publisherLink") or item["link"],timeout=3.0,follow_redirects=True,headers={"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36","Accept":"text/html,application/xhtml+xml"})
            m2=re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']',r2.text,re.I)
            if not m2:
                m2=re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']',r2.text,re.I)
            if m2: item["image"]=unescape(m2.group(1))
        except Exception: pass
    no_img=[it for it in items if not it.get("image")]
    if no_img:
        await asyncio.gather(*[_fetch_og(it) for it in no_img[:8]], return_exceptions=True)
    NEWS_CACHE[key]=items
    return items


@app.get("/sports/news/image")
async def sports_news_image(url: str = Query(...)):
    """Same-origin proxy for publisher article images."""
    try:
        p=urllib.parse.urlparse(url)
        host=(p.hostname or "").lower()
        if p.scheme not in {"http","https"}:
            raise HTTPException(status_code=400,detail="Invalid image URL")
        if _is_generic_news_image(url) or host in {"localhost","127.0.0.1","::1"}:
            raise HTTPException(status_code=400,detail="Invalid image source")

        c=await _sports_client()
        base_headers={
            "User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
            "Accept":"image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
            "Accept-Language":"en-ZA,en;q=0.9",
        }

        attempts=[
            dict(base_headers,Referer=f"{p.scheme}://{p.netloc}/"),
            base_headers,
        ]
        last=None
        for headers in attempts:
            try:
                r=await c.get(url,follow_redirects=True,timeout=httpx.Timeout(9,connect=4),headers=headers)
                last=r
                if r.status_code<400 and (r.headers.get("content-type","").lower().startswith("image/")):
                    if len(r.content)>6_000_000:
                        raise HTTPException(status_code=413,detail="Image too large")
                    return Response(
                        content=r.content,
                        media_type=r.headers.get("content-type","image/jpeg").split(";")[0],
                        headers={"Cache-Control":"public, max-age=43200, stale-while-revalidate=86400"}
                    )
            except HTTPException:
                raise
            except Exception:
                continue

        status=last.status_code if last is not None else 404
        raise HTTPException(status_code=404,detail=f"Publisher image unavailable ({status})")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=404,detail=f"Image unavailable: {exc}")

@app.get("/sports/config")
async def sports_config():
    allowed={k:v for k,v in SPORT_LABELS.items() if k in {"football","rugby","cricket"}}
    return {"sports": allowed, "providers": {"football":"API-Football", "rugby":"API-Sports" if SPORTS_API_KEYS.get("rugby") else "ESPN fallback", "cricket":"ESPN"}}


# ── Kasi Sports News Competition Registry (Phase 1 → 4) ─────────────
# Central registry keeps the dashboard competition-aware instead of hard-coding
# individual leagues throughout the UI. API-Football resolves football names to
# provider IDs through the existing _resolve_league_id() path.
ALLOWED_PUBLIC_SPORTS = {"football","rugby","cricket"}

COMPETITION_REGISTRY = [
    # Football — priority competitions
    {"id":"epl","sport":"football","name":"Premier League","country":"England","continent":"Europe","tier":"major","priority":1,"slug":"premier-league","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"championship","sport":"football","name":"Championship","country":"England","continent":"Europe","tier":"major","priority":2,"slug":"championship","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"fa-cup","sport":"football","name":"FA Cup","country":"England","continent":"Europe","tier":"major","priority":3,"slug":"fa-cup","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"carabao-cup","sport":"football","name":"Carabao Cup","country":"England","continent":"Europe","tier":"major","priority":4,"slug":"carabao-cup","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"la-liga","sport":"football","name":"La Liga","country":"Spain","continent":"Europe","tier":"major","priority":5,"slug":"la-liga","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"copa-del-rey","sport":"football","name":"Copa del Rey","country":"Spain","continent":"Europe","tier":"major","priority":6,"slug":"copa-del-rey","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"serie-a","sport":"football","name":"Serie A","country":"Italy","continent":"Europe","tier":"major","priority":7,"slug":"serie-a","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"coppa-italia","sport":"football","name":"Coppa Italia","country":"Italy","continent":"Europe","tier":"major","priority":8,"slug":"coppa-italia","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"bundesliga","sport":"football","name":"Bundesliga","country":"Germany","continent":"Europe","tier":"major","priority":9,"slug":"bundesliga","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"dfb-pokal","sport":"football","name":"DFB-Pokal","country":"Germany","continent":"Europe","tier":"major","priority":10,"slug":"dfb-pokal","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"ligue-1","sport":"football","name":"Ligue 1","country":"France","continent":"Europe","tier":"major","priority":11,"slug":"ligue-1","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"coupe-de-france","sport":"football","name":"Coupe de France","country":"France","continent":"Europe","tier":"major","priority":12,"slug":"coupe-de-france","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"saudi-pro-league","sport":"football","name":"Saudi Pro League","country":"Saudi Arabia","continent":"Asia","tier":"major","priority":1,"slug":"saudi-pro-league","live":True,"predictions":True,"odds":True,"seo":True,"featured":True},
    {"id":"king-cup","sport":"football","name":"King's Cup","country":"Saudi Arabia","continent":"Asia","tier":"major","priority":2,"slug":"kings-cup","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"saudi-super-cup","sport":"football","name":"Saudi Super Cup","country":"Saudi Arabia","continent":"Asia","tier":"major","priority":3,"slug":"saudi-super-cup","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"psl","sport":"football","name":"PSL","country":"South Africa","continent":"Africa","tier":"priority","priority":1,"slug":"psl","live":True,"predictions":True,"odds":True,"seo":True,"featured":True},
    {"id":"mtn8","sport":"football","name":"MTN8","country":"South Africa","continent":"Africa","tier":"priority","priority":2,"slug":"mtn8","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"nedbank-cup","sport":"football","name":"Nedbank Cup","country":"South Africa","continent":"Africa","tier":"priority","priority":3,"slug":"nedbank-cup","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"carling-knockout","sport":"football","name":"Carling Knockout","country":"South Africa","continent":"Africa","tier":"priority","priority":4,"slug":"carling-knockout","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"champions-league","sport":"football","name":"Champions League","country":"Europe","continent":"Europe","tier":"major","priority":1,"slug":"champions-league","live":True,"predictions":True,"odds":True,"seo":True,"featured":True},
    {"id":"europa-league","sport":"football","name":"Europa League","country":"Europe","continent":"Europe","tier":"major","priority":2,"slug":"europa-league","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"conference-league","sport":"football","name":"Conference League","country":"Europe","continent":"Europe","tier":"major","priority":3,"slug":"conference-league","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"club-world-cup","sport":"football","name":"FIFA Club World Cup","country":"International","continent":"World","tier":"major","priority":4,"slug":"club-world-cup","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"primeira-liga","sport":"football","name":"Primeira Liga","country":"Portugal","continent":"Europe","tier":"major","priority":20,"slug":"primeira-liga","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"eredivisie","sport":"football","name":"Eredivisie","country":"Netherlands","continent":"Europe","tier":"major","priority":21,"slug":"eredivisie","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"super-lig","sport":"football","name":"Süper Lig","country":"Turkey","continent":"Europe","tier":"major","priority":22,"slug":"super-lig","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"belgian-pro-league","sport":"football","name":"Belgian Pro League","country":"Belgium","continent":"Europe","tier":"major","priority":23,"slug":"belgian-pro-league","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"scottish-premiership","sport":"football","name":"Scottish Premiership","country":"Scotland","continent":"Europe","tier":"major","priority":24,"slug":"scottish-premiership","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"mls","sport":"football","name":"MLS","country":"USA/Canada","continent":"North America","tier":"major","priority":25,"slug":"mls","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"leagues-cup","sport":"football","name":"Leagues Cup","country":"USA/Mexico/Canada","continent":"North America","tier":"major","priority":26,"slug":"leagues-cup","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"brasileirao","sport":"football","name":"Brasileirão","country":"Brazil","continent":"South America","tier":"major","priority":27,"slug":"brasileirao","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"copa-do-brasil","sport":"football","name":"Copa do Brasil","country":"Brazil","continent":"South America","tier":"major","priority":28,"slug":"copa-do-brasil","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"liga-profesional","sport":"football","name":"Liga Profesional","country":"Argentina","continent":"South America","tier":"major","priority":29,"slug":"liga-profesional","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"liga-mx","sport":"football","name":"Liga MX","country":"Mexico","continent":"North America","tier":"major","priority":30,"slug":"liga-mx","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"j1-league","sport":"football","name":"J1 League","country":"Japan","continent":"Asia","tier":"major","priority":31,"slug":"j1-league","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"k-league-1","sport":"football","name":"K League 1","country":"South Korea","continent":"Asia","tier":"major","priority":32,"slug":"k-league-1","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"a-league","sport":"football","name":"A-League","country":"Australia","continent":"Oceania","tier":"major","priority":33,"slug":"a-league","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"world-cup","sport":"football","name":"World Cup","country":"International","continent":"World","tier":"international","priority":1,"slug":"world-cup","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"afcon","sport":"football","name":"AFCON","country":"Africa","continent":"Africa","tier":"international","priority":2,"slug":"afcon","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"euros","sport":"football","name":"UEFA European Championship","country":"Europe","continent":"Europe","tier":"international","priority":3,"slug":"euros","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"copa-america","sport":"football","name":"Copa América","country":"Americas","continent":"South America","tier":"international","priority":4,"slug":"copa-america","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"gold-cup","sport":"football","name":"CONCACAF Gold Cup","country":"CONCACAF","continent":"North America","tier":"international","priority":5,"slug":"gold-cup","live":True,"predictions":True,"odds":True,"seo":True},
    # Rugby — Phase 4 SA-first layer
    {"id":"urc","sport":"rugby","name":"United Rugby Championship","country":"South Africa/Europe","continent":"Europe/Africa","tier":"priority","priority":1,"slug":"urc","live":True,"predictions":True,"odds":False,"seo":True,"featured":True},
    {"id":"currie-cup","sport":"rugby","name":"Currie Cup","country":"South Africa","continent":"Africa","tier":"priority","priority":2,"slug":"currie-cup","live":True,"predictions":True,"odds":False,"seo":True},
    {"id":"rugby-championship","sport":"rugby","name":"Rugby Championship","country":"International","continent":"World","tier":"international","priority":3,"slug":"rugby-championship","live":True,"predictions":True,"odds":False,"seo":True},
    {"id":"super-rugby-africa","sport":"rugby","name":"Super Rugby Africa","country":"Africa","continent":"Africa","tier":"major","priority":4,"slug":"super-rugby-africa","live":True,"predictions":True,"odds":False,"seo":True},
    # Rugby — Europe / Americas / Oceania
    {"id":"premiership-rugby","sport":"rugby","name":"Premiership Rugby","country":"England","continent":"Europe","tier":"major","priority":5,"slug":"eng.1","live":True,"predictions":True,"odds":False,"seo":True},
    {"id":"top14","sport":"rugby","name":"Top 14","country":"France","continent":"Europe","tier":"major","priority":6,"slug":"fra.1","live":True,"predictions":True,"odds":False,"seo":True},
    {"id":"super-rugby-pacific","sport":"rugby","name":"Super Rugby Pacific","country":"Australia/New Zealand","continent":"Oceania","tier":"major","priority":7,"slug":"rugby/club","live":True,"predictions":True,"odds":False,"seo":True},
    {"id":"six-nations","sport":"rugby","name":"Six Nations","country":"Europe","continent":"Europe","tier":"international","priority":8,"slug":"rugby/union","live":True,"predictions":True,"odds":False,"seo":True},
    {"id":"world-rugby-championship","sport":"rugby","name":"Rugby World Cup","country":"International","continent":"World","tier":"international","priority":9,"slug":"rugby/union","live":True,"predictions":True,"odds":False,"seo":True},
    # Cricket — global competitions. ESPN scoreboard slugs are used by the sports layer.
    {"id":"cricket-international","sport":"cricket","name":"International Cricket","country":"International","continent":"World","tier":"international","priority":1,"slug":"icc","live":True,"predictions":False,"odds":False,"seo":True,"featured":True},
    {"id":"sa20","sport":"cricket","name":"SA20","country":"South Africa","continent":"Africa","tier":"major","priority":2,"slug":"domestic","live":True,"predictions":False,"odds":False,"seo":True},
    {"id":"ipl","sport":"cricket","name":"Indian Premier League","country":"India","continent":"Asia","tier":"major","priority":3,"slug":"domestic","live":True,"predictions":False,"odds":False,"seo":True},
    {"id":"big-bash","sport":"cricket","name":"Big Bash League","country":"Australia","continent":"Oceania","tier":"major","priority":4,"slug":"domestic","live":True,"predictions":False,"odds":False,"seo":True},
    {"id":"psl-cricket","sport":"cricket","name":"Pakistan Super League","country":"Pakistan","continent":"Asia","tier":"major","priority":5,"slug":"domestic","live":True,"predictions":False,"odds":False,"seo":True},
    {"id":"hundred","sport":"cricket","name":"The Hundred","country":"England","continent":"Europe","tier":"major","priority":6,"slug":"domestic","live":True,"predictions":False,"odds":False,"seo":True},
    {"id":"county-championship","sport":"cricket","name":"County Championship","country":"England","continent":"Europe","tier":"major","priority":7,"slug":"domestic","live":True,"predictions":False,"odds":False,"seo":True},
    # Football — additional Africa / Europe / Asia / North America / South America
    {"id":"egypt-premier-league","sport":"football","name":"Egyptian Premier League","country":"Egypt","continent":"Africa","tier":"major","priority":40,"slug":"egyptian-premier-league","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"botola","sport":"football","name":"Botola Pro","country":"Morocco","continent":"Africa","tier":"major","priority":41,"slug":"botola-pro","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"algeria-ligue-1","sport":"football","name":"Algerian Ligue 1","country":"Algeria","continent":"Africa","tier":"major","priority":42,"slug":"algeria-ligue-1","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"tunisia-ligue-1","sport":"football","name":"Tunisian Ligue 1","country":"Tunisia","continent":"Africa","tier":"major","priority":43,"slug":"tunisia-ligue-1","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"nigeria-npfl","sport":"football","name":"Nigeria Premier Football League","country":"Nigeria","continent":"Africa","tier":"major","priority":44,"slug":"npfl","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"ghana-premier-league","sport":"football","name":"Ghana Premier League","country":"Ghana","continent":"Africa","tier":"major","priority":45,"slug":"ghana-premier-league","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"segunda","sport":"football","name":"LaLiga Hypermotion","country":"Spain","continent":"Europe","tier":"major","priority":46,"slug":"segunda","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"bundesliga-2","sport":"football","name":"2. Bundesliga","country":"Germany","continent":"Europe","tier":"major","priority":47,"slug":"bundesliga-2","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"serie-b","sport":"football","name":"Serie B","country":"Italy","continent":"Europe","tier":"major","priority":48,"slug":"serie-b","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"ligue-2","sport":"football","name":"Ligue 2","country":"France","continent":"Europe","tier":"major","priority":49,"slug":"ligue-2","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"super-league-greece","sport":"football","name":"Super League Greece","country":"Greece","continent":"Europe","tier":"major","priority":50,"slug":"super-league-greece","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"austrian-bundesliga","sport":"football","name":"Austrian Bundesliga","country":"Austria","continent":"Europe","tier":"major","priority":51,"slug":"austrian-bundesliga","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"swiss-super-league","sport":"football","name":"Swiss Super League","country":"Switzerland","continent":"Europe","tier":"major","priority":52,"slug":"swiss-super-league","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"polish-ekstraklasa","sport":"football","name":"Ekstraklasa","country":"Poland","continent":"Europe","tier":"major","priority":53,"slug":"ekstraklasa","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"saudi-1","sport":"football","name":"Saudi Pro League","country":"Saudi Arabia","continent":"Asia","tier":"major","priority":54,"slug":"saudi-pro-league","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"uae-pro-league","sport":"football","name":"UAE Pro League","country":"United Arab Emirates","continent":"Asia","tier":"major","priority":55,"slug":"uae-pro-league","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"qatar-stars-league","sport":"football","name":"Qatar Stars League","country":"Qatar","continent":"Asia","tier":"major","priority":56,"slug":"qatar-stars-league","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"indian-super-league","sport":"football","name":"Indian Super League","country":"India","continent":"Asia","tier":"major","priority":57,"slug":"indian-super-league","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"chinese-super-league","sport":"football","name":"Chinese Super League","country":"China","continent":"Asia","tier":"major","priority":58,"slug":"chinese-super-league","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"thai-league-1","sport":"football","name":"Thai League 1","country":"Thailand","continent":"Asia","tier":"major","priority":59,"slug":"thai-league-1","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"liga-1-indonesia","sport":"football","name":"Liga 1 Indonesia","country":"Indonesia","continent":"Asia","tier":"major","priority":60,"slug":"liga-1","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"colombia-primera","sport":"football","name":"Primera A Colombia","country":"Colombia","continent":"South America","tier":"major","priority":61,"slug":"primera-a","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"chile-primera","sport":"football","name":"Primera División Chile","country":"Chile","continent":"South America","tier":"major","priority":62,"slug":"primera-division","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"ecuador-liga-pro","sport":"football","name":"Liga Pro Ecuador","country":"Ecuador","continent":"South America","tier":"major","priority":63,"slug":"liga-pro","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"peru-liga-1","sport":"football","name":"Liga 1 Peru","country":"Peru","continent":"South America","tier":"major","priority":64,"slug":"liga-1","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"uruguay-primera","sport":"football","name":"Primera División Uruguay","country":"Uruguay","continent":"South America","tier":"major","priority":65,"slug":"primera-division","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"costa-rica-primera","sport":"football","name":"Primera División Costa Rica","country":"Costa Rica","continent":"North America","tier":"major","priority":66,"slug":"primera-division","live":True,"predictions":True,"odds":True,"seo":True},
    {"id":"liga-nacional-guatemala","sport":"football","name":"Liga Nacional Guatemala","country":"Guatemala","continent":"North America","tier":"major","priority":67,"slug":"liga-nacional","live":True,"predictions":True,"odds":True,"seo":True},
]

@app.get("/competitions")
async def competitions(sport: str = Query(""), country: str = Query(""), tier: str = Query("")):
    rows=COMPETITION_REGISTRY
    if sport: rows=[x for x in rows if x["sport"]==sport.lower()]
    if country: rows=[x for x in rows if x["country"].lower()==country.lower()]
    if tier: rows=[x for x in rows if x["tier"]==tier.lower()]
    return {"count":len(rows),"competitions":rows,"version":"phase1-4"}

@app.get("/competitions/featured")
async def featured_competitions():
    rows=[x for x in COMPETITION_REGISTRY if x.get("featured")]
    return {"count":len(rows),"competitions":rows}

@app.get("/sports/{sport}/scores")
async def sports_scores(sport: str, date: str = Query(""), live: int = Query(0, ge=0, le=1), league: str = Query("")):
    allowed=set(SPORT_LABELS)
    if sport.lower() not in allowed: raise HTTPException(400, f"Unsupported sport: {sport}")
    games=await _sports_scores(sport, date or None, bool(live), league or None)
    return {"sport":sport,"date":date or datetime.now().strftime("%Y-%m-%d"),"count":len(games),"games":games,
            "oddsAvailable":sum(1 for g in games if g.get("oddsAvailable")),
            "source": "ESPN + The Odds API" if sport.lower()=="cricket" else (games[0].get("source") if games else "ESPN/API-Sports")}

@app.get("/sports/live")
async def sports_live_all():
    """Aggregate live games across every configured sport for Multi-Sport Scores."""
    sports = ["football","rugby","cricket"]
    results = await asyncio.gather(
        *[_sports_scores(s, None, True, None) for s in sports],
        return_exceptions=True
    )
    games=[]
    for sport, data in zip(sports, results):
        if isinstance(data, Exception):
            log.warning("Multi-sport live %s failed: %s", sport, data)
            continue
        games.extend(data or [])
    games=[g for g in games if str(g.get("statusShort") or "").lower() in ("in","live") or re.search(r"live|progress|halftime|period|quarter|inning|1h|2h|ht|et", str(g.get("status") or ""), re.I)]
    games.sort(key=lambda x: (x.get("sport",""), x.get("date") or ""))
    return {"count":len(games),"games":games,"updatedAt":datetime.now(timezone.utc).isoformat()}


async def _espn_summary(sport: str, event_id: str, league: str = ""):
    """Fetch an ESPN event summary for cross-sport match pages."""
    leagues = [league] if league else ESPN_LEAGUES.get(sport, [])
    for lg in leagues:
        try:
            url=f"https://site.api.espn.com/apis/site/v2/sports/{sport}/{lg}/summary"
            data=await _sports_get(url, {"event": str(event_id)})
            if data:
                return data
        except Exception as exc:
            log.debug("ESPN summary %s/%s failed: %s", sport, lg, exc)
    return {}

def _espn_participants(summary: dict):
    """Normalise useful participant/player information from ESPN summaries."""
    out=[]
    for athlete in summary.get("athletes") or []:
        out.append({"id":str(athlete.get("id") or ""),"name":athlete.get("displayName") or athlete.get("fullName") or athlete.get("name") or "Player","photo":athlete.get("headshot") or athlete.get("photo"),"position":(athlete.get("position") or {}).get("abbreviation") if isinstance(athlete.get("position"),dict) else athlete.get("position"),"statistics":athlete.get("statistics") or []})
    for section in summary.get("leaders") or []:
        for leader in section.get("leaders") or []:
            a=leader.get("athlete") or {}
            if a.get("id"):
                out.append({"id":str(a.get("id")),"name":a.get("displayName") or a.get("fullName") or "Player","photo":a.get("headshot"),"position":None,"statistics":leader.get("statistics") or []})
    seen=set(); return [x for x in out if not (x["id"] in seen or seen.add(x["id"]))]

@app.get("/sports/{sport}/match/{match_id}")
async def sports_match_detail(sport: str, match_id: str, league: str = Query("")):
    """Unified match page data for football, rugby, tennis and other sports.
    Football uses the existing API-Football endpoints; other sports use API-Sports
    where configured and ESPN summaries as the broad fallback."""
    sport=sport.lower().strip()
    if sport == "football":
        fid=int(match_id)
        fd=await _afoot_get("/fixtures", {"id": fid})
        f=(fd.get("response") or [{}])[0]
        stats,lineups,insights=await asyncio.gather(fixture_stats(fid),fixture_lineups(fid),fixture_insights(fid),return_exceptions=True)
        stats = stats if isinstance(stats,dict) else {}
        lineups = lineups if isinstance(lineups,dict) else {}
        insights = insights if isinstance(insights,dict) else {}
        return {"sport":"football","match":f,"statistics":stats.get("statistics",[]),"teams":lineups.get("teams",[]),"insights":insights,"source":"API-Football","updatedAt":datetime.now(timezone.utc).isoformat()}

    # API-Sports rugby: richer match data, stats and players/lineups when key exists.
    if sport == "rugby" and SPORTS_API_KEYS.get("rugby"):
        try:
            game=(await _rugby_api("/games", {"id": match_id}) or [{}])[0]
            stats=await _rugby_api("/games/statistics", {"game": match_id})
            lineups=await _rugby_api("/games/lineups", {"game": match_id})
            players=await _rugby_api("/games/players", {"game": match_id})
            return {"sport":"rugby","match":_norm_rugby_game(game),"statistics":stats if isinstance(stats,list) else [],"teams":lineups if isinstance(lineups,list) else [],"players":players if isinstance(players,list) else [],"source":"API-Sports"}
        except Exception as exc:
            log.warning("Rugby detail failed %s: %s",match_id,exc)

    summary=await _espn_summary(sport, match_id, league)
    event=(summary.get("header",{}).get("competitions") or [{}])[0]
    competitors=event.get("competitors") or []
    home=next((x for x in competitors if x.get("homeAway")=="home"), competitors[0] if competitors else {})
    away=next((x for x in competitors if x.get("homeAway")=="away"), competitors[1] if len(competitors)>1 else {})
    participants=_espn_participants(summary)
    return {"sport":sport,"match":{"id":match_id,"league":(summary.get("header",{}).get("league") or {}).get("name") or league,"date":(summary.get("header",{}).get("competitions") or [{}])[0].get("date"),"home":(home.get("team") or home.get("athlete") or {}).get("displayName") or home.get("displayName") or "Home","away":(away.get("team") or away.get("athlete") or {}).get("displayName") or away.get("displayName") or "Away","homeId":(home.get("team") or {}).get("id"),"awayId":(away.get("team") or {}).get("id"),"homeLogo":(home.get("team") or {}).get("logo") or "","awayLogo":(away.get("team") or {}).get("logo") or "","leagueSlug":league,"homeScore":home.get("score"),"awayScore":away.get("score"),"status":(event.get("status") or {}).get("type",{}).get("detail") or "Scheduled"},"statistics":summary.get("boxscore") or summary.get("leaders") or [],"teams":[],"participants":participants,"summary":summary,"source":"ESPN"}

@app.get("/sports/{sport}/team/{team_id}")
async def sports_team_profile(sport: str, team_id: str, league: str = Query(""), name: str = Query("")):
    """Unified clickable team page. Provider IDs, badges and flags are preserved."""
    sport=sport.lower().strip()
    if sport == "football":
        return await team_profile(team=team_id or name)
    if sport == "rugby" and SPORTS_API_KEYS.get("rugby"):
        try:
            rows=await _rugby_api("/teams", {"id": team_id})
            team=(rows or [{}])[0] if isinstance(rows,list) else {}
            squad=[]
            try: squad=await _rugby_api("/players", {"team": team_id})
            except Exception: squad=[]
            return {"sport":"rugby","team":team,"players":squad if isinstance(squad,list) else [],"source":"API-Sports","updatedAt":datetime.now(timezone.utc).isoformat()}
        except Exception as exc:
            log.warning("Rugby team profile failed %s: %s", team_id, exc)
    # ESPN fallback is used for cricket and rugby when a provider key is unavailable.
    leagues=[league] if league else ESPN_LEAGUES.get(sport,[])
    for lg in leagues:
        if not lg: continue
        try:
            data=await _sports_get(f"https://site.api.espn.com/apis/site/v2/sports/{sport}/{lg}/teams/{team_id}")
            team=data.get("team") or data
            return {"sport":sport,"team":team,"players":team.get("athletes") or [],"league":lg,"source":"ESPN","updatedAt":datetime.now(timezone.utc).isoformat()}
        except Exception as exc:
            log.debug("ESPN team %s/%s/%s failed: %s",sport,lg,team_id,exc)
    raise HTTPException(404, f"{sport.title()} team data was not returned by the configured provider")

@app.get("/sports/{sport}/player/{player_id}")
async def sports_player_profile(sport: str, player_id: str, league: str = Query(""), name: str = Query("")):
    """Unified clickable player page. Football remains API-Football authoritative."""
    sport=sport.lower().strip()
    if sport == "football":
        return await player_profile(player=int(player_id))
    if sport == "rugby" and SPORTS_API_KEYS.get("rugby"):
        try:
            rows=await _rugby_api("/players", {"id": player_id})
            player=(rows or [{}])[0] if isinstance(rows,list) else {}
            return {"sport":"rugby","player":player,"statistics":player.get("statistics") or [],"source":"API-Sports","updatedAt":datetime.now(timezone.utc).isoformat()}
        except Exception as exc:
            log.warning("Rugby player profile failed %s: %s",player_id,exc)
    # ESPN athlete endpoint varies by competition; try the known league feeds.
    leagues=[league] if league else ESPN_LEAGUES.get(sport,[])
    for lg in leagues:
        if not lg: continue
        for host in ("site.api.espn.com/apis/site/v2", "site.web.api.espn.com/apis/common/v3"):
            try:
                data=await _sports_get(f"https://{host}/sports/{sport}/{lg}/athletes/{player_id}")
                player=data.get("athlete") or data.get("player") or data
                return {"sport":sport,"player":player,"statistics":data.get("statistics") or [],"league":lg,"source":"ESPN","updatedAt":datetime.now(timezone.utc).isoformat()}
            except Exception as exc:
                log.debug("ESPN player %s/%s/%s failed: %s",sport,lg,player_id,exc)
    raise HTTPException(404, f"{sport.title()} player data was not returned by the configured provider")

@app.get("/sports/{sport}/match/{match_id}/player/{player_id}")
async def sports_match_player(sport: str, match_id: str, player_id: str, league: str = Query("")):
    sport=sport.lower().strip()
    if sport == "football":
        return await fixture_player_statistics(int(match_id), int(player_id))
    summary=await _espn_summary(sport, match_id, league)
    participants=_espn_participants(summary)
    player=next((x for x in participants if str(x.get("id"))==str(player_id)), None)
    return {"sport":sport,"matchId":match_id,"playerId":player_id,"currentGame":player or {"id":player_id,"name":"Player","statistics":[]},"seasonStatistics":[],"recentMatches":[],"source":"ESPN"}


def _generic_news_image(url: str) -> bool:
    u=str(url or "").lower()
    return (not u) or any(x in u for x in ("gstatic.com/images/branding", "google.com/images/branding", "news.google.com", "googleusercontent.com/news", "googlenews"))


def _publisher_domains(source: str):
    s=str(source or "").lower()
    if "metro" in s:return ("metro.co.uk",)
    if "goal" in s:return ("goal.com",)
    if "citizen" in s:return ("citizen.co.za",)
    if "rugby" in s:return ("sarugbymag.co.za","keo.co.za","supersport.com")
    return ()

def _clean_embedded_url(raw: str) -> str:
    v=unescape(str(raw or "")).replace("\\u002F","/").replace("\\/","/")
    v=v.replace("\\u003A",":").replace("\\u0026","&")
    try:v=urllib.parse.unquote(v)
    except Exception:pass
    return v

async def _resolve_news_publisher_url(url: str, source: str="") -> str:
    """Best effort conversion of a Google News article URL into the publisher URL."""
    raw=str(url or "").strip()
    if not raw:return raw
    host=(urllib.parse.urlparse(raw).hostname or "").lower()
    if "news.google.com" not in host:return raw
    key=f"news-resolved:{raw}"
    cached=NEWS_CACHE.get(key)
    if cached:return str(cached)
    try:
        c=await _sports_client()
        r=await c.get(raw,follow_redirects=True,timeout=httpx.Timeout(7,connect=3),
                      headers={"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36"})
        final=str(r.url)
        fh=(urllib.parse.urlparse(final).hostname or "").lower()
        if "google." not in fh and "news.google.com" not in fh:
            NEWS_CACHE[key]=final;return final
        text=r.text[:2_500_000]
        domains=_publisher_domains(source)
        # Google News pages commonly embed the publisher URL in script data.
        candidates=re.findall(r'https?(?::|\\u003A|%3A)(?:/|\\u002F|%2F){2}[^"\'<>\s\\\\]+',text,re.I)
        for cand in candidates:
            u=_clean_embedded_url(cand)
            h=(urllib.parse.urlparse(u).hostname or "").lower()
            if not h or "google." in h or "gstatic." in h:continue
            if domains and not any(h==d or h.endswith("."+d) for d in domains):continue
            NEWS_CACHE[key]=u;return u
    except Exception as exc:
        log.debug("News publisher URL resolution failed %s: %s",raw,exc)
    NEWS_CACHE[key]=raw
    return raw

async def _enrich_news_card(item: dict) -> dict:
    """Resolve the publisher article and extract a genuine article image.

    Google News thumbnails/branding are deliberately ignored. Publisher OG,
    Twitter, JSON-LD and article images are tried in that order.
    """
    out=dict(item or {})
    if _generic_news_image(out.get("image")):
        out["image"]=""

    original=str(out.get("link") or "").strip()
    if not original:
        return out

    direct=str(out.get("publisherLink") or "").strip()
    resolved=direct if direct.startswith(("http://","https://")) else await _resolve_news_publisher_url(
        original, out.get("source") or out.get("publisher") or ""
    )

    key=f"news-enriched-v202:{resolved}"
    cached=NEWS_CACHE.get(key)
    if cached:
        merged=dict(out);merged.update(cached);return merged

    def absolute_url(raw: str, base_url: str) -> str:
        raw=unescape(str(raw or "")).replace("\\/","/").replace("&amp;","&").strip()
        if not raw:
            return ""
        return urllib.parse.urljoin(base_url, raw)

    def usable_image(raw: str, base_url: str) -> str:
        u=absolute_url(raw,base_url)
        if not u.startswith(("http://","https://")):
            return ""
        if _generic_news_image(u) or _is_generic_news_image(u):
            return ""
        return u

    try:
        c=await _sports_client()
        headers={
            "User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
            "Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language":"en-ZA,en-GB;q=0.9,en;q=0.8",
            "Cache-Control":"no-cache",
        }
        r=await c.get(resolved,follow_redirects=True,timeout=httpx.Timeout(10,connect=4),headers=headers)
        r.raise_for_status()
        final=str(r.url)
        text=r.text[:3_500_000]

        def meta(*names):
            for prop in names:
                ep=re.escape(prop)
                patterns=(
                    rf'<meta[^>]+(?:property|name)=["\']{ep}["\'][^>]+content=["\']([^"\']+)',
                    rf'<meta[^>]+content=["\']([^"\']+)["\'][^>]+(?:property|name)=["\']{ep}["\']',
                )
                for pat in patterns:
                    m=re.search(pat,text,re.I|re.S)
                    if m:
                        value=unescape(re.sub(r"\s+"," ",m.group(1))).strip()
                        if value:return value
            return ""

        candidates=[]
        for value in (
            meta("og:image:secure_url"),
            meta("og:image:url"),
            meta("og:image"),
            meta("twitter:image"),
            meta("twitter:image:src"),
        ):
            if value:candidates.append(value)

        # JSON-LD frequently contains the real hero image even when OG tags are
        # dynamically altered or omitted.
        for pat in (
            r'"image"\s*:\s*\[\s*"([^"]+)"',
            r'"image"\s*:\s*"([^"]+)"',
            r'"image"\s*:\s*\{\s*"url"\s*:\s*"([^"]+)"',
            r'"image"\s*:\s*\{\s*"@id"\s*:\s*"([^"]+)"',
            r'"thumbnailUrl"\s*:\s*"([^"]+)"',
            r'"contentUrl"\s*:\s*"([^"]+)"',
        ):
            for m in re.finditer(pat,text,re.I|re.S):
                candidates.append(m.group(1))
                if len(candidates)>=20:break
            if len(candidates)>=20:break

        # Last publisher-page fallback: look for large/article/hero images.
        if not candidates:
            for pat in (
                r'<img[^>]+(?:class|data-testid)=["\'][^"\']*(?:hero|article|lead|featured|main)[^"\']*["\'][^>]+(?:src|data-src|data-lazy-src)=["\']([^"\']+)',
                r'<img[^>]+(?:src|data-src|data-lazy-src)=["\']([^"\']+)["\'][^>]+(?:class|data-testid)=["\'][^"\']*(?:hero|article|lead|featured|main)[^"\']*["\']',
            ):
                for m in re.finditer(pat,text,re.I|re.S):
                    candidates.append(m.group(1))
                    if len(candidates)>=12:break

        image=""
        for cand in candidates:
            u=usable_image(cand,final)
            if u:
                image=u
                break

        summary=meta("og:description","description","twitter:description")
        title=meta("og:title","twitter:title")

        payload={
            "image":image,
            "ogImage":image,
            "publisherImage":image,
            "summary":summary or out.get("summary",""),
            "resolvedUrl":final,
            "publisherUrl":final,
            "publisherTitle":title or out.get("title",""),
            "imageOrigin":"publisher-page" if image else "",
            "imageAvailable":bool(image),
        }
        NEWS_CACHE[key]=payload
        out.update(payload)
    except Exception as exc:
        log.debug("News publisher enrichment failed %s: %s",resolved,exc)
        out["resolvedUrl"]=resolved
        out["publisherUrl"]=resolved
        out["image"]=""
        out["ogImage"]=""
        out["publisherImage"]=""
        out["imageAvailable"]=False

    return out

@app.get("/sports/news")
async def sports_news(sport: str = Query("all"), q: str = Query(""), limit: int = Query(30, ge=1, le=50)):
    """Sports headlines with publisher-direct feeds preferred for real images.

    Google News is now discovery fallback only. Direct publisher feeds preserve
    article URLs and media/enclosure images, avoiding Google redirect/image loss.
    """
    sport_key=sport.lower().strip()
    wanted={"football","rugby","cricket"} if sport_key=="all" else {sport_key}
    groups=[]

    async def direct_feed(sp, url, publisher):
        try:
            rows=await _publisher_rss(url,publisher,max(8,limit))
            out=[]
            for row in rows:
                x=dict(row)
                x["sport"]=sp
                x["publisher"]=publisher
                x["publisherUrl"]=x.get("link") or ""
                x["resolvedUrl"]=x.get("link") or ""
                x["imageOrigin"]="publisher-rss" if x.get("image") else ""
                out.append(x)
            return out
        except Exception as exc:
            log.info("Direct publisher feed unavailable %s: %s",publisher,exc)
            return []

    jobs=[]
    labels=[]
    if "football" in wanted:
        # Metro's direct football feed avoids Google News redirect URLs and
        # normally supplies the publisher's own article media.
        jobs.append(direct_feed("football","https://metro.co.uk/sport/football/feed/","Metro.co.uk"))
        labels.append("football")
    if "rugby" in wanted:
        jobs.append(direct_feed("rugby","https://www.sarugbymag.co.za/feed/","SA Rugby Magazine"))
        labels.append("rugby")
    if "cricket" in wanted:
        jobs.append(direct_feed("cricket","https://www.sacricketmag.com/feed/","SA Cricket Mag"))
        labels.append("cricket")

    direct_results=await asyncio.gather(*jobs,return_exceptions=True) if jobs else []
    for sp,rows in zip(labels,direct_results):
        if not isinstance(rows,Exception) and rows:
            groups.extend(rows)

    # Keep GOAL in football discovery. Google is fallback/discovery here, not
    # the primary source for images.
    fallback_searches=[]
    if "football" in wanted:
        fallback_searches.append(("football",(q.strip()+" " if q.strip() else "")+"GOAL.com South Africa football"))
    if "rugby" in wanted and not any(x.get("sport")=="rugby" for x in groups):
        fallback_searches.append(("rugby",q.strip() or "South Africa rugby Springboks URC"))
    if "cricket" in wanted and not any(x.get("sport")=="cricket" for x in groups):
        fallback_searches.append(("cricket",q.strip() or "South Africa cricket Proteas SA20"))

    if fallback_searches:
        discovered=await asyncio.gather(
            *[_google_news(query,max(6,limit//2)) for _,query in fallback_searches],
            return_exceptions=True
        )
        for (sp,_),rows in zip(fallback_searches,discovered):
            if isinstance(rows,Exception):
                continue
            for row in rows:
                x=dict(row)
                if sp=="football":
                    hay=(str(x.get("source") or "")+" "+str(x.get("title") or "")).lower()
                    if "goal" not in hay:
                        continue
                x["sport"]=sp
                x["publisher"]=x.get("source") or sp.title()
                groups.append(x)

    # Deduplicate before enrichment.
    merged=[];seen=set()
    for x in groups:
        key=(x.get("publisherUrl") or x.get("resolvedUrl") or x.get("link") or x.get("title") or "").strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        merged.append(x)

    # Prefer rows that already contain a publisher image, then newest content.
    merged.sort(key=lambda x:(0 if x.get("image") else 1, str(x.get("published") or "")),reverse=False)
    selected=merged[:limit]

    sem=asyncio.Semaphore(6)
    async def enrich_one(x):
        # Even direct-feed rows are enriched if their feed omitted an image.
        if x.get("image") and not _is_generic_news_image(x.get("image","")):
            y=dict(x)
            y["imageAvailable"]=True
            y["ogImage"]=y.get("image")
            y["publisherImage"]=y.get("image")
            return y
        async with sem:
            return await _enrich_news_card(x)

    enriched=await asyncio.gather(*[enrich_one(x) for x in selected],return_exceptions=True)
    selected=[(row if isinstance(row,dict) else dict(original)) for original,row in zip(selected,enriched)]

    for item in selected:
        title=str(item.get("title") or "sports-news")
        slug=_seo_slug(re.sub(r"\s+-\s+[^-]+$","",title))[:110] or "sports-news"
        target=str(item.get("publisherUrl") or item.get("resolvedUrl") or item.get("publisherLink") or item.get("link") or "")
        item["articlePath"]=f"/news/{slug}?source={urllib.parse.quote(target,safe='')}" if target else ""

    return {
        "sport":sport_key,
        "count":len(selected),
        "items":selected,
        "source":"Publisher-direct feeds + GOAL discovery fallback",
        "directPublisherFeeds":True
    }

@app.get("/news/{slug}", response_class=HTMLResponse, include_in_schema=False)
async def seo_news_article(slug: str, source: str = Query("")):
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{1,139}", slug or ""):
        raise HTTPException(404,"News article not found")
    raw=(source or "").strip()
    if not raw.startswith(("http://","https://")):
        raise HTTPException(404,"News article not found")
    try:
        meta=await sports_news_article(raw)
    except Exception:
        meta={"title":"","summary":"","image":"","url":raw,"source":"News"}
    title=(meta.get("title") or slug.replace("-"," ").title()).strip()
    desc=(meta.get("summary") or f"Sports news update: {title}.").strip()
    image=(meta.get("image") or "").strip()
    publisher=(meta.get("source") or "Sports News").strip()
    publisher_url=(meta.get("url") or raw).strip()
    public=os.getenv("PUBLIC_SITE_URL","").rstrip("/")
    own_path=f"/news/{slug}?source={urllib.parse.quote(raw,safe='')}"
    canonical=(public+own_path) if public else own_path
    base=(BASE_DIR/"index.html").read_text(encoding="utf-8")
    base=re.sub(r"<title>.*?</title>",f"<title>{escape(title)} | Kasi Sports News</title>",base,count=1,flags=re.S)
    base=re.sub(r'<meta name="description" content="[^"]*">',f'<meta name="description" content="{escape(desc,quote=True)}">',base,count=1)
    base=re.sub(r'<link rel="canonical" href="[^"]*">',f'<link rel="canonical" href="{escape(canonical,quote=True)}">',base,count=1)
    schema={"@context":"https://schema.org","@type":"NewsArticle","headline":title,"description":desc,"mainEntityOfPage":canonical,"publisher":{"@type":"Organization","name":"Kasi Sports News"}}
    if image: schema["image"]=[image]
    img_html=f'<img src="{escape(image,quote=True)}" alt="{escape(title,quote=True)}" loading="eager" fetchpriority="high" style="width:100%;max-height:520px;object-fit:cover;border-radius:12px;margin:18px 0">' if image else ""
    article=(f'<main class="kasiscore--page" style="max-width:980px;margin:32px auto;padding:20px"><nav aria-label="Breadcrumb"><a href="/">Kasi Sports News</a> / News</nav>{img_html}<h1>{escape(title)}</h1><p class="-lead">{escape(desc)}</p><p>Source: <strong>{escape(publisher)}</strong></p><p><a href="{escape(publisher_url,quote=True)}" rel="noopener noreferrer">Read the full story at the publisher</a></p></main><script type="application/ld+json">{json.dumps(schema,ensure_ascii=False)}</script>')
    body_open=re.search(r"<body[^>]*>",base,re.I)
    if body_open: base=base[:body_open.end()]+article+base[body_open.end():]
    og_img=f'<meta property="og:image" content="{escape(image,quote=True)}">' if image else ""
    base=base.replace("</head>",f'<meta property="og:type" content="article"><meta property="og:title" content="{escape(title,quote=True)}"><meta property="og:description" content="{escape(desc,quote=True)}">{og_img}<meta name="robots" content="index,follow,max-image-preview:large"></head>',1)
    return HTMLResponse(base,headers={"Cache-Control":"public, max-age=300, s-maxage=900, stale-while-revalidate=1800"})

@app.get("/sports/news/article")
async def sports_news_article(url: str = Query(...)):
    """Return publisher metadata for an in-dashboard reader card.

    This intentionally does not republish full article text. It exposes the
    publisher's title/description/open-graph image/video when available.
    """
    raw=(url or "").strip()
    if not raw.startswith(("http://","https://")):
        raise HTTPException(400,"Invalid article URL")
    raw=await _resolve_news_publisher_url(raw,"")
    allowed=("news.google.com","goal.com","www.goal.com","metro.co.uk","www.metro.co.uk","citizen.co.za","www.citizen.co.za","sarugbymag.co.za","www.sarugbymag.co.za","keo.co.za","www.keo.co.za","supersport.com","www.supersport.com")
    from urllib.parse import urlparse
    host=(urlparse(raw).hostname or "").lower()
    if host not in allowed and not host.endswith(".goal.com") and not host.endswith(".metro.co.uk"):
        raise HTTPException(400,"News source is not approved")
    try:
        c=await _sports_client()
        r=await c.get(raw, follow_redirects=True, timeout=httpx.Timeout(8,connect=4), headers={"User-Agent":"Mozilla/5.0 KasiScore/1.0"})
        r.raise_for_status()
        final=str(r.url)
        final_host=(urlparse(final).hostname or "").lower()
        if not any(d in final_host for d in ("goal.com","metro.co.uk","news.google.com","citizen.co.za","sarugbymag.co.za","keo.co.za","supersport.com")):
            raise HTTPException(400,"Resolved news source is not approved")
        text=r.text[:1_500_000]
        def meta(prop):
            pats=[
                rf'<meta[^>]+(?:property|name)=["\']{re.escape(prop)}["\'][^>]+content=["\']([^"\']+)',
                rf'<meta[^>]+content=["\']([^"\']+)["\'][^>]+(?:property|name)=["\']{re.escape(prop)}["\']',
            ]
            for p in pats:
                m=re.search(p,text,re.I|re.S)
                if m:return unescape(re.sub(r'\s+',' ',m.group(1))).strip()
            return ""
        title=meta("og:title") or meta("twitter:title")
        desc=meta("og:description") or meta("description") or meta("twitter:description")
        image=meta("og:image") or meta("twitter:image")
        video=meta("og:video:secure_url") or meta("og:video") or meta("twitter:player")
        return {"title":title,"summary":desc,"image":image,"video":video,"url":final,"source":"GOAL" if "goal.com" in final_host else "Metro" if "metro.co.uk" in final_host else "News","embedded":True}
    except HTTPException:
        raise
    except Exception as exc:
        # Fail soft: the list card still remains usable inside the dashboard.
        return {"title":"","summary":"Publisher preview is temporarily unavailable.","image":"","video":"","url":raw,"source":"News","embedded":True,"error":str(exc)}

@app.get("/sports/transfers")
async def sports_transfers(
    team: int = Query(0, ge=0),
    page: int = Query(1, ge=1, le=50),
    sport: str = Query("football"),
):
    sport=sport.lower().strip()
    # Football has structured transfer data through API-Football.
    if sport == "football":
        params={"page":page}
        if team: params["team"]=team
        data=await _afoot_get("/transfers", params)
        rows=[]
        for item in data.get("response") or []:
            player=item.get("player") or {}; transfers=item.get("transfers") or []
            for tr in transfers:
                rows.append({"sport":"football","player":player.get("name"),"playerId":player.get("id"),
                             "photo":f"https://media.api-sports.io/football/players/{player.get('id')}.png" if player.get("id") else "",
                             "date":tr.get("date"),"type":tr.get("type"),
                             "teamIn":(tr.get("teams") or {}).get("in",{}).get("name"),
                             "teamOut":(tr.get("teams") or {}).get("out",{}).get("name"),
                             "league":(tr.get("teams") or {}).get("in",{}).get("name")})
        return {"count":len(rows),"items":rows[:200],"source":"API-Football"}
    # Other sports: return current transfer-market reporting rather than an empty
    # football-only response. These are clearly marked as news-sourced.
    queries={
        "rugby":"rugby transfers South Africa Springboks URC Bulls Stormers Sharks Lions",
        "cricket":"cricket transfers South Africa Proteas SA20",
        "tennis":"tennis player transfer move ATP WTA",
        "basketball":"basketball transfers NBA BAL South Africa",
    }
    items=await _google_news(queries.get(sport, f"{sport} transfers"), 30)
    return {"sport":sport,"count":len(items),"items":[
        {"sport":sport,"player":None,"date":x.get("published"),"type":"Transfer news",
         "teamIn":None,"teamOut":None,"league":None,"title":x.get("title"),"link":x.get("link"),"source":x.get("source")}
        for x in items
    ],"source":"Google News RSS"}

@app.get("/sports/injuries")
async def sports_injuries(
    team: int = Query(0, ge=0),
    league: int = Query(0, ge=0),
    season: int = Query(0, ge=0),
    sport: str = Query("football"),
):
    season=season or _current_season()
    sport=sport.lower().strip()
    if sport == "football":
        params={"season":season}
        if team: params["team"]=team
        if league: params["league"]=league
        try:
            data=await _afoot_get("/injuries", params)
            items=[]
            for x in data.get("response") or []:
                p=x.get("player") or {}; t=x.get("team") or {}
                items.append({"sport":"football","player":p.get("name"),"photo":p.get("photo"),"team":t.get("name"),"teamId":t.get("id"),"type":p.get("type"),"reason":p.get("reason"),"date":x.get("fixture",{}).get("date")})
            return {"count":len(items),"items":items,"season":season,"source":"API-Football","available":True}
        except Exception as exc:
            log.warning("Football injuries unavailable: %s", exc)
            return {"count":0,"items":[],"season":season,"source":"API-Football","available":False,"warning":"Injury data temporarily unavailable"}
    queries={
        "rugby":"rugby injuries South Africa Springboks URC Bulls Stormers Sharks Lions",
        "cricket":"cricket injuries South Africa Proteas SA20",
        "tennis":"tennis injuries ATP WTA South Africa",
        "basketball":"basketball injuries NBA BAL South Africa",
    }
    news=await _google_news(queries.get(sport,f"{sport} injuries"),30)
    return {"sport":sport,"count":len(news),"items":[
        {"sport":sport,"player":None,"photo":None,"team":None,"teamId":None,"type":"Injury news","reason":x.get("title"),"date":x.get("published"),"link":x.get("link"),"source":x.get("source")}
        for x in news
    ],"season":season,"source":"Google News RSS"}

@app.get("/sports/standings")
async def sports_standings(sport: str = Query("rugby"), league: int = Query(0, ge=0), season: int = Query(0, ge=0)):
    sport=sport.lower(); season=season or _current_season()
    if sport in ("rugby","basketball") and SPORTS_API_KEYS.get(sport):
        base=SPORTS_API_BASES[sport]; headers={"x-apisports-key":SPORTS_API_KEYS[sport],"Accept":"application/json"}
        params={"season":season}
        if league: params["league"]=league
        try:
            data=await _sports_get(base+"/standings",params,headers)
            return {"sport":sport,"season":season,"items":data.get("response") or [],"source":"API-Sports"}
        except Exception as exc: log.warning("Standings %s failed: %s",sport,exc)
    # ESPN fallback where a league slug is provided by the caller.
    lg=str(league or ESPN_LEAGUES.get(sport,[""])[0])
    try:
        data=await _sports_get(f"https://site.api.espn.com/apis/v2/sports/{sport}/{lg}/standings",{"season":season})
        return {"sport":sport,"season":season,"items":data.get("children") or data.get("standings") or [],"source":"ESPN"}
    except Exception as exc:
        return {"sport":sport,"season":season,"items":[],"source":"unavailable","error":str(exc)}



@app.get("/sports/cricket/odds")
async def cricket_odds():
    """Server-side cricket odds. Provider key never reaches browser HTML."""
    if not ODDS_API_ENABLED or not ODDS_API_KEY:
        return {"status":"degraded","items":[],"message":"No current Test Match odds available."}
    items=[]
    for sport_key in ("cricket_test_match","cricket_odi","cricket_international_t20","cricket_t20"):
        try:
            rows=await _odds_api_get(f"/sports/{sport_key}/odds",{"regions":ODDS_API_REGIONS,"markets":"h2h","oddsFormat":"decimal"})
        except Exception as exc:
            log.debug("Cricket odds %s unavailable: %s",sport_key,exc);continue
        for ev in rows if isinstance(rows,list) else []:
            books=ev.get("bookmakers") or []
            # Prefer Betway where the provider currently returns it; otherwise first valid bookmaker.
            book=next((b for b in books if str(b.get("key","")).lower()=="betway"), books[0] if books else {})
            market=next((m for m in (book.get("markets") or []) if m.get("key")=="h2h"),{})
            outcomes=market.get("outcomes") or []
            prices={str(o.get("name")):o.get("price") for o in outcomes}
            home=ev.get("home_team") or "Home"; away=ev.get("away_team") or "Away"
            items.append({"id":ev.get("id"),"sportKey":sport_key,"home":home,"away":away,"bookmaker":book.get("title") or book.get("key") or "Bookmaker","homePrice":prices.get(home),"awayPrice":prices.get(away),"drawPrice":prices.get("Draw"),"commenceTime":ev.get("commence_time")})
    return {"status":"online" if items else "degraded","count":len(items),"items":items,"message":None if items else "No current Test Match odds available."}

@app.get("/platform/status")
async def platform_status():
    """Aggregated platform/provider status for the Platform tab."""
    return {
        "status": "ok",
        "version": "v177",
        "apiFootball": bool(API_KEY),
        "rugbyApi": bool(SPORTS_API_KEYS.get("rugby")),
        "cricketProvider": True,
        "newsProvider": True,
        "odds": True,
        "live": True,
        "predictions": True,
        "competitions": len(COMPETITION_REGISTRY),
        "timezone": TIMEZONE,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }

@app.get("/sports/health")
async def sports_health():
    """Source-level health derived from configuration + existing cache state; does not spend provider quota."""
    def state(configured: bool, cached_count: int | None=None):
        if not configured: return "OFFLINE"
        if cached_count is not None and cached_count==0: return "DEGRADED"
        return "ONLINE"
    live_cached=[v for k,v in list(SPORTS_CACHE.items()) if str(k).startswith("football:") and ":True:" in str(k)]
    cricket_cached=[v for k,v in list(SPORTS_CACHE.items()) if str(k).startswith("cricket:")]
    rugby_cached=[v for k,v in list(SPORTS_CACHE.items()) if str(k).startswith("rugby:")]
    news_cached=list(NEWS_CACHE.values())
    live_count=sum(len(x) for x in live_cached if isinstance(x,list))
    return {"status":"ok","sources":{
      "footballFixtures":{"state":state(bool(API_KEY))},
      "footballLive":{"state":state(bool(API_KEY),live_count if live_cached else None),"cachedCount":live_count},
      "footballInjuries":{"state":state(bool(API_KEY))},
      "footballOdds":{"state":state(bool(API_KEY) and bool(ODDS_API_ENABLED))},
      "rugby":{"state":state(bool(SPORTS_API_KEYS.get("rugby")) or True, sum(len(x) for x in rugby_cached if isinstance(x,list)) if rugby_cached else None)},
      "cricket":{"state":state(True, sum(len(x) for x in cricket_cached if isinstance(x,list)) if cricket_cached else None)},
      "sportsNews":{"state":state(True, sum(len(x) for x in news_cached if isinstance(x,list)) if news_cached else None)}
    },"note":"ONLINE means configured/available; DEGRADED means a cached request returned no data. This endpoint does not trigger paid provider calls."}

@app.get("/config")
async def config():
    return {
        "version": "v182",
        "apiFootballConfigured": bool(API_KEY),
        "timezone": TIMEZONE,
        "cacheSeconds": V141_CACHE_TTL_SECONDS,
        "fixtureRefreshSeconds": V141_FIXTURE_REFRESH_SECONDS,
        "predictionRefreshSeconds": V141_PREDICTION_REFRESH_SECS,
        "learningEnabled": True,
        "mlEnabled": True,
        "oddsEnabled": True,
        "livePredictionsEnabled": True,
        "liveOddsEndpoint": "/odds/live",
        "modelVersion": V141_MODEL_VERSION,
        "predictionWeights": V141_PREDICTION_WEIGHTS,
        "rateLimitPerMinute": RATE_LIMIT_PER_MINUTE,
        "localRateLimitDisabled": RATE_LIMIT_PER_MINUTE <= 0,
    }


# ---------------------------------------------------------------------------
# PLAYER STATS ENDPOINTS  — powered by FPL API (free, no key, daily update)
# ---------------------------------------------------------------------------
# The official Fantasy Premier League API provides rich player stats for the
# current Premier League season, updated daily, completely free with no API key.
# Endpoint: https://fantasy.premierleague.com/api/bootstrap-static/
#
# We cache the full FPL bootstrap for 24 hrs (one fetch covers all endpoints).
# The data is normalised into the same response shape the dashboard expects,
# so no changes are needed on the frontend side.
# ---------------------------------------------------------------------------

FPL_BOOTSTRAP_URL = "https://fantasy.premierleague.com/api/bootstrap-static/"
FPL_PLAYER_SUMMARY_URL = "https://fantasy.premierleague.com/api/element-summary/{player_id}/"

# Position map: FPL element_type -> position name
FPL_POSITION_MAP = {1: "Goalkeeper", 2: "Defender", 3: "Midfielder", 4: "Forward"}


async def _fetch_fpl_bootstrap(bust_cache: bool = False) -> dict:
    """Fetch and cache the FPL bootstrap-static payload for 24 hours.

    Pass bust_cache=True (when the dashboard sends _t) to force a fresh fetch.
    """
    cache_key = "fpl:bootstrap"
    if not bust_cache:
        cached = _players_cache.get(cache_key)
        if cached is not None:
            log.info("FPL bootstrap cache hit")
            return cached

    log.info("Fetching fresh FPL bootstrap from %s", FPL_BOOTSTRAP_URL)
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get(
            FPL_BOOTSTRAP_URL,
            headers={"User-Agent": "Mozilla/5.0 (compatible; KasiScoreFootballDashboard/1.0)"},
        )
        resp.raise_for_status()
        data = resp.json()

    _players_cache[cache_key] = data
    log.info("FPL bootstrap cached (24hr): %d players, %d teams", len(data.get("elements", [])), len(data.get("teams", [])))
    return data


def _fpl_to_response(players: list[dict], teams: dict, positions_map: dict, sort_key: str, limit: int = 20) -> dict:
    """Convert FPL player dicts into the dashboard-compatible response shape.

    Fixes:
    - Off-season: sort falls back to total_points so list is never empty
    - Rating: derived from points-per-game (not ep_this which is 0 off-season)
    - cleanSheets: placed inside statistics[0] where dashboard reads it
    - shots/passes/tackles/dribbles: derived from FPL ICT index values
    """
    sorted_players = sorted(
        players,
        key=lambda p: (p.get(sort_key, 0), p.get("total_points", 0)),
        reverse=True,
    )[:limit]

    response = []
    for p in sorted_players:
        team_name = teams.get(p.get("team"), "Unknown")
        position = positions_map.get(p.get("element_type"), "Unknown")
        goals        = int(p.get("goals_scored", 0))
        assists      = int(p.get("assists", 0))
        minutes      = int(p.get("minutes", 0))
        saves        = int(p.get("saves", 0))
        clean_sheets = int(p.get("clean_sheets", 0))
        yellow       = int(p.get("yellow_cards", 0))
        red          = int(p.get("red_cards", 0))
        total_points = int(p.get("total_points", 0))
        appearances  = int(p.get("starts", 0)) or max(1, minutes // 70)

        # Rating from points-per-game: 0 pts→5.0, ~8 pts→7.8, ~15 pts→10.0
        ppg    = total_points / max(appearances, 1)
        rating = round(min(10.0, 5.0 + ppg * 0.35), 2)

        # ICT index components — FPL's best proxy for shots/creativity/tackles
        threat     = float(p.get("threat", 0) or 0)
        creativity = float(p.get("creativity", 0) or 0)
        influence  = float(p.get("influence", 0) or 0)

        photo = p.get("photo", "").replace(".jpg", "")
        player_image = (
            f"https://resources.premierleague.com/premierleague/photos/players/110x140/p{photo}.png"
            if photo else None
        )

        response.append({
            "player": {
                "id": p.get("id"),
                "name": f"{p.get('first_name', '')} {p.get('second_name', '')}".strip(),
                "firstname": p.get("first_name", ""),
                "lastname": p.get("second_name", ""),
                "photo": player_image,
                "nationality": None,
                "position": position,
            },
            "statistics": [{
                "team":   {"name": team_name, "logo": None},
                "league": {"name": "Premier League", "country": "England", "logo": None},
                "games": {
                    "appearences": appearances,
                    "minutes":     minutes,
                    "position":    position,
                    "rating":      str(rating),
                },
                "goals": {
                    "total":    goals,
                    "assists":  assists,
                    "saves":    saves,
                    "conceded": int(p.get("goals_conceded", 0)),
                },
                # cleanSheets at top level of statistics[0] — matches dashboard read path
                "cleanSheets": clean_sheets,
                # Derived from FPL ICT index — threat≈shots, creativity≈chances, influence≈defensive
                "shots":    {"total": int(threat / 10),      "on": int(threat / 18)},
                "passes":   {"key":   int(creativity / 10)},
                "tackles":  {"total": int(influence / 8),    "interceptions": int(influence / 14)},
                "dribbles": {"success": int(creativity / 15)},
                "cards":    {"yellow": yellow, "red": red},
                # FPL extras
                "fplPoints":   total_points,
                "fplForm":     p.get("form", "0"),
                "selectedBy":  p.get("selected_by_percent", "0"),
                "transfersIn": int(p.get("transfers_in_event", 0)),
                "bps":         int(p.get("bps", 0)),
            }],
        })

    return {"source": "FPL", "season": "2026/27", "response": response}


@app.get("/players/top-scorers")
async def players_top_scorers(
    league: int = Query(39),
    season: int = Query(2025),
    _t: Optional[int] = Query(None),  # cache-bust param from dashboard
):
    """Top goal scorers from the FPL API (Premier League current season)."""
    try:
        data = await _fetch_fpl_bootstrap(bust_cache=_t is not None)
        teams = {t["id"]: t["name"] for t in data.get("teams", [])}
        # Include all outfield players; off-season totals may be 0 but we still want data
        players = [p for p in data.get("elements", []) if p.get("element_type", 0) != 1]
        return _fpl_to_response(players, teams, FPL_POSITION_MAP, sort_key="goals_scored")
    except httpx.HTTPError as exc:
        log.error("FPL top-scorers fetch error: %s", exc)
        raise HTTPException(502, detail={"code": "FPL_ERROR", "message": str(exc)})
    except Exception as exc:
        log.error("top-scorers unexpected error: %s", exc)
        raise HTTPException(500, detail={"code": "PLAYER_STATS_ERROR", "message": str(exc)})


@app.get("/players/top-assists")
async def players_top_assists(
    league: int = Query(39),
    season: int = Query(2025),
    _t: Optional[int] = Query(None),
):
    """Top assisters from the FPL API (Premier League current season)."""
    try:
        data = await _fetch_fpl_bootstrap(bust_cache=_t is not None)
        teams = {t["id"]: t["name"] for t in data.get("teams", [])}
        players = [p for p in data.get("elements", []) if p.get("element_type", 0) != 1]
        return _fpl_to_response(players, teams, FPL_POSITION_MAP, sort_key="assists")
    except httpx.HTTPError as exc:
        log.error("FPL top-assists fetch error: %s", exc)
        raise HTTPException(502, detail={"code": "FPL_ERROR", "message": str(exc)})
    except Exception as exc:
        log.error("top-assists unexpected error: %s", exc)
        raise HTTPException(500, detail={"code": "PLAYER_STATS_ERROR", "message": str(exc)})


@app.get("/players/top-saves")
async def players_top_saves(
    league: int = Query(39),
    season: int = Query(2025),
    _t: Optional[int] = Query(None),
):
    """Top goalkeepers by saves from the FPL API (Premier League current season)."""
    try:
        data = await _fetch_fpl_bootstrap(bust_cache=_t is not None)
        teams = {t["id"]: t["name"] for t in data.get("teams", [])}
        # Filter to GKs only (element_type == 1)
        gks = [p for p in data.get("elements", []) if p.get("element_type") == 1]
        return _fpl_to_response(gks, teams, FPL_POSITION_MAP, sort_key="saves")
    except httpx.HTTPError as exc:
        log.error("FPL top-saves fetch error: %s", exc)
        raise HTTPException(502, detail={"code": "FPL_ERROR", "message": str(exc)})
    except Exception as exc:
        log.error("top-saves unexpected error: %s", exc)
        raise HTTPException(500, detail={"code": "PLAYER_STATS_ERROR", "message": str(exc)})


@app.get("/players/fpl-all")
async def players_fpl_all(
    _t: Optional[int] = Query(None),  # cache-bust param from dashboard
):
    """Full FPL player list — goals, assists, saves, points, form, BPS, selected%.
    Cached 24 hrs. Useful for building custom dashboards or running your own sorts.
    """
    try:
        data = await _fetch_fpl_bootstrap(bust_cache=_t is not None)
        teams = {t["id"]: t["name"] for t in data.get("teams", [])}
        players = data.get("elements", [])
        return _fpl_to_response(players, teams, FPL_POSITION_MAP, sort_key="total_points", limit=100)
    except httpx.HTTPError as exc:
        raise HTTPException(502, detail={"code": "FPL_ERROR", "message": str(exc)})
    except Exception as exc:
        raise HTTPException(500, detail={"code": "PLAYER_STATS_ERROR", "message": str(exc)})



# ---------------------------------------------------------------------------
#  — ORGANIC GROWTH, CONTENT, RETENTION & MONETISATION TELEMETRY
# ---------------------------------------------------------------------------
# These endpoints deliberately expose first-party intelligence and site telemetry.
# They do not manufacture search traffic or fake engagement.  The content engine
# should only publish pages when useful match/competition/team data is available.

GROWTH_DB_PATH = Path(os.getenv("GROWTH_DB_PATH", str(BASE_DIR / "kasiscore_growth.sqlite3")))

def _growth_db():
    GROWTH_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    c = sqlite3.connect(str(GROWTH_DB_PATH), timeout=30)
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA journal_mode=WAL")
    return c

def _init_growth_db():
    with _growth_db() as c:
        c.executescript("""
        CREATE TABLE IF NOT EXISTS page_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_name TEXT NOT NULL,
            path TEXT,
            page_type TEXT,
            sport TEXT,
            competition TEXT,
            entity_id TEXT,
            referrer TEXT,
            session_id TEXT,
            created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_page_events_created ON page_events(created_at);
        CREATE INDEX IF NOT EXISTS idx_page_events_path ON page_events(path);
        CREATE TABLE IF NOT EXISTS web_vitals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            metric TEXT NOT NULL,
            value REAL NOT NULL,
            path TEXT NOT NULL,
            device TEXT DEFAULT '',
            created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_web_vitals_metric_created ON web_vitals(metric, created_at);
        CREATE TABLE IF NOT EXISTS seo_pages (
            path TEXT PRIMARY KEY,
            page_type TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            indexable INTEGER NOT NULL DEFAULT 1
        );
        """)

_init_growth_db()

SEO_PAGE_TYPES = {
    "competition": {"priority": "0.9", "changefreq": "hourly"},
    "fixtures": {"priority": "0.8", "changefreq": "hourly"},
    "results": {"priority": "0.7", "changefreq": "hourly"},
    "predictions": {"priority": "0.9", "changefreq": "hourly"},
    "team": {"priority": "0.8", "changefreq": "daily"},
    "player": {"priority": "0.7", "changefreq": "daily"},
    "match": {"priority": "1.0", "changefreq": "hourly"},
    "today": {"priority": "1.0", "changefreq": "hourly"},
    "weekend": {"priority": "1.0", "changefreq": "hourly"},
    "news": {"priority": "0.7", "changefreq": "hourly"},
    "injuries": {"priority": "0.7", "changefreq": "hourly"},
    "team-stats": {"priority": "0.8", "changefreq": "daily"},
}

def _seo_slug(value: str) -> str:
    import re
    return re.sub(r"[^a-z0-9]+", "-", str(value or "").lower()).strip("-")

def _seo_registry_pages():
    now = datetime.now(timezone.utc).isoformat()
    rows = [
        {"path":"/", "pageType":"home", "title":"Kasi Sports News", "description":"Live scores, AI predictions, match intelligence, sports analysis and results."},
        {"path":"/today", "pageType":"today", "title":"Today's Sports Intelligence", "description":"Today's live matches, fixtures, predictions, results and AI sports intelligence."},
        {"path":"/weekend", "pageType":"weekend", "title":"Weekend Sports Intelligence", "description":"Weekend football, rugby and sports fixtures, predictions, live matches and AI analysis."},
        {"path":"/football", "pageType":"sport", "title":"Football Intelligence", "description":"Football scores, fixtures, predictions, tables, teams, players and match intelligence."},
        {"path":"/rugby", "pageType":"sport", "title":"Rugby Intelligence", "description":"Rugby fixtures, results, standings, teams and match intelligence."},
        {"path":"/match", "pageType":"match", "title":"Football Match Intelligence", "description":"KasiScore match predictions, odds, lineups, injuries, live scores and post-match intelligence."},
        {"path":"/team", "pageType":"team", "title":"Team Intelligence", "description":"Team fixtures, results, form, injuries, statistics and Kasi Sports News match intelligence."},
        {"path":"/player", "pageType":"player", "title":"Player Intelligence", "description":"Player statistics, form, goals, assists, availability and match impact."},
    ]
    for c in COMPETITION_REGISTRY:
        if not c.get("", True):
            continue
        sport = _seo_slug(c.get("sport"))
        slug = c.get("slug") or _seo_slug(c.get("name"))
        base = f"/{sport}/{slug}"
        name = c.get("name")
        rows.extend([
            {"path":base,"pageType":"competition","title":f"{name} | Kasi Sports News","description":f"{name} fixtures, results, standings, predictions, news and AI match intelligence."},
            {"path":f"{base}/fixtures","pageType":"fixtures","title":f"{name} Fixtures | Kasi Sports News","description":f"Upcoming {name} fixtures, kickoff times and match intelligence."},
            {"path":f"{base}/results","pageType":"results","title":f"{name} Results | Kasi Sports News","description":f"Latest {name} results, scores and post-match intelligence."},
            {"path":f"{base}/predictions","pageType":"predictions","title":f"{name} Predictions | Kasi Sports News","description":f"AI predictions, probabilities and match analysis for {name}."},
            {"path":f"{base}/table","pageType":"competition","title":f"{name} Table | Kasi Sports News","description":f"{name} league table, form, points, goal difference and AI projections."},
            {"path":f"{base}/today","pageType":"today","title":f"{name} Today | Kasi Sports News","description":f"{name} matches today, live scores, statistics and Kasi Sports News AI intelligence."},
            {"path":f"{base}/news","pageType":"news","title":f"{name} News | Kasi Sports News","description":f"Latest {name} news, team analysis, injuries and match intelligence."},
            {"path":f"{base}/injuries","pageType":"injuries","title":f"{name} Injuries | Kasi Sports News","description":f"{name} injury updates, availability and match impact."},
            {"path":f"{base}/stats","pageType":"team-stats","title":f"{name} Statistics | Kasi Sports News","description":f"{name} statistics, form, goals, corners and performance intelligence."},
        ])
    return rows

@app.get("//pages")
async def seo_pages(page_type: str = Query(""), sport: str = Query(""), limit: int = Query(500, ge=1, le=5000)):
    rows = _seo_registry_pages()
    if page_type:
        rows = [r for r in rows if r["pageType"] == page_type]
    if sport:
        prefix = "/" + _seo_slug(sport) + "/"
        rows = [r for r in rows if r["path"].startswith(prefix)]
    return {"count": len(rows[:limit]), "pages": rows[:limit], "generatedAt": datetime.now(timezone.utc).isoformat()}

@app.get("//render", response_class=HTMLResponse)
async def seo_render(path: str = Query("/")):
    if not path.startswith("/"):
        path = "/" + path
    allowed = ("/today", "/weekend", "/match/", "/team/", "/player/", "/football/")
    if path != "/" and not any(path == a.rstrip("/") or path.startswith(a) for a in allowed):
        raise HTTPException(404, " rendering route not available")
    return HTMLResponse(await _render_seo_document(path), headers={"Cache-Control":"public, max-age=300"})

@app.get("//manifest")
async def seo_manifest():
    rows = _seo_registry_pages()
    by_type = {}
    for r in rows:
        by_type[r["pageType"]] = by_type.get(r["pageType"], 0) + 1
    return {
        "version":"production--1",
        "indexablePages":len(rows),
        "pageTypes":by_type,
        "principle":"Publish useful pages with first-party intelligence; do not create thin doorway pages.",
        "dynamicMatchSitemap":True,
        "rendering":"SSR + SPA hydration",
        "searchConsole":"ready for property verification, sitemap submission and URL inspection",
        "generatedAt":datetime.now(timezone.utc).isoformat(),
    }


def _xml_escape(value: str) -> str:
    return (str(value or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;").replace("'", "&apos;"))

async def _seo_dynamic_rows() -> list[dict]:
    """Build a bounded sitemap from canonical registry pages plus real upcoming matches.
    We intentionally avoid generating thin/imaginary URLs. Only matches returned by the
    existing fixture/odds engine are exposed as match URLs."""
    rows = list(_seo_registry_pages())
    try:
        today = datetime.now().strftime("%Y-%m-%d")
        end = (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d")
        data = await asyncio.wait_for(
            fixtures_with_odds(league="ALL", type="upcoming", date_from=today, date_to=end, refresh=0),
            timeout=8,
        )
        seen = {r["path"] for r in rows}
        for m in (data.get("matches", []) or []):
            home = m.get("home") or m.get("homeTeam") or ""
            away = m.get("away") or m.get("awayTeam") or ""
            if not home or not away:
                continue
            slug = f"{_seo_slug(home)}-vs-{_seo_slug(away)}"
            path = f"/match/{slug}"
            if path in seen:
                continue
            # Only publish a match landing page when there is a real fixture.
            rows.append({
                "path": path,
                "pageType": "match",
                "title": f"{home} vs {away} Prediction, Odds & Match Intelligence | KasiScore",
                "description": f"{home} vs {away} prediction, current odds, form, injuries, H2H and live Kasi Sports News match intelligence.",
            })
            seen.add(path)
    except Exception as exc:
        log.warning("Dynamic  sitemap fixture expansion failed: %s", exc)
    return rows

@app.get("//sitemap.xml", response_class=Response)
async def seo_sitemap():
    rows = await _seo_dynamic_rows()
    origin = os.getenv("PUBLIC_SITE_URL", "https://kasiscore-sports-intelligence.com").rstrip("/")
    body = ['<?xml version="1.0" encoding="UTF-8"?>','<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    now = datetime.now(timezone.utc).date().isoformat()
    seen = set()
    for r in rows:
        path = r.get("path", "")
        if not path or path in seen or not r.get("indexable", True):
            continue
        seen.add(path)
        meta = SEO_PAGE_TYPES.get(r.get("pageType", ""), {"priority":"0.5","changefreq":"daily"})
        body.append(f'<url><loc>{_xml_escape(origin + path)}</loc><lastmod>{now}</lastmod><changefreq>{meta["changefreq"]}</changefreq><priority>{meta["priority"]}</priority></url>')
    body.append('</urlset>')
    return Response("".join(body), media_type="application/xml", headers={"Cache-Control":"public, max-age=900, s-maxage=900, stale-while-revalidate=3600"})

# ---------------------------------------------------------------------------
# SERVER-RENDERED  PAGES — Phase 7
# ---------------------------------------------------------------------------
_SSR_CACHE = TTLCache(maxsize=300, ttl=300)

def _ssr_text(value: Any, fallback: str = "") -> str:
    return escape(str(value if value not in (None, "") else fallback))

def _ssr_find_match(matches: list[dict], wanted_slug: str) -> Optional[dict]:
    wanted = wanted_slug.lower().strip("/")
    for m in matches:
        home = m.get("home") or m.get("homeTeam") or ""
        away = m.get("away") or m.get("awayTeam") or ""
        if wanted in {f"{_seo_slug(home)}-vs-{_seo_slug(away)}", f"{_seo_slug(away)}-vs-{_seo_slug(home)}"}:
            return m
    return None

async def _ssr_match_data(slug: str) -> Optional[dict]:
    key=f"match:{slug}"; cached=_SSR_CACHE.get(key)
    if cached is not None: return cached
    # Prefer predictions already produced by the background learning cycle.
    match=None
    try:
        with v141_learning.connect() as conn:
            rows=conn.execute("SELECT kickoff,home_team,away_team,probabilities,odds,prediction FROM predictions WHERE resolved=0 ORDER BY predicted_at DESC LIMIT 500").fetchall()
        for row in rows:
            if f"{_seo_slug(row['home_team'])}-vs-{_seo_slug(row['away_team'])}" == slug:
                probs=json.loads(row['probabilities'] or "{}")
                odds=json.loads(row['odds'] or "{}")
                pred=json.loads(row['prediction'] or "{}")
                match={"home":row['home_team'],"away":row['away_team'],"kickoff":row['kickoff'] or "","datetime":row['kickoff'] or "","odds":odds,"prediction":{**pred,"probabilities":probs},"league":"Football","oddsAvailable":_valid_1x2(odds)}
                break
    except Exception as exc:
        log.warning("SSR prediction-store lookup failed for %s: %s",slug,exc)
    if match is None:
        today=datetime.now().strftime("%Y-%m-%d"); end=(datetime.now()+timedelta(days=7)).strftime("%Y-%m-%d")
        try:
            data=await asyncio.wait_for(fixtures_with_odds(league="ALL",type="upcoming",date_from=today,date_to=end,refresh=0),timeout=5)
            match=_ssr_find_match(data.get("matches",[]),slug)
        except Exception as exc:
            log.warning("SSR fixture fallback failed for %s: %s",slug,exc); return None
    if not match: return None
    if _valid_1x2(match.get("odds",{})) and not match.get("prediction"):
        match={**match,**_prediction(match),"bookmakerGatePassed":True}
    # Add real form, H2H and availability to the initial HTML when available.
    try:
        home,away=match.get("home",""),match.get("away","")
        hist_h,hist_a,inj_h,inj_a,h2h=await asyncio.wait_for(asyncio.gather(
            team_history(team=home,league_id=0,last=5), team_history(team=away,league_id=0,last=5),
            team_injuries(team=home), team_injuries(team=away), team_h2h(home=home,away=away,last=5)
        ),timeout=5)
        match["_ssrHomeHistory"]=hist_h; match["_ssrAwayHistory"]=hist_a; match["_ssrHomeInjuries"]=inj_h; match["_ssrAwayInjuries"]=inj_a; match["_ssrH2H"]=h2h
    except Exception as exc:
        log.warning("SSR match enrichment failed for %s: %s",slug,exc)
    _SSR_CACHE[key]=match
    return match

def _ssr_match_section(match: dict, path: str) -> tuple[str,str,str]:
    home,away=match.get("home","Home"),match.get("away","Away"); league=match.get("league","Football")
    kickoff=match.get("datetime") or match.get("kickoff") or "Scheduled"
    title=f"{home} vs {away} Prediction, Odds & Match Intelligence"
    desc=f"Kasi Sports News analysis for {home} vs {away}: current bookmaker odds, Kasi Sports News prediction, confidence, form, injuries and match intelligence."
    prediction=match.get("prediction") or {}; probs=prediction.get("probabilities") or {}; confidence=float(prediction.get("confidence",0) or 0)
    if probs:
        key,label=max((("homeWin",home),("draw","Draw"),("awayWin",away)),key=lambda kv:float(probs.get(kv[0],0) or 0)); signal_prob=float(probs.get(key,0) or 0); signal=label
    else: signal,signal_prob="Prediction pending",0.0
    odds=match.get("odds") or {}; odds_ok=_valid_1x2(odds)
    odds_line=f"Home {odds.get('homeWin',0)} · Draw {odds.get('draw',0)} · Away {odds.get('awayWin',0)}" if odds_ok else "Current complete bookmaker 1X2 odds are not available."
    pred_line=f"KasiScore Signal: {signal} · Probability: {signal_prob:.1f}% · Confidence: {confidence:.1f}%" if odds_ok and prediction else "Kasi Sports News prediction is withheld until complete current bookmaker 1X2 odds are available."
    hh=match.get("_ssrHomeHistory",{}).get("matches",[]); ah=match.get("_ssrAwayHistory",{}).get("matches",[])
    def _form(items):
        out=[]
        for x in items[:5]:
            home_side=bool(x.get("isHome")); hg=int(x.get("hg",0) or 0); ag=int(x.get("ag",0) or 0)
            out.append("W" if ((home_side and hg>ag) or (not home_side and ag>hg)) else "L" if ((home_side and hg<ag) or (not home_side and ag<hg)) else "D")
        return " · ".join(out) or "Unavailable"
    h_inj=match.get("_ssrHomeInjuries",{}).get("players",[]); a_inj=match.get("_ssrAwayInjuries",{}).get("players",[])
    inj_text=(f"{home}: "+(", ".join(_ssr_text(x.get("name")) for x in h_inj[:6]) or "No reported records")+" · "+f"{away}: "+(", ".join(_ssr_text(x.get("name")) for x in a_inj[:6]) or "No reported records"))
    h2h=match.get("_ssrH2H",{}); h2h_matches=h2h.get("matches",[]) if isinstance(h2h,dict) else []
    body=(f'<article class="kasiscore--page" data--page="match"><nav aria-label="Breadcrumb"><a href="/">Kasi Sports News</a> / Match / {_ssr_text(home)} vs {_ssr_text(away)}</nav>'
          f'<h1>{_ssr_text(home)} vs {_ssr_text(away)} — Prediction, Odds &amp; Match Intelligence</h1><p class="-lead">{_ssr_text(desc)}</p>'
          f'<section class="-grid"><div><strong>Kickoff</strong><span>{_ssr_text(kickoff)}</span></div><div><strong>Competition</strong><span>{_ssr_text(league)}</span></div>'
          f'<div><strong>KasiScore signal</strong><span>{_ssr_text(signal)}</span></div><div><strong>KasiScore probability</strong><span>{signal_prob:.1f}%</span></div>'
          f'<div><strong>Confidence</strong><span>{confidence:.1f}%</span></div><div><strong>Bookmaker 1X2</strong><span>{_ssr_text(odds_line)}</span></div></section>'
          f'<section><h2>Why KasiScore?</h2><p>{_ssr_text(pred_line)}</p><p>Kasi Sports News combines bookmaker market information with its prediction model and available performance, form, injury and league data. Missing data is disclosed rather than hidden.</p></section>'
          f'<section><h2>Recent form</h2><p>{_ssr_text(home)}: <strong>{_ssr_text(_form(hh))}</strong> · {_ssr_text(away)}: <strong>{_ssr_text(_form(ah))}</strong></p></section>'
          f'<section><h2>Injuries &amp; availability</h2><p>{inj_text}</p></section>'
          f'<section><h2>Head-to-head</h2><p>{len(h2h_matches)} recent H2H matches returned when available. The interactive page provides the full H2H record.</p></section>'
          f'<section><h2>Live match intelligence</h2><p>Use the interactive Kasi Sports News page for live updates, KasiScore vs Market, expected scorers and Live 75 when the match is in play.</p></section>'
          f'<p><a href="/today">Today’s Sports Intelligence</a> · <a href="/weekend">Weekend Intelligence</a> · <a href="/football">Football Intelligence</a></p></article>')
    schema=json.dumps({"@context":"https://schema.org","@type":"SportsEvent","name":f"{home} vs {away}","url":path,"sport":"Soccer","description":desc},ensure_ascii=False)
    return title,desc,body+f'<script type="application/ld+json">{schema}</script>'

async def _ssr_team_section(slug: str, path: str) -> tuple[str,str,str]:
    name=slug.replace("-"," ").strip().title(); key=f"team-page:{slug}"; cached=_SSR_CACHE.get(key)
    if cached: return cached
    try:
        hist=await asyncio.wait_for(team_history(team=name,league_id=0,last=10),timeout=4)
        injuries=await asyncio.wait_for(team_injuries(team=hist.get("team_name",name)),timeout=4)
    except Exception as exc: log.warning("SSR team lookup failed for %s: %s",name,exc); hist={"team_name":name,"matches":[]}; injuries={"count":0,"players":[]}
    team_name=hist.get("team_name",name); matches=hist.get("matches",[])
    wins=sum(1 for m in matches if (m.get("isHome") and m.get("hg",0)>m.get("ag",0)) or (not m.get("isHome") and m.get("ag",0)>m.get("hg",0)))
    title=f"{team_name} Team Intelligence, Fixtures, Form & Injuries"; desc=f"{team_name} fixtures, recent results, form, injuries, statistics and Kasi Sports News analysis."
    rows="".join(f'<li>{_ssr_text("Home" if m.get("isHome") else "Away")} · {m.get("hg",0)}–{m.get("ag",0)}</li>' for m in matches[:10]) or '<li>Recent results unavailable.</li>'
    inj=", ".join(_ssr_text(x.get("name")) for x in (injuries.get("players") or [])[:8]) or "No reported injury records returned."
    body=(f'<article class="kasiscore--page" data--page="team"><nav aria-label="Breadcrumb"><a href="/">Kasi Sports News</a> / Team / {_ssr_text(team_name)}</nav>'
          f'<h1>{_ssr_text(team_name)} Team Intelligence</h1><p class="-lead">{_ssr_text(desc)}</p><section class="-grid">'
          f'<div><strong>Recent matches</strong><span>{len(matches)}</span></div><div><strong>Recent wins</strong><span>{wins}</span></div><div><strong>Reported unavailable</strong><span>{int(injuries.get("count",0) or 0)}</span></div></section>'
          f'<section><h2>Recent form results</h2><ul>{rows}</ul></section><section><h2>Availability</h2><p>{inj}</p></section>'
          f'<p><a href="/today">Today</a> · <a href="/weekend">Weekend</a> · <a href="/football">Football</a></p></article>')
    schema=json.dumps({"@context":"https://schema.org","@type":"SportsTeam","name":team_name,"url":path,"sport":"Soccer","description":desc},ensure_ascii=False)
    result=(title,desc,body+f'<script type="application/ld+json">{schema}</script>'); _SSR_CACHE[key]=result; return result

async def _ssr_player_section(slug: str, path: str) -> tuple[str,str,str]:
    wanted=slug.replace("-"," ").strip().lower(); title_name=wanted.title(); player=None
    try:
        data=await asyncio.wait_for(players_fpl_all(),timeout=4); players=data.get("players",data.get("items",[])); player=next((p for p in players if str(p.get("name","")).lower()==wanted),None) or next((p for p in players if wanted in str(p.get("name","")).lower()),None)
    except Exception as exc: log.warning("SSR player lookup failed for %s: %s",wanted,exc)
    if player: title_name=player.get("name",title_name); team=player.get("team",""); stats=f"Goals {player.get('goals',0)} · Assists {player.get('assists',0)} · Points {player.get('points',player.get('total_points',0))}"
    else: team,stats="","Player data is currently unavailable."
    title=f"{title_name} Player Stats, Form & Match Intelligence"; desc=f"{title_name} player statistics, form, goals, assists, availability and Kasi Sports News data."
    body=(f'<article class="kasiscore--page" data--page="player"><nav aria-label="Breadcrumb"><a href="/">Kasi Sports News</a> / Player / {_ssr_text(title_name)}</nav>'
          f'<h1>{_ssr_text(title_name)} — Player Intelligence</h1><p class="-lead">{_ssr_text(desc)}</p><section class="-grid"><div><strong>Team</strong><span>{_ssr_text(team,"Unavailable")}</span></div><div><strong>Statistics</strong><span>{_ssr_text(stats)}</span></div></section>'
          f'<section><h2>Kasi Sports News player intelligence</h2><p>Track player form, goals, assists, availability and match impact alongside Kasi Sports News fixture predictions and expected-scorer intelligence.</p></section><p><a href="/today">Today</a> · <a href="/football">Football Intelligence</a></p></article>')
    schema=json.dumps({"@context":"https://schema.org","@type":"Person","name":title_name,"url":path,"description":desc},ensure_ascii=False)
    return title,desc,body+f'<script type="application/ld+json">{schema}</script>'

async def _ssr_generic_section(path: str) -> tuple[str,str,str]:
    """Build useful, route-specific server-rendered content for search engines and no-JS clients."""
    p=path.rstrip("/") or "/"
    registry={r.get("path"):r for r in _seo_registry_pages()}
    row=registry.get(p,{})
    title=row.get("title") or "Kasi Sports News"
    desc=row.get("description") or "Live scores, fixtures, predictions, results and sports intelligence."
    parts=[x for x in p.split("/") if x]
    sport=(parts[0].replace("-"," ").title() if parts else "Sports")
    competition=(parts[1].replace("-"," ").title() if len(parts)>1 else "")
    section_name=(parts[2].replace("-"," ").title() if len(parts)>2 else "")

    if p=="/today":
        h1="Today’s Sports Intelligence"; intro="Follow today’s fixtures, live matches, results and prediction coverage across supported competitions."
    elif p=="/weekend":
        h1="Weekend Sports Intelligence"; intro="Explore weekend fixtures, results and match intelligence across supported football and sports competitions."
    elif p=="/football":
        h1="Football Scores, Fixtures & Intelligence"; intro="Browse football competitions, fixtures, results, predictions, tables, news, injuries and statistics."
    elif competition:
        h1=f"{competition} {section_name}".strip() if section_name else f"{competition} Football Intelligence"
        section_copy={
            "Fixtures":f"Upcoming {competition} fixtures, kickoff information and match intelligence.",
            "Results":f"Latest {competition} results and completed match information.",
            "Predictions":f"{competition} prediction coverage, probabilities and match analysis when qualifying data is available.",
            "Table":f"{competition} standings, form and competition performance information.",
            "Today":f"{competition} matches scheduled today, live information and results when available.",
            "News":f"Latest {competition} news and competition updates from available sources.",
            "Injuries":f"{competition} injury and player availability information when reported.",
            "Stats":f"{competition} statistics, form and performance intelligence.",
        }
        intro=section_copy.get(section_name, f"{competition} fixtures, results, standings, predictions, news and match intelligence.")
    else:
        h1=title.replace(" | Kasi Sports News",""); intro=desc

    breadcrumb_items=[("Kasi Sports News","/")]
    if parts: breadcrumb_items.append((sport,f"/{parts[0]}"))
    if competition: breadcrumb_items.append((competition,f"/{parts[0]}/{parts[1]}"))
    if section_name: breadcrumb_items.append((section_name,p))
    breadcrumb=" / ".join(f'<a href="{escape(url,quote=True)}">{_ssr_text(label)}</a>' if url != p else _ssr_text(label) for label,url in breadcrumb_items)

    if competition and len(parts)>=2:
        base=f"/{parts[0]}/{parts[1]}"
        related=[("Overview",base),("Fixtures",base+"/fixtures"),("Results",base+"/results"),("Predictions",base+"/predictions"),("Table",base+"/table"),("Today",base+"/today"),("News",base+"/news"),("Injuries",base+"/injuries"),("Stats",base+"/stats")]
    else:
        related=[("Today","/today"),("Weekend","/weekend"),("Football","/football"),("Rugby","/rugby")]
    links=" · ".join(f'<a href="{escape(u,quote=True)}">{_ssr_text(n)}</a>' for n,u in related)

    body=(f'<article class="kasiscore--page" data--page="hub"><nav aria-label="Breadcrumb">{breadcrumb}</nav>'
          f'<h1>{_ssr_text(h1)}</h1><p class="-lead">{_ssr_text(intro)}</p>'
          f'<section><h2>Latest {_ssr_text(section_name or competition or sport)} coverage</h2><p>{_ssr_text(desc)}</p></section>'
          f'<nav aria-label="Related sports pages">{links}</nav></article>')
    web_schema={"@context":"https://schema.org","@type":"CollectionPage","name":h1,"description":desc,"url":p}
    crumb_schema={"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":i+1,"name":label,"item":url} for i,(label,url) in enumerate(breadcrumb_items)]}
    return title,desc,body+f'<script type="application/ld+json">{json.dumps(web_schema,ensure_ascii=False)}</script><script type="application/ld+json">{json.dumps(crumb_schema,ensure_ascii=False)}</script>'

async def _render_seo_document(path: str) -> str:
    key=f"doc:{path}"; cached=_SSR_CACHE.get(key)
    if cached is not None: return cached
    if path.startswith("/match/"):
        match=await _ssr_match_data(path.split("/",2)[2]);
        if match: title,desc,section=_ssr_match_section(match,path)
        else: title,desc,section=await _ssr_generic_section(path)
    elif path.startswith("/team/"): title,desc,section=await _ssr_team_section(path.split("/",2)[2],path)
    elif path.startswith("/player/"): title,desc,section=await _ssr_player_section(path.split("/",2)[2],path)
    else: title,desc,section=await _ssr_generic_section(path)
    html=(BASE_DIR/"index.html").read_text(encoding="utf-8"); public=os.getenv("PUBLIC_SITE_URL","").rstrip("/"); canonical=f"{public}{path}" if public else path
    html=re.sub(r'<title>.*?</title>',f'<title>{escape(title)} | Kasi Sports News</title>',html,count=1,flags=re.S)
    html=re.sub(r'<meta name="description" content="[^"]*">',f'<meta name="description" content="{escape(desc,quote=True)}">',html,count=1)
    if re.search(r'<link rel="canonical"',html): html=re.sub(r'<link rel="canonical"[^>]*>',f'<link rel="canonical" href="{escape(canonical,quote=True)}">',html,count=1)
    schema=json.dumps({"@context":"https://schema.org","@type":"WebPage","name":title,"description":desc,"url":canonical},ensure_ascii=False)
    if '<script id="seoSchema"' in html: html=re.sub(r'<script id="seoSchema"[^>]*>.*?</script>',f'<script id="seoSchema" type="application/ld+json">{schema}</script>',html,count=1,flags=re.S)
    else: html=html.replace('</head>',f'<script id="seoSchema" type="application/ld+json">{schema}</script></head>',1)
    # Production search metadata. The verification token is supplied only through env
    # after the owner verifies the real domain in Google Search Console.
    if not re.search(r'<meta\\s+name=["\\\']robots["\\\']', html, flags=re.I):
        html=html.replace("</head>",'<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"></head>',1)
    verification=os.getenv("GOOGLE_SITE_VERIFICATION", "").strip()
    if verification:
        tag=f'<meta name="google-site-verification" content="{escape(verification, quote=True)}">'
        html=html.replace('</head>',tag+'</head>',1)
    og_title=escape(title, quote=True); og_desc=escape(desc, quote=True); og_url=escape(canonical, quote=True)
    social_image=(public + "/og-image.svg") if public else "/og-image.svg"
    html=html.replace('</head>',f'<meta property="og:title" content="{og_title}"><meta property="og:description" content="{og_desc}"><meta property="og:url" content="{og_url}"><meta property="og:type" content="website"><meta property="og:image" content="{escape(social_image,quote=True)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{og_title}"><meta name="twitter:description" content="{og_desc}"><meta name="twitter:image" content="{escape(social_image,quote=True)}"></head>',1)
    css='<style id="kasiscore-ssr-css">.kasiscore--page{max-width:1180px;margin:0 auto 18px;padding:18px;border:1px solid var(--line);border-radius:15px;background:var(--card-bg);color:var(--text)}.kasiscore--page h1{font-size:clamp(24px,4vw,38px);margin:10px 0}.kasiscore--page h2{font-size:18px;margin:18px 0 8px}.kasiscore--page a{color:var(--accent)}.-lead{font-size:15px;color:var(--muted);max-width:900px}.-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:14px 0}.-grid div{padding:11px;border:1px solid var(--line);border-radius:10px;background:var(--panel2)}.-grid strong,.-grid span{display:block}.-grid strong{font-size:10px;text-transform:uppercase;color:var(--muted)}.-grid span{font-weight:800;margin-top:4px}@media(max-width:700px){.-grid{grid-template-columns:1fr 1fr}}@media(max-width:440px){.-grid{grid-template-columns:1fr}}</style>'
    # SEO Phase 2: keep route-specific SSR content in the document while the SPA hydrates normally.
    if section and path != "/":
        body_open=re.search(r"<body[^>]*>", html, flags=re.I)
        if body_open:
            insert_at=body_open.end()
            html=html[:insert_at]+css+section+html[insert_at:]
    _SSR_CACHE[key]=html
    return html


@app.get("/launch-check", include_in_schema=False)
async def launch_check():
    index_path=BASE_DIR/"index.html"
    index_text=index_path.read_text(encoding="utf-8") if index_path.exists() else ""
    checks={
        "frontend_present": index_path.exists(),
        "homepage_ad_placeholder_absent": 'id="kasiTopAdSlot"' not in index_text,
        "auth_secret_configured": bool(os.getenv("AUTH_SECRET","").strip()),
        "auth_admin_key_configured": bool(os.getenv("AUTH_ADMIN_KEY","").strip()),
        "football_api_configured": bool(os.getenv("AFOOT_API_KEY","").strip()),
        "search_console_configured": bool(os.getenv("GOOGLE_SITE_VERIFICATION","").strip()),
        "public_domain_configured": bool(os.getenv("PUBLIC_SITE_URL","").strip()),
        "postgres_configured": bool(os.getenv("DATABASE_URL","").strip()),
    }
    return {
        "ok_for_current_stage": all((
            checks["frontend_present"],
            checks["homepage_ad_placeholder_absent"],
            checks["auth_secret_configured"],
            checks["auth_admin_key_configured"]
        )),
        "checks":checks,
        "notes":{
            "football_api_configured":"Expected false until the sports API subscription is activated.",
            "postgres_configured":"Expected false until PostgreSQL is created.",
            "public_domain_configured":"Expected false until the custom domain is configured."
        }
    }

@app.get("/seo-check", include_in_schema=False)
async def seo_check():
    sample=await _render_seo_document("/football/premier-league")
    home=await _render_seo_document("/")
    robots_re=re.compile(r'<meta[^>]+name=["\\\']robots["\\\']',re.I)
    return {
        "homepage":{
            "visible_ssr_panel_injected": 'id="kasiscore-ssr-css"' in home,
            "canonical_present": bool(re.search(r'<link rel="canonical"',home,re.I)),
            "robots_meta_present": bool(robots_re.search(home)),
            "structured_data_present": 'application/ld+json' in home
        },
        "competition_sample":{
            "path":"/football/premier-league",
            "canonical_present": bool(re.search(r'<link rel="canonical"',sample,re.I)),
            "robots_meta_present": bool(robots_re.search(sample)),
            "structured_data_present": 'application/ld+json' in sample,
            "ssr_content_present": 'kasiscore--page' in sample
        },
        "expected_404_tests":[
            "/match/this-match-does-not-exist",
            "/team/not-a-real-team",
            "/player/not-a-real-player",
            "/news/not-a-real-article"
        ]
    }

@app.get("/about",include_in_schema=False)

@app.get("/privacy",include_in_schema=False)
@app.get("/terms",include_in_schema=False)
@app.get("/cookies",include_in_schema=False)
def public_info_spa_page():
    p=BASE_DIR/"index.html"
    if p.exists(): return FileResponse(p)
    raise HTTPException(status_code=404,detail="Frontend not found")

@app.get("/locale",include_in_schema=False)
def locale_hint(request: Request):
    country=(request.headers.get("cf-ipcountry") or request.headers.get("x-vercel-ip-country") or request.headers.get("x-country-code") or "").upper()
    accept=request.headers.get("accept-language","")
    return {"country":country[:2],"acceptLanguage":accept[:120]}



# ---------------- v227 Production Monetization + Edge Protection ----------------
MONETIZATION = {
    "adsense_client": os.getenv("ADSENSE_CLIENT_ID","").strip(),
    "affiliate_disclosure": os.getenv(
        "AFFILIATE_DISCLOSURE",
        "Kasi Sports News may earn a commission from qualifying purchases made through clearly marked affiliate links, at no additional cost to you."
    ),
    "sponsorship_email": os.getenv("SPONSORSHIP_EMAIL","admin@kasilivescore.com").strip(),
}
ADS_TXT_LINE = os.getenv("ADS_TXT_LINE","").strip()

# Shared application cache: a million browser refreshes inside the TTL reuse the same
# origin result per process instead of triggering a million upstream provider calls.
# Cloudflare provides the first layer; existing provider caches remain the final layer.
_v227_cache = {}
_v227_locks = {}
_v227_guard = threading.Lock()

def _v227_lock(key):
    with _v227_guard:
        if key not in _v227_locks:
            _v227_locks[key]=threading.Lock()
        return _v227_locks[key]

def v227_cached(key, ttl, loader):
    now=time.time()
    item=_v227_cache.get(key)
    if item and item[0] > now:
        return item[1]
    with _v227_lock(key):
        now=time.time()
        item=_v227_cache.get(key)
        if item and item[0] > now:
            return item[1]
        value=loader()
        _v227_cache[key]=(now+ttl,value)
        return value

@app.middleware("http")
async def v227_cache_headers(request: Request, call_next):
    response=await call_next(request)
    p=request.url.path
    # Never CDN-cache user/auth/admin/private endpoints.
    private_prefixes=("/auth","/admin","/login","/signup","/register","/production-readiness")
    if p.startswith(private_prefixes):
        response.headers["Cache-Control"]="private, no-store"
        return response
    # Browser can revalidate frequently while Cloudflare keeps the shared response
    # for the product's established refresh cadence.
    if p.startswith("/live") or p.startswith("/sports/football/live") or p.startswith("/api/live-scores-with-odds"):
        response.headers["Cache-Control"]="public, max-age=15, s-maxage=180, stale-while-revalidate=30"
        response.headers["CDN-Cache-Control"]="public, s-maxage=180, stale-while-revalidate=30"
    elif p.startswith("/fixtures") or p.startswith("/odds") or p.startswith("/ai-predictions"):
        response.headers["Cache-Control"]="public, max-age=60, s-maxage=1800, stale-while-revalidate=120"
        response.headers["CDN-Cache-Control"]="public, s-maxage=1800, stale-while-revalidate=120"
    elif p.startswith("/standings") or p.startswith("/team/") or p.startswith("/player/") or p.startswith("/sports-db"):
        response.headers["Cache-Control"]="public, max-age=300, s-maxage=21600, stale-while-revalidate=600"
        response.headers["CDN-Cache-Control"]="public, s-maxage=21600, stale-while-revalidate=600"
    elif request.method=="GET" and (p=="/" or re.match(r"^/[a-z]{2}(?:-[a-z]{2})?(?:/|$)",p,re.I)):
        response.headers["Cache-Control"]="public, max-age=60, s-maxage=900, stale-while-revalidate=300"
        response.headers["CDN-Cache-Control"]="public, s-maxage=900, stale-while-revalidate=300"
    return response

@app.get("/ads.txt", include_in_schema=False)
def ads_txt():
    # Set ADS_TXT_LINE only after AdSense gives you the real publisher ID.
    # Never publish a made-up pub ID.
    return Response(content=(ADS_TXT_LINE+"\n") if ADS_TXT_LINE else "# Add the authorized seller line supplied by AdSense after approval.\n",
                    media_type="text/plain",
                    headers={"Cache-Control":"public, max-age=300, s-maxage=3600"})

@app.get("/monetization/config", include_in_schema=False)
def monetization_config():
    return {
        "adsenseConfigured": bool(MONETIZATION["adsense_client"]),
        "adsenseClient": MONETIZATION["adsense_client"],
        "affiliateDisclosure": MONETIZATION["affiliate_disclosure"],
        "sponsorshipEmail": MONETIZATION["sponsorship_email"],
        "affiliateRel": "sponsored nofollow noopener",
        "currency": "ZAR",
        "placements": {
            "leaderboard": os.getenv("ADSENSE_SLOT_LEADERBOARD",""),
            "inContent": os.getenv("ADSENSE_SLOT_IN_CONTENT",""),
            "rightRailRectangle": os.getenv("ADSENSE_SLOT_RIGHT_RECTANGLE",""),
            "rightRailSkyscraper": os.getenv("ADSENSE_SLOT_RIGHT_SKYSCRAPER",""),
            "mobile": os.getenv("ADSENSE_SLOT_MOBILE","")
        }
    }

@app.get("/sponsor", response_class=HTMLResponse, include_in_schema=False)
def sponsor_page():
    email=html.escape(MONETIZATION["sponsorship_email"])
    return HTMLResponse(f"""<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Advertise & Sponsor | Kasi Sports News</title><meta name="description" content="Advertising, sponsorship and commercial partnership opportunities with Kasi Sports News.">
<link rel="canonical" href="{_seo_base()}/sponsor"></head><body style="font-family:system-ui;max-width:900px;margin:40px auto;padding:20px">
<h1>Advertise & Sponsor Kasi Sports News</h1><p>Commercial opportunities can include clearly labelled sponsored placements, campaign partnerships and sports-related brand integrations.</p>
<p>Sponsored content and paid placements are identified as advertising or sponsored content and remain separate from editorial and sports-data results.</p>
<p>Commercial enquiries: <a href="mailto:{email}">{email}</a></p><p><a href="/">Return to Kasi Sports News</a></p></body></html>""")

@app.get("/affiliate-disclosure", response_class=HTMLResponse, include_in_schema=False)
def affiliate_disclosure_page():
    d=html.escape(MONETIZATION["affiliate_disclosure"])
    return HTMLResponse(f"""<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Affiliate Disclosure | Kasi Sports News</title><link rel="canonical" href="{_seo_base()}/affiliate-disclosure"></head>
<body style="font-family:system-ui;max-width:900px;margin:40px auto;padding:20px"><h1>Affiliate Disclosure</h1><p>{d}</p>
<p>Affiliate relationships do not determine scores, statistics, standings or prediction calculations.</p><p><a href="/">Return to Kasi Sports News</a></p></body></html>""")


@app.get("/monetization/placements", include_in_schema=False)
def monetization_placements():
    return {
        "strategy": ["adsense","affiliate","direct-sponsorship"],
        "emptySlotsCollapsed": True,
        "desktop": ["leaderboard","after-live","after-fixtures","after-predictions","right-rectangle","right-sponsor","right-skyscraper","right-affiliate","bottom-sponsor"],
        "mobile": ["leaderboard","after-live","after-fixtures","after-predictions","mobile-sponsor","mobile-affiliate","bottom-sponsor"],
        "note": "AdSense slot IDs and commercial partner URLs are environment/config driven; no publisher or partner identifiers are fabricated."
    }


# ---------------- v229 Contact + Footer cleanup ----------------
@app.get("/contact", response_class=HTMLResponse, include_in_schema=False)
def kasi_contact_page():
    base = os.getenv("PUBLIC_APP_URL","https://www.kasilivescore.com").rstrip("/")
    return HTMLResponse(f"""<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Contact | Kasi Sports News</title>
<meta name="description" content="Contact Kasi Sports News for general, advertising, affiliate and sponsorship inquiries.">
<link rel="canonical" href="{base}/contact">
<style>
body{{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:0;background:#0b1220;color:#f4f7fb}}
main{{max-width:820px;margin:0 auto;padding:56px 22px}}
a{{color:inherit}} .card{{padding:28px;border:1px solid rgba(255,255,255,.15);border-radius:16px;background:rgba(255,255,255,.05)}}
.muted{{opacity:.75}} footer{{margin-top:34px;padding-top:22px;border-top:1px solid rgba(255,255,255,.12);font-size:.9rem}}
</style></head><body><main>
<div class="card">
<h1>Contact Kasi Sports News</h1>
<p><strong>Inquiries:</strong> <a href="mailto:admin@kasilivescore.com">admin@kasilivescore.com</a> · 248 Imam Haron Road, Claremont, Cape Town</p>
<p class="muted">For general inquiries, advertising, affiliate partnerships and direct sponsorship opportunities.</p>
</div>
<footer>© 2026 Kasi Sports News. All rights reserved.</footer>
</main></body></html>""")

# ---------------- v226 International SEO & Discoverability ----------------
SEO_LOCALES = [
 "en","zu","xh","af","st","tn","yo","ig","ha","sw","am","so","sn","ar","ar-eg","ar-ma","ar-dz","ar-ly",
 "fr","pt","es","de","zh-cn","zh-tw","ja","ko","hi","bn","ur","id","ms","vi","th","tl","ta","pl","it","nl",
 "ro","cs","el","tr","uk","ru","sv","da","no","fi","en-us","en-ca","fr-ca","es-mx","es-ar","es-co","es-cl",
 "es-pe","pt-br","ht","qu","gn","tzm","ee","kbp"
]
SEO_INDEX_SECTIONS = ["fixtures","live","results","standings","predictions","news","teams","players"]

SEO_META = {
 "en":("Kasi Sports News","Live scores, fixtures, results, standings, teams, players, predictions and sports news."),
 "fr":("Kasi Sports News","Scores en direct, matchs, résultats, classements, équipes, joueurs, pronostics et actualités sportives."),
 "es":("Kasi Sports News","Resultados en vivo, partidos, resultados, clasificación, equipos, jugadores, pronósticos y noticias deportivas."),
 "pt":("Kasi Sports News","Resultados ao vivo, jogos, resultados, classificação, equipes, jogadores, previsões e notícias esportivas."),
 "pt-br":("Kasi Sports News","Resultados ao vivo, jogos, classificação, times, jogadores, palpites e notícias esportivas."),
 "ar":("Kasi Sports News","نتائج مباشرة ومباريات وترتيب وفرق ولاعبون وتوقعات وأخبار رياضية."),
 "pl":("Kasi Sports News","Wyniki na żywo, mecze, tabela, drużyny, zawodnicy, prognozy i wiadomości sportowe."),
 "ja":("Kasi Sports News","ライブスコア、試合日程、結果、順位表、チーム、選手、予想、スポーツニュース。"),
 "ko":("Kasi Sports News","라이브 스코어, 경기 일정, 결과, 순위, 팀, 선수, 예측 및 스포츠 뉴스."),
 "zh-cn":("Kasi Sports News","实时比分、赛程、赛果、积分榜、球队、球员、预测和体育新闻。"),
 "zh-tw":("Kasi Sports News","即時比分、賽程、賽果、積分榜、球隊、球員、預測和體育新聞。"),
}
SEO_SECTION_TITLES={
 "fixtures":"Fixtures","live":"Live Scores","results":"Results","standings":"Standings","predictions":"Predictions",
 "news":"Sports News","teams":"Teams","players":"Players"
}

def _seo_base():
    return os.getenv("PUBLIC_APP_URL","https://www.kasilivescore.com").rstrip("/")

def _seo_locale(lang:str)->str:
    x=(lang or "en").lower()
    return x if x in SEO_LOCALES else "en"

def _seo_localized_html(lang:str, section:str="", slug:str="", kind:str=""):
    lang=_seo_locale(lang); base=_seo_base()
    title0,desc=SEO_META.get(lang,SEO_META.get(lang.split("-")[0],SEO_META["en"]))
    label=SEO_SECTION_TITLES.get(section, kind.title() if kind else "")
    title=(f"{label} | {title0}" if label else f"{title0} | Live Scores, Fixtures & Sports Data")
    path=f"/{lang}" + (f"/{section}" if section else "") + (f"/{slug}" if slug else "")
    canonical=base+path
    alternates="\n".join(
      f'<link rel="alternate" hreflang="{x}" href="{base}/{x}{("/"+section) if section else ""}{("/"+slug) if slug else ""}">'
      for x in SEO_LOCALES
    ) + f'\n<link rel="alternate" hreflang="x-default" href="{base}/en{("/"+section) if section else ""}{("/"+slug) if slug else ""}">'
    page=INDEX_HTML.read_text(encoding="utf-8") if INDEX_HTML.exists() else ""
    page=re.sub(r'<link rel="canonical"[^>]*>',f'<link rel="canonical" href="{canonical}">',page,count=1,flags=re.I)
    page=re.sub(r'<meta name="description"[^>]*>',f'<meta name="description" content="{html.escape(desc,quote=True)}">',page,count=1,flags=re.I)
    page=re.sub(r'<meta property="og:title"[^>]*>',f'<meta property="og:title" content="{html.escape(title,quote=True)}">',page,count=1,flags=re.I)
    page=re.sub(r'<meta property="og:description"[^>]*>',f'<meta property="og:description" content="{html.escape(desc,quote=True)}">',page,count=1,flags=re.I)
    page=re.sub(r'<meta property="og:url"[^>]*>',f'<meta property="og:url" content="{canonical}">',page,count=1,flags=re.I)
    page=re.sub(r'<title>.*?</title>',f'<title>{html.escape(title)}</title>',page,count=1,flags=re.I|re.S)
    page=page.replace("</head>",alternates+"\n</head>",1)
    page=page.replace("<html",f'<html lang="{lang}" data-seo-locale="{lang}" data-seo-section="{section}"',1)
    return HTMLResponse(page)

@app.get("/seo/locales",include_in_schema=False)
def seo_locales():
    return {"locales":SEO_LOCALES,"sections":SEO_INDEX_SECTIONS}

@app.get("/{lang}/fixtures",include_in_schema=False)
def localized_fixtures(lang:str): return _seo_localized_html(lang,"fixtures")
@app.get("/{lang}/live",include_in_schema=False)
def localized_live(lang:str): return _seo_localized_html(lang,"live")
@app.get("/{lang}/results",include_in_schema=False)
def localized_results(lang:str): return _seo_localized_html(lang,"results")
@app.get("/{lang}/standings",include_in_schema=False)
def localized_standings(lang:str): return _seo_localized_html(lang,"standings")
@app.get("/{lang}/predictions",include_in_schema=False)
def localized_predictions(lang:str): return _seo_localized_html(lang,"predictions")
@app.get("/{lang}/news",include_in_schema=False)
def localized_news(lang:str): return _seo_localized_html(lang,"news")
@app.get("/{lang}/teams",include_in_schema=False)
def localized_teams(lang:str): return _seo_localized_html(lang,"teams")
@app.get("/{lang}/players",include_in_schema=False)
def localized_players(lang:str): return _seo_localized_html(lang,"players")
@app.get("/{lang}/teams/{slug}",include_in_schema=False)
def localized_team_page(lang:str,slug:str): return _seo_localized_html(lang,"teams",slug,"team")
@app.get("/{lang}/players/{slug}",include_in_schema=False)
def localized_player_page(lang:str,slug:str): return _seo_localized_html(lang,"players",slug,"player")
@app.get("/{lang}/matches/{slug}",include_in_schema=False)
def localized_match_page(lang:str,slug:str): return _seo_localized_html(lang,"matches",slug,"match")
@app.get("/{lang}",include_in_schema=False)
def localized_home(lang:str): return _seo_localized_html(lang)

@app.get("/",response_class=HTMLResponse)
async def root_webapp(): return HTMLResponse(await _render_seo_document("/"),headers={"Cache-Control":"public, max-age=60"})
@app.get("/today",response_class=HTMLResponse)
async def ssr_today(): return HTMLResponse(await _render_seo_document("/today"),headers={"Cache-Control":"public, max-age=300"})
@app.get("/weekend",response_class=HTMLResponse)
async def ssr_weekend(): return HTMLResponse(await _render_seo_document("/weekend"),headers={"Cache-Control":"public, max-age=300"})
@app.get("/match/{slug:path}",response_class=HTMLResponse)
async def ssr_match(slug:str):
    path=f"/match/{slug}"
    match=await _ssr_match_data(slug)
    if not match:
        html=(BASE_DIR/"index.html").read_text(encoding="utf-8")
        html=re.sub(r'<title>.*?</title>', '<title>Match Not Found | Kasi Sports News</title>', html, count=1, flags=re.S)
        html=re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="The requested Kasi Sports News match page could not be found.">', html, count=1)
        html=html.replace("</head>",'<meta name="robots" content="noindex,nofollow"></head>',1)
        return HTMLResponse(html,status_code=404,headers={"Cache-Control":"public, max-age=60"})
    return HTMLResponse(await _render_seo_document(path),headers={"Cache-Control":"public, max-age=300, s-maxage=300, stale-while-revalidate=600"})
def _valid_public_slug(slug: str) -> bool:
    value=(slug or "").strip()
    return bool(re.fullmatch(r"[1-9][0-9]{0,11}", value))

@app.get("/team/{slug:path}",response_class=HTMLResponse)
async def ssr_team(slug:str):
    if not _valid_public_slug(slug): raise HTTPException(404,"Team not found")
    return HTMLResponse(await _render_seo_document(f"/team/{slug}"),headers={"Cache-Control":"public, max-age=300"})
@app.get("/player/{slug:path}",response_class=HTMLResponse)
async def ssr_player(slug:str):
    if not _valid_public_slug(slug): raise HTTPException(404,"Player not found")
    return HTMLResponse(await _render_seo_document(f"/player/{slug}"),headers={"Cache-Control":"public, max-age=300"})
@app.get("/admin",response_class=HTMLResponse)
async def ssr_admin():
    html=await _render_seo_document("/admin")
    html=html.replace("</head>",'<meta name="robots" content="noindex,nofollow"></head>',1)
    return HTMLResponse(html,headers={"Cache-Control":"no-store"})

@app.get("/teams/{slug:path}",response_class=HTMLResponse)
async def ssr_teams(slug:str):
    if not _valid_public_slug(slug): raise HTTPException(404,"Team not found")
    return HTMLResponse(await _render_seo_document(f"/team/{slug}"),headers={"Cache-Control":"public, max-age=300"})
@app.get("/players/{slug:path}",response_class=HTMLResponse)
async def ssr_players(slug:str):
    if not _valid_public_slug(slug): raise HTTPException(404,"Player not found")
    return HTMLResponse(await _render_seo_document(f"/player/{slug}"),headers={"Cache-Control":"public, max-age=300"})
@app.get("/football/{path:path}",response_class=HTMLResponse)
async def ssr_football(path:str): return HTMLResponse(await _render_seo_document(f"/football/{path}"),headers={"Cache-Control":"public, max-age=300"})
@app.get("/rugby/{path:path}",response_class=HTMLResponse)
async def ssr_rugby(path:str): return HTMLResponse(await _render_seo_document(f"/rugby/{path}"),headers={"Cache-Control":"public, max-age=300"})
@app.get("/cricket",response_class=HTMLResponse)
async def ssr_cricket_root(): return HTMLResponse(await _render_seo_document("/cricket"),headers={"Cache-Control":"public, max-age=300"})
@app.get("/cricket/{path:path}",response_class=HTMLResponse)
async def ssr_cricket(path:str): return HTMLResponse(await _render_seo_document(f"/cricket/{path}"),headers={"Cache-Control":"public, max-age=300"})
@app.get("/tennis",response_class=HTMLResponse)
async def ssr_tennis_root(): return HTMLResponse(await _render_seo_document("/tennis"),headers={"Cache-Control":"public, max-age=300"})
@app.get("/tennis/{path:path}",response_class=HTMLResponse)
async def ssr_tennis(path:str): return HTMLResponse(await _render_seo_document(f"/tennis/{path}"),headers={"Cache-Control":"public, max-age=300"})

class GrowthEvent(BaseModel):
    event: str
    path: str = ""
    pageType: str = ""
    sport: str = ""
    competition: str = ""
    entityId: str = ""
    referrer: str = ""
    sessionId: str = ""

class WebVitalEvent(BaseModel):
    metric: str
    value: float
    path: str = ""
    device: str = ""

@app.post("/analytics/web-vital")
def analytics_web_vital(payload: WebVitalEvent):
    metric = payload.metric.strip().upper()
    if metric not in {"LCP", "INP", "CLS", "TTFB"} or not (0 <= payload.value < 120000):
        raise HTTPException(400, "Unsupported web vital")
    with _growth_db() as c:
        c.execute("INSERT INTO web_vitals(metric,value,path,device,created_at) VALUES(?,?,?,?,?)", (
            metric, float(payload.value), payload.path[:500], payload.device[:80], datetime.now(timezone.utc).isoformat()))
    return {"ok": True}

@app.post("/analytics/event")
def analytics_event(payload: GrowthEvent):
    allowed = {"page_view","match_open","prediction_view","live_open","share","follow","notification_enable","search","affiliate_click","ad_view","ad_click"}
    event = payload.event.strip().lower()
    if event not in allowed:
        raise HTTPException(400, f"Unsupported event: {event}")
    with _growth_db() as c:
        c.execute("INSERT INTO page_events(event_name,path,page_type,sport,competition,entity_id,referrer,session_id,created_at) VALUES(?,?,?,?,?,?,?,?,?)", (
            event, payload.path[:500], payload.pageType[:80], payload.sport[:80], payload.competition[:120], payload.entityId[:120], payload.referrer[:500], payload.sessionId[:120], datetime.now(timezone.utc).isoformat()))
    return {"ok":True}

@app.get("/growth/dashboard")
def growth_dashboard():
    with _growth_db() as c:
        total = c.execute("SELECT COUNT(*) FROM page_events").fetchone()[0]
        views = c.execute("SELECT COUNT(*) FROM page_events WHERE event_name='page_view'").fetchone()[0]
        shares = c.execute("SELECT COUNT(*) FROM page_events WHERE event_name='share'").fetchone()[0]
        follows = c.execute("SELECT COUNT(*) FROM page_events WHERE event_name='follow'").fetchone()[0]
        notifications = c.execute("SELECT COUNT(*) FROM page_events WHERE event_name='notification_enable'").fetchone()[0]
        top = [dict(r) for r in c.execute("SELECT path,COUNT(*) count FROM page_events WHERE event_name='page_view' GROUP BY path ORDER BY count DESC LIMIT 20").fetchall()]
        sources = [dict(r) for r in c.execute("SELECT COALESCE(NULLIF(referrer,''),'direct') source,COUNT(*) count FROM page_events GROUP BY source ORDER BY count DESC LIMIT 20").fetchall()]
        vitals = [dict(r) for r in c.execute("SELECT metric, ROUND(AVG(value),2) average, ROUND(MIN(value),2) minimum, ROUND(MAX(value),2) maximum, COUNT(*) samples FROM web_vitals GROUP BY metric").fetchall()]
    return {"phase":"production","events":total,"pageViews":views,"shares":shares,"follows":follows,"notificationEnables":notifications,"topPages":top,"trafficSources":sources,"seoPages":len(_seo_registry_pages()),"webVitals":vitals}




def get_current_user(authorization: Optional[str] = Header(default=None)):
    """Validate Bearer token, load the active user from SQLite, and return a safe user object."""
    row=_user_from_token(authorization)
    if not row:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated",
            headers={"WWW-Authenticate":"Bearer"},
        )
    configured=os.getenv("ADMIN_EMAIL",os.getenv("PAYMENT_ADMIN_EMAIL","")).strip().lower()
    is_configured_admin=bool(configured and str(row[1]).strip().lower()==configured)
    return {"id":int(row[0]),"email":str(row[1]),"pro":True if is_configured_admin else bool(row[2]),
            "role":"admin" if is_configured_admin else str(row[3] or "user").lower(),"status":str(row[4] or "active").lower()}

def require_admin(authorization: Optional[str] = Header(default=None)):
    """Require an authenticated administrator. Non-admin users receive HTTP 403."""
    user=get_current_user(authorization)
    configured=os.getenv("ADMIN_EMAIL",os.getenv("PAYMENT_ADMIN_EMAIL","")).strip().lower()
    is_admin=user["role"]=="admin" or (configured and user["email"].strip().lower()==configured)
    if not is_admin:
        raise HTTPException(status_code=403,detail="Admin access required")
    return user

# Backward-compatible alias for existing admin endpoints.
def _require_admin_user(authorization: Optional[str]):
    return require_admin(authorization)

@app.get("/auth/admin")
def auth_admin(authorization: Optional[str]=Header(default=None)):
    return require_admin(authorization)

class AdminUserUpdate(BaseModel):
    role: Optional[str]=None
    status: Optional[str]=None

@app.get("/admin/users")
def admin_users(authorization: Optional[str]=Header(default=None)):
    _require_admin_user(authorization); c=_auth_db()
    rows=c.execute("SELECT id,email,username,COALESCE(role,'user'),created_at,last_login,COALESCE(status,'active') FROM users ORDER BY created_at DESC").fetchall();c.close()
    return {"users":[{"id":r[0],"email":r[1],"name":r[2] or "","role":r[3],"createdAt":r[4],"lastLogin":r[5],"status":r[6]} for r in rows]}

@app.patch("/admin/users/{user_id}")
def admin_user_update(user_id:int,p:AdminUserUpdate,authorization: Optional[str]=Header(default=None)):
    _require_admin_user(authorization)
    role=(p.role or "").lower();status=(p.status or "").lower()
    if role and role not in {"user","admin"}:raise HTTPException(400,"Invalid role")
    if status and status not in {"active","disabled"}:raise HTTPException(400,"Invalid status")
    c=_auth_db()
    if role:c.execute("UPDATE users SET role=? WHERE id=?",(role,user_id))
    if status:c.execute("UPDATE users SET status=? WHERE id=?",(status,user_id))
    c.commit();n=c.total_changes;c.close();return {"updated":n}

@app.get("/admin/security/status")
def admin_security_status(authorization: Optional[str]=Header(default=None)):
    user=_user_from_token(authorization)
    admin_email=os.getenv("ADMIN_EMAIL",os.getenv("PAYMENT_ADMIN_EMAIL","")).strip().lower()
    if not user or not admin_email or str(user[1]).strip().lower()!=admin_email:
        raise HTTPException(403,"Admin access required")
    recovery=os.getenv("ADMIN_RECOVERY_EMAIL","").strip()
    smtp_ready=bool(os.getenv("SMTP_HOST","").strip() and os.getenv("SMTP_FROM",os.getenv("SMTP_USER","")).strip())
    masked=""
    if recovery and "@" in recovery:
        a,b=recovery.split("@",1);masked=(a[:2]+"***@"+b)
    return {"loginEmail":user[1],"recoveryEmail":masked,"recoveryConfigured":bool(recovery),"smtpConfigured":smtp_ready,"passwordResetDelivery":"configured" if smtp_ready else "not_configured","note":"Recovery email is configured through secure server environment settings."}

@app.get("/admin/analytics")
def admin_analytics(authorization: Optional[str]=Header(default=None)):
    user=_user_from_token(authorization)
    admin_email=os.getenv("ADMIN_EMAIL", os.getenv("PAYMENT_ADMIN_EMAIL", "jbatuma@yahoo.com")).strip().lower()
    if not user or str(user[1]).lower()!=admin_email:
        raise HTTPException(403,"Administrator access required")
    with _growth_db() as c:
        unique_visitors=c.execute("SELECT COUNT(DISTINCT NULLIF(session_id,'')) FROM page_events").fetchone()[0] or 0
        views=c.execute("SELECT COUNT(*) FROM page_events WHERE event_name='page_view'").fetchone()[0] or 0
        clicks=c.execute("SELECT COUNT(*) FROM page_events WHERE event_name NOT IN ('page_view')").fetchone()[0] or 0
        earnings=c.execute("SELECT COALESCE(SUM(amount),0) FROM earnings").fetchone()[0] or 0
        daily=[dict(r) for r in c.execute("SELECT substr(created_at,1,10) day, SUM(CASE WHEN event_name='page_view' THEN 1 ELSE 0 END) views, COUNT(*) clicks FROM page_events WHERE created_at>=date('now','-30 day') GROUP BY substr(created_at,1,10) ORDER BY day").fetchall()]
        top_pages=[dict(r) for r in c.execute("SELECT path,COUNT(*) count FROM page_events WHERE event_name='page_view' GROUP BY path ORDER BY count DESC LIMIT 20").fetchall()]
        top_clicks=[dict(r) for r in c.execute("SELECT path,COUNT(*) count FROM page_events WHERE event_name!='page_view' GROUP BY path ORDER BY count DESC LIMIT 20").fetchall()]
    return {"uniqueVisitors":unique_visitors,"pageViews":views,"clicks":clicks,"earnings":earnings,"daily":daily,"topPages":top_pages,"topClicks":top_clicks}

@app.post("/admin/earnings")
def admin_add_earnings(amount: float=Query(..., ge=0), source: str=Query("manual"), authorization: Optional[str]=Header(default=None)):
    user=_user_from_token(authorization)
    admin_email=os.getenv("ADMIN_EMAIL", os.getenv("PAYMENT_ADMIN_EMAIL", "jbatuma@yahoo.com")).strip().lower()
    if not user or str(user[1]).lower()!=admin_email:
        raise HTTPException(403,"Administrator access required")
    with _growth_db() as c:
        c.execute("INSERT INTO earnings(amount,source,created_at) VALUES(?,?,?)",(float(amount),source[:80],datetime.now(timezone.utc).isoformat()))
    return {"ok":True,"amount":amount,"source":source}


@app.get("/weekend-data")
async def weekend_data(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=200),
):
    """Return the actual weekend fixture, odds and qualified-prediction data.

    The frontend uses this endpoint for the Weekend Hub instead of treating the
    SEO/content shell as if it were match data.
    """
    now = datetime.now()
    # South Africa convention: weekend = Friday through Sunday.
    days_ahead = (4 - now.weekday()) % 7
    friday = (now + timedelta(days=days_ahead)).date()
    saturday = friday + timedelta(days=1)
    sunday = friday + timedelta(days=2)
    d0 = date_from or friday.isoformat()
    d1 = date_to or sunday.isoformat()

    fixtures_data = await fixtures_with_odds(
        league="ALL",
        type="upcoming",
        date_from=d0,
        date_to=d1,
        refresh=0,
    )
    matches = fixtures_data.get("matches", [])
    qualified = []
    for match in matches:
        if match.get("isFinished") or not _valid_1x2(match.get("odds", {})):
            continue
        try:
            pred = _prediction(match)
            _save_prediction_to_db(match, pred)
            qualified.append({
                **match,
                **pred,
                "oddsAvailable": True,
                "bookmakerGatePassed": True,
            })
        except Exception as exc:
            log.warning("Weekend prediction failed fixture=%s: %s", match.get("_afootFixtureId"), exc)

    qualified.sort(key=lambda x: float((x.get("prediction") or {}).get("confidence", 0) or 0), reverse=True)
    return {
        "dateFrom": d0,
        "dateTo": d1,
        "fixtures": matches[:limit],
        "predictions": qualified[:limit],
        "qualifiedCount": len(qualified),
        "oddsComplete": fixtures_data.get("oddsComplete", sum(1 for x in matches if _valid_1x2(x.get("odds", {})))),
        "fixtureCount": len(matches),
        "source": "KasiScore match engine + API-Football",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }

@app.get("/content/weekend")
async def weekend_intelligence():
    # Returns an honest content shell. Live fixture data is fetched by the dashboard
    # from the existing match engine, while this endpoint supplies the publishing plan.
    featured = [c for c in COMPETITION_REGISTRY if c.get("sport") in ALLOWED_PUBLIC_SPORTS and c.get("featured") and c.get("seo")]
    return {
        "title":"Weekend Sports Intelligence",
        "generatedAt":datetime.now(timezone.utc).isoformat(),
        "competitions":[{"name":c["name"],"sport":c["sport"],"slug":c["slug"]} for c in featured],
        "modules":["top-matches","ai-predictions","live-now","odds-movement","prediction-record","post-match-results","share-cards"],
    }


# ============================================================================
# PHASE 4 — SOUTH AFRICAN RUGBY INTELLIGENCE LAYER
# Springboks · URC · Bulls · Stormers · Sharks · Lions · Currie Cup
# Dedicated endpoints for match centres, standings, news, squads,
# and the AI rugby prediction engine (score-line model).
# ============================================================================

import random  # used for ensemble jitter in demo / offline fallback

# ---------------------------------------------------------------------------
# SA Rugby League IDs (API-Sports rugby v1)
# ---------------------------------------------------------------------------
SA_RUGBY_LEAGUES = {
    "springboks":         {"name": "Rugby Championship", "id": 23, "nation": "ZA"},
    "urc":                {"name": "United Rugby Championship", "id": 25, "nation": ""},
    "currie_cup":         {"name": "Currie Cup", "id": 27, "nation": "ZA"},
    "super_rugby_africa": {"name": "Super Rugby Africa", "id": 36, "nation": ""},
    "rugby_world_cup":    {"name": "Rugby World Cup", "id": 22, "nation": ""},
    "lions_series":       {"name": "British & Irish Lions", "id": 39, "nation": ""},
}

SA_CLUBS = {
    "bulls":    {"name": "Bulls",    "city": "Pretoria"},
    "stormers": {"name": "Stormers", "city": "Cape Town"},
    "sharks":   {"name": "Sharks",   "city": "Durban"},
    "lions":    {"name": "Lions",    "city": "Johannesburg"},
    "cheetahs": {"name": "Cheetahs","city": "Bloemfontein"},
    "griquas":  {"name": "Griquas", "city": "Kimberley"},
    "pumas":    {"name": "Pumas",   "city": "Nelspruit"},
    "boland":   {"name": "Boland Cavaliers", "city": "Wellington"},
}

RUGBY_CACHE: TTLCache = TTLCache(maxsize=300, ttl=90)   # 90 s for live
RUGBY_PRED_CACHE: TTLCache = TTLCache(maxsize=100, ttl=3600)  # 1 h for predictions

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _rugby_headers() -> dict:
    key = SPORTS_API_KEYS.get("rugby", "")
    if not key:
        return {}
    return {"x-apisports-key": key, "Accept": "application/json"}

async def _rugby_api(path: str, params: dict | None = None):
    """Call API-Sports rugby endpoint. Returns raw response list or {} on failure."""
    key = SPORTS_API_KEYS.get("rugby", "")
    if not key:
        return None
    url = "https://v1.rugby.api-sports.io" + path
    try:
        data = await _sports_get(url, params or {}, _rugby_headers())
        return data.get("response", data)
    except Exception as exc:
        log.warning("Rugby API %s failed: %s", path, exc)
        return None

def _norm_rugby_game(g: dict, league_name: str = "") -> dict:
    """Normalise an API-Sports rugby game object."""
    teams  = g.get("teams") or {}
    scores = g.get("scores") or {}
    fixture= g.get("fixture") or {}
    status = fixture.get("status") or g.get("status") or {}
    league = g.get("league") or {}
    periods= scores.get("periods") if isinstance(scores, dict) else {}

    home_score = scores.get("home") if isinstance(scores, dict) else None
    away_score = scores.get("away") if isinstance(scores, dict) else None
    ht_home = (periods or {}).get("first", {}).get("home") if periods else None
    ht_away = (periods or {}).get("first", {}).get("away") if periods else None

    return {
        "id":          str(fixture.get("id") or g.get("id") or ""),
        "sport":       "rugby",
        "league":      league.get("name") or league_name,
        "leagueId":    league.get("id"),
        "season":      league.get("season"),
        "round":       league.get("round") or "",
        "date":        fixture.get("date") or g.get("date"),
        "home":        (teams.get("home") or {}).get("name", "Home"),
        "homeId":      (teams.get("home") or {}).get("id"),
        "homeLogo":    (teams.get("home") or {}).get("logo", ""),
        "away":        (teams.get("away") or {}).get("name", "Away"),
        "awayId":      (teams.get("away") or {}).get("id"),
        "awayLogo":    (teams.get("away") or {}).get("logo", ""),
        "homeScore":   home_score,
        "awayScore":   away_score,
        "htHome":      ht_home,
        "htAway":      ht_away,
        "status":      status.get("long") or status.get("short") or "Scheduled",
        "statusShort": status.get("short") or "NS",
        "elapsed":     status.get("elapsed"),
        "venue":       (fixture.get("venue") or {}).get("name") or "",
        "source":      "API-Sports",
    }

# ---------------------------------------------------------------------------
# AI Rugby Prediction Engine
# ---------------------------------------------------------------------------

RUGBY_PRED_WEIGHTS = {
    "form":          0.28,  # recent results (last 5)
    "h2h":          0.20,  # head-to-head
    "home_adv":     0.15,  # home/neutral field
    "ranking":      0.17,  # world ranking proxy
    "attack_def":   0.20,  # points scored vs conceded ratio
}

def _rugby_predict(home: str, away: str, league: str,
                   home_form: list | None = None,
                   away_form: list | None = None,
                   h2h_results: list | None = None,
                   home_ranking: int = 10,
                   away_ranking: int = 10,
                   home_pts_for: float = 25.0,
                   home_pts_against: float = 22.0,
                   away_pts_for: float = 24.0,
                   away_pts_against: float = 23.0,
                   neutral_venue: bool = False) -> dict:
    """
    Weighted ensemble rugby prediction model.
    Returns win probability, predicted scoreline, try count estimate,
    and confidence band.
    """

    # 1. Form signal (W=1, D=0.5, L=0) over last 5 games
    def _form_score(results: list | None) -> float:
        if not results:
            return 0.5
        weights = [0.10, 0.15, 0.20, 0.25, 0.30]  # most recent = highest weight
        results = results[-5:]
        pad = 5 - len(results)
        results = ["D"] * pad + results
        total = sum(
            (1.0 if r == "W" else 0.5 if r == "D" else 0.0) * w
            for r, w in zip(results, weights)
        )
        return total  # 0 → 1

    home_form_score = _form_score(home_form)
    away_form_score = _form_score(away_form)

    # 2. H2H
    def _h2h_score(results: list | None, perspective: str) -> float:
        if not results:
            return 0.5
        wins  = sum(1 for r in results if r.get("winner") == perspective)
        total = len(results)
        return wins / total if total else 0.5

    home_h2h = _h2h_score(h2h_results, "home")
    away_h2h = 1.0 - home_h2h

    # 3. Home advantage (rugby: meaningful ~5-8 pts)
    home_adv_score = 0.60 if not neutral_venue else 0.50
    away_adv_score = 1.0 - home_adv_score

    # 4. World ranking proxy (lower rank = better)
    max_rank = max(home_ranking, away_ranking, 1)
    home_rank_score = (max_rank - home_ranking + 1) / (max_rank + 1)
    away_rank_score = (max_rank - away_ranking + 1) / (max_rank + 1)

    # 5. Attack vs Defence ratio
    home_ad = (home_pts_for / max(home_pts_against, 1)) / 2.5
    away_ad = (away_pts_for / max(away_pts_against, 1)) / 2.5
    # Clamp
    home_ad = min(max(home_ad, 0.1), 1.0)
    away_ad = min(max(away_ad, 0.1), 1.0)

    # Weighted composite
    w = RUGBY_PRED_WEIGHTS
    home_raw = (
        home_form_score * w["form"]
        + home_h2h      * w["h2h"]
        + home_adv_score* w["home_adv"]
        + home_rank_score * w["ranking"]
        + home_ad       * w["attack_def"]
    )
    away_raw = (
        away_form_score * w["form"]
        + away_h2h      * w["h2h"]
        + away_adv_score* w["home_adv"]
        + away_rank_score * w["ranking"]
        + away_ad       * w["attack_def"]
    )

    total = home_raw + away_raw or 1.0
    home_win_prob = round(home_raw / total, 4)
    away_win_prob = round(away_raw / total, 4)
    draw_prob     = round(max(0.03, 0.07 - abs(home_win_prob - away_win_prob) * 0.3), 4)
    # Renormalise
    tot_prob = home_win_prob + draw_prob + away_win_prob
    home_win_prob = round(home_win_prob / tot_prob, 4)
    draw_prob     = round(draw_prob     / tot_prob, 4)
    away_win_prob = round(away_win_prob / tot_prob, 4)

    # Predicted scoreline (based on attack/defence)
    home_pred_pts = round((home_pts_for * 0.6 + away_pts_against * 0.4) * (1 + (home_win_prob - 0.5) * 0.4))
    away_pred_pts = round((away_pts_for * 0.6 + home_pts_against * 0.4) * (1 + (away_win_prob - 0.5) * 0.4))
    # Round to nearest 7 or 3 (rugby scoring increments)
    def _round_rugby(n):
        return max(0, round(n / 3) * 3)
    home_pred_pts = _round_rugby(home_pred_pts)
    away_pred_pts = _round_rugby(away_pred_pts)

    # Confidence: based on spread between probabilities
    spread = abs(home_win_prob - away_win_prob)
    confidence = round(0.45 + spread * 0.6, 4)
    confidence = min(max(confidence, 0.45), 0.93)

    winner = home if home_win_prob >= away_win_prob else away
    if draw_prob > max(home_win_prob, away_win_prob):
        winner = "Draw"

    best_pick = (
        "Home Win" if home_win_prob >= away_win_prob and draw_prob < home_win_prob
        else "Away Win" if away_win_prob > home_win_prob and draw_prob < away_win_prob
        else "Draw"
    )

    # Try estimate (average ~4 tries per game in URC, ~6 in Currie Cup)
    tries_avg = 4.0 if "urc" in league.lower() or "championship" in league.lower() else 5.0
    home_tries = round((home_pred_pts / 7) * 0.8 + (home_pred_pts / 3) * 0.05)
    away_tries = round((away_pred_pts / 7) * 0.8 + (away_pred_pts / 3) * 0.05)

    return {
        "home":          home,
        "away":          away,
        "league":        league,
        "bestPick":      best_pick,
        "winner":        winner,
        "confidence":    confidence,
        "probabilities": {
            "homeWin": home_win_prob,
            "draw":    draw_prob,
            "awayWin": away_win_prob,
        },
        "predictedScore": {
            "home": home_pred_pts,
            "away": away_pred_pts,
        },
        "predictedTries": {
            "home": max(0, home_tries),
            "away": max(0, away_tries),
        },
        "modelWeights": RUGBY_PRED_WEIGHTS,
        "signals": {
            "homeForm":    round(home_form_score, 3),
            "awayForm":    round(away_form_score, 3),
            "homeH2H":     round(home_h2h, 3),
            "awayH2H":     round(away_h2h, 3),
            "homeAdvantage": home_adv_score,
            "homeRanking": round(home_rank_score, 3),
            "awayRanking": round(away_rank_score, 3),
            "homeAttackDef": round(home_ad, 3),
            "awayAttackDef": round(away_ad, 3),
        },
        "source":        "KasiScore Rugby AI v1",
    }

# ---------------------------------------------------------------------------
# SA Rugby Endpoints
# ---------------------------------------------------------------------------

@app.get("/rugby/leagues")
async def rugby_leagues():
    """Return the supported SA rugby leagues with their API IDs."""
    return {"leagues": SA_RUGBY_LEAGUES, "clubs": SA_CLUBS}


@app.get("/rugby/matches")
async def rugby_matches(
    league:  str = Query("urc"),
    season:  int = Query(0, ge=0),
    date:    str = Query(""),
    live:    int = Query(0, ge=0, le=1),
    team:    str = Query(""),
):
    """
    Match centre for SA rugby competitions.
    Falls back to ESPN rugby-union scoreboard when API-Sports key is absent.
    """
    season = season or _current_season()
    cache_key = f"rugby:matches:{league}:{season}:{date}:{live}:{team}"
    if cache_key in RUGBY_CACHE:
        return RUGBY_CACHE[cache_key]

    league_meta = SA_RUGBY_LEAGUES.get(league.lower())
    league_name = league_meta["name"] if league_meta else league

    games: list[dict] = []

    # Primary: API-Sports
    key = SPORTS_API_KEYS.get("rugby", "")
    if key and league_meta:
        params: dict = {"league": league_meta["id"], "season": season}
        if date:
            params["date"] = date
        if live:
            params["live"] = "all"
        if team:
            # Resolve club name to ID if needed (best-effort substring match)
            club = SA_CLUBS.get(team.lower(), {})
            if club:
                params["team"] = team  # caller should pass numeric ID in prod
        raw = await _rugby_api("/games", params)
        if isinstance(raw, list):
            games = [_norm_rugby_game(g, league_name) for g in raw]

    # Fallback: ESPN rugby-union
    if not games:
        try:
            espn_games = await _espn_scores("rugby", date or None, "rugby-union")
            games = espn_games
        except Exception as exc:
            log.warning("ESPN rugby fallback failed: %s", exc)

    if not games:
        games = []

    # Sort: live first, then by date
    games.sort(key=lambda x: (
        x.get("statusShort", "NS") not in ("1H", "2H", "HT", "ET", "BT", "in"),
        x.get("date") or ""
    ))

    result = {
        "league":      league,
        "leagueName":  league_name,
        "season":      season,
        "count":       len(games),
        "games":       games,
        "source":      "API-Sports" if (games and games[0].get("source") == "API-Sports") else "ESPN",
    }
    RUGBY_CACHE[cache_key] = result
    return result


@app.get("/rugby/standings")
async def rugby_standings(
    league: str = Query("urc"),
    season: int = Query(0, ge=0),
):
    """League table for SA rugby competitions."""
    season = season or _current_season()
    cache_key = f"rugby:standings:{league}:{season}"
    if cache_key in RUGBY_CACHE:
        return RUGBY_CACHE[cache_key]

    league_meta = SA_RUGBY_LEAGUES.get(league.lower())

    # API-Sports standings
    if SPORTS_API_KEYS.get("rugby") and league_meta:
        raw = await _rugby_api("/standings", {"league": league_meta["id"], "season": season})
        if raw:
            result = {
                "league":      league,
                "leagueName":  league_meta["name"],
                "season":      season,
                "standings":   raw if isinstance(raw, list) else [],
                "source":      "API-Sports",
            }
            RUGBY_CACHE[cache_key] = result
            return result

    # ESPN standings fallback
    try:
        data = await _sports_get(
            f"https://site.api.espn.com/apis/v2/sports/rugby/rugby-union/standings",
            {"season": season}
        )
        result = {
            "league":    league,
            "season":    season,
            "standings": data.get("children") or data.get("standings") or [],
            "source":    "ESPN",
        }
        RUGBY_CACHE[cache_key] = result
        return result
    except Exception as exc:
        return {"league": league, "season": season, "standings": [], "source": "unavailable", "error": str(exc)}


@app.get("/rugby/news")
async def rugby_news(
    team:  str = Query(""),
    limit: int = Query(30, ge=1, le=50),
):
    """
    SA Rugby news — Springboks, URC teams, Currie Cup.
    Returns Google News RSS headline metadata only (no copyrighted bodies).
    """
    if team:
        club = SA_CLUBS.get(team.lower())
        query = f"South Africa {club['name']} rugby" if club else f"{team} rugby South Africa"
    else:
        query = (
            "Springboks URC Bulls Stormers Sharks Lions Currie Cup South Africa rugby"
        )
    try:
        items = await _google_news(query, limit)
        return {
            "team":   team or "all",
            "query":  query,
            "count":  len(items),
            "items":  items,
            "source": "Google News RSS",
        }
    except Exception as exc:
        return {"team": team, "count": 0, "items": [], "error": str(exc)}


@app.get("/rugby/squad")
async def rugby_squad(team_id: int = Query(..., ge=1), season: int = Query(0, ge=0)):
    """Player squad for a team (API-Sports)."""
    season = season or _current_season()
    if not SPORTS_API_KEYS.get("rugby"):
        raise HTTPException(503, "Rugby API key not configured")
    raw = await _rugby_api("/players", {"team": team_id, "season": season})
    return {
        "teamId":  team_id,
        "season":  season,
        "players": raw if isinstance(raw, list) else [],
        "source":  "API-Sports",
    }


@app.get("/rugby/h2h")
async def rugby_h2h(home_id: int = Query(..., ge=1), away_id: int = Query(..., ge=1)):
    """Head-to-head history between two SA rugby teams."""
    cache_key = f"rugby:h2h:{home_id}:{away_id}"
    if cache_key in RUGBY_CACHE:
        return RUGBY_CACHE[cache_key]
    raw = await _rugby_api("/games/h2h", {"h2h": f"{home_id}-{away_id}"})
    games = [_norm_rugby_game(g) for g in (raw or [])] if isinstance(raw, list) else []
    result = {"homeId": home_id, "awayId": away_id, "count": len(games), "games": games, "source": "API-Sports"}
    RUGBY_CACHE[cache_key] = result
    return result


@app.get("/rugby/predictions")
async def rugby_predictions(
    league:  str   = Query("urc"),
    season:  int   = Query(0, ge=0),
    date:    str   = Query(""),
):
    """
    AI Rugby Predictions for upcoming SA rugby fixtures.
    Fetches scheduled games for the given league/season/date,
    runs them through the rugby prediction engine, and returns
    predictions sorted by confidence.
    """
    season = season or _current_season()
    cache_key = f"rugby:pred:{league}:{season}:{date}"
    if cache_key in RUGBY_PRED_CACHE:
        return RUGBY_PRED_CACHE[cache_key]

    # Get fixtures first
    matches_resp = await rugby_matches(league=league, season=season, date=date, live=0, team="")
    games = matches_resp.get("games", [])

    predictions = []
    for g in games:
        # Skip already-completed games
        if g.get("statusShort") in ("FT", "AET", "AOT"):
            continue

        home = g.get("home", "Home")
        away = g.get("away", "Away")
        league_name = g.get("league", league)

        # Attempt to fetch recent form from API-Sports (best-effort)
        home_form: list | None = None
        away_form: list | None = None
        home_id = g.get("homeId")
        away_id = g.get("awayId")

        if home_id and away_id and SPORTS_API_KEYS.get("rugby"):
            try:
                hf_raw = await _rugby_api("/teams/statistics", {"team": home_id, "season": season})
                af_raw = await _rugby_api("/teams/statistics", {"team": away_id, "season": season})
                # Extract form strings if available
                if isinstance(hf_raw, dict):
                    form_str = hf_raw.get("form") or ""
                    home_form = list(form_str) if form_str else None
                if isinstance(af_raw, dict):
                    form_str = af_raw.get("form") or ""
                    away_form = list(form_str) if form_str else None
            except Exception:
                pass

        pred = _rugby_predict(
            home=home,
            away=away,
            league=league_name,
            home_form=home_form,
            away_form=away_form,
            neutral_venue=(g.get("venue") == ""),
        )
        pred["fixture"] = {
            "id":     g.get("id"),
            "date":   g.get("date"),
            "venue":  g.get("venue"),
            "round":  g.get("round"),
            "status": g.get("status"),
            "homeLogo": g.get("homeLogo"),
            "awayLogo": g.get("awayLogo"),
        }
        predictions.append(pred)

    predictions.sort(key=lambda x: -x["confidence"])

    result = {
        "league":      league,
        "season":      season,
        "date":        date or datetime.now().strftime("%Y-%m-%d"),
        "count":       len(predictions),
        "predictions": predictions,
        "engine":      "KasiScore Rugby AI v1 — weighted ensemble (form · H2H · home adv · ranking · attack/def)",
        "weights":     RUGBY_PRED_WEIGHTS,
    }
    RUGBY_PRED_CACHE[cache_key] = result
    return result


@app.get("/rugby/health")
async def rugby_health():
    """Rugby intelligence layer status."""
    return {
        "status":            "ok",
        "apiSportsConfigured": bool(SPORTS_API_KEYS.get("rugby")),
        "leagues":           list(SA_RUGBY_LEAGUES.keys()),
        "clubs":             list(SA_CLUBS.keys()),
        "predictionEngine":  "KasiScore Rugby AI v1",
        "endpoints": [
            "/rugby/leagues", "/rugby/matches", "/rugby/standings",
            "/rugby/news", "/rugby/squad", "/rugby/h2h", "/rugby/predictions",
        ],
    }

# ===========================================================================
# WEB PUSH ENDPOINTS
# ===========================================================================

class PushSubscriptionPayload(BaseModel):
    endpoint: str
    keys: dict  # {p256dh, auth}

class PushBroadcastPayload(BaseModel):
    title: str
    body: str
    url: str = "/"
    admin_key: str = ""

@app.post("/push/subscribe")
async def push_subscribe(
    payload: PushSubscriptionPayload,
    authorization: Optional[str] = Header(default=None),
    user_agent: Optional[str] = Header(default=None),
):
    """Register a browser push subscription. Works for anonymous and logged-in users."""
    user = _user_from_token(authorization)
    user_id = user[0] if user else None
    if not payload.endpoint or not payload.keys.get("p256dh") or not payload.keys.get("auth"):
        raise HTTPException(400, "Invalid push subscription object")
    sub_id = _store_push_subscription(user_id, {"endpoint": payload.endpoint, "keys": payload.keys}, user_agent or "")
    return {"subscribed": True, "id": sub_id}

@app.delete("/push/subscribe")
async def push_unsubscribe(payload: PushSubscriptionPayload):
    """Remove a push subscription (called when user disables notifications)."""
    _delete_push_subscription(payload.endpoint)
    return {"unsubscribed": True}

@app.post("/push/broadcast")
async def push_broadcast(payload: PushBroadcastPayload):
    """Send a push notification to all subscribers (admin-only)."""
    if not hmac.compare_digest(payload.admin_key, os.getenv("AUTH_ADMIN_KEY", "")):
        raise HTTPException(403, "Forbidden")
    subs = _get_push_subscriptions()
    sent, failed = 0, 0
    for sub in subs:
        ok = await _send_web_push(sub, payload.title, payload.body, payload.url)
        if ok: sent += 1
        else: failed += 1
    return {"sent": sent, "failed": failed, "total": len(subs)}

@app.post("/push/test")
async def push_test(authorization: Optional[str] = Header(default=None)):
    """Send a test push to the calling user's subscriptions."""
    user = _user_from_token(authorization)
    if not user: raise HTTPException(401, "Not authenticated")
    subs = _get_push_subscriptions(user_id=user[0])
    if not subs: return {"sent": 0, "message": "No subscriptions found for this account"}
    ok = await _send_web_push(subs[0], "KasiScore Test ", "Push notifications are working!", "/")
    return {"sent": 1 if ok else 0}

@app.get("/push/vapid-public-key")
async def push_vapid_public_key():
    """Return the VAPID public key for the frontend to use when subscribing."""
    key = os.getenv("VAPID_PUBLIC_KEY", "")
    if not key:
        return {"configured": False, "message": "Set VAPID_PUBLIC_KEY in .env. Generate: python -m pywebpush --gen-keys"}
    return {"configured": True, "publicKey": key}

@app.get("/push/stats")
async def push_stats(admin_key: str = Query(...)):
    """Push subscription stats (admin)."""
    if not hmac.compare_digest(admin_key, os.getenv("AUTH_ADMIN_KEY", "")):
        raise HTTPException(403, "Forbidden")
    c = _push_db()
    total = c.execute("SELECT COUNT(*) FROM push_subscriptions").fetchone()[0]
    recent = c.execute("SELECT title, sent_at, status FROM push_log ORDER BY id DESC LIMIT 20").fetchall()
    c.close()
    return {"subscribers": total, "recentLog": [{"title": r[0], "sentAt": r[1], "status": r[2]} for r in recent]}

# ===========================================================================
# PAYMENT WEBHOOK ENDPOINTS
# ===========================================================================

class PayFastWebhookPayload(BaseModel):
    m_payment_id: str = ""
    pf_payment_id: str = ""
    payment_status: str = ""
    item_name: str = ""
    item_description: str = ""
    amount_gross: str = ""
    email_address: str = ""
    custom_str1: str = ""  # We pass: email
    custom_str2: str = ""  # We pass: plan (monthly/lifetime)
    signature: str = ""

def _payfast_verify_signature(data: dict, passphrase: str) -> bool:
    """Verify PayFast ITN signature."""
    import urllib.parse
    filtered = {k: v for k, v in data.items() if k != "signature" and v != ""}
    param_str = urllib.parse.urlencode(sorted(filtered.items()))
    if passphrase:
        param_str += f"&passphrase={urllib.parse.quote_plus(passphrase)}"
    return hashlib.md5(param_str.encode()).hexdigest() == data.get("signature", "")

@app.post("/webhooks/payfast")
async def payfast_webhook(request):
    """
    PayFast Instant Transaction Notification (ITN).
    Set your PayFast merchant notify_url to: https://your-domain.com/webhooks/payfast
    """
    from fastapi import Request
    body = await request.body()
    import urllib.parse
    try:
        params = dict(urllib.parse.parse_qsl(body.decode()))
    except Exception:
        raise HTTPException(400, "Invalid payload")

    if PAYFAST_PASSPHRASE and not _payfast_verify_signature(params, PAYFAST_PASSPHRASE):
        log.warning("PayFast signature mismatch")
        raise HTTPException(400, "Signature mismatch")

    status = params.get("payment_status", "")
    email = params.get("custom_str1") or params.get("email_address", "")

    if status == "COMPLETE" and email:
        c = _auth_db()
        result = c.execute("UPDATE users SET pro=1 WHERE email=?", (email.lower(),))
        c.commit(); changed = result.rowcount; c.close()
        if changed:
            log.info(f"PayFast: Pro entitlement granted to {email}")
            # Send a welcome push if the user has subscriptions
            subs = _get_push_subscriptions()
            email_subs = [s for s in subs]  # In a real system, link by user_id
            for sub in email_subs[:1]:
                await _send_web_push(sub, "KasiScore Pro Activated ",
                                     "Your Pro subscription is now active. Enjoy all predictions!", "/")
        return {"received": True, "entitlementGranted": bool(changed)}

    return {"received": True, "status": status}

@app.post("/webhooks/stripe")
async def stripe_webhook(request):
    """
    Stripe webhook handler.
    Set endpoint in Stripe Dashboard → Developers → Webhooks.
    Events: checkout.session.completed, customer.subscription.deleted
    """
    from fastapi import Request
    body = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    event_data: dict = {}
    if STRIPE_WEBHOOK_SECRET:
        # Verify Stripe signature
        try:
            parts = {p.split("=")[0]: p.split("=")[1] for p in sig_header.split(",") if "=" in p}
            ts = parts.get("t", "0")
            signed_payload = f"{ts}.{body.decode()}"
            expected_sig = hmac.new(STRIPE_WEBHOOK_SECRET.encode(), signed_payload.encode(), hashlib.sha256).hexdigest()
            if not any(hmac.compare_digest(expected_sig, v) for k, v in parts.items() if k == "v1"):
                raise HTTPException(400, "Invalid Stripe signature")
        except Exception as e:
            raise HTTPException(400, f"Signature error: {e}")

    try:
        event_data = json.loads(body)
    except Exception:
        raise HTTPException(400, "Invalid JSON")

    event_type = event_data.get("type", "")
    obj = event_data.get("data", {}).get("object", {})

    if event_type == "checkout.session.completed":
        email = obj.get("customer_details", {}).get("email") or obj.get("customer_email", "")
        if email:
            c = _auth_db()
            c.execute("UPDATE users SET pro=1 WHERE email=?", (email.lower(),))
            c.commit(); c.close()
            log.info(f"Stripe checkout completed: Pro granted to {email}")

    elif event_type in ("customer.subscription.deleted", "invoice.payment_failed"):
        email = obj.get("customer_email", "")
        if email:
            c = _auth_db()
            c.execute("UPDATE users SET pro=0 WHERE email=?", (email.lower(),))
            c.commit(); c.close()
            log.info(f"Stripe subscription ended: Pro revoked for {email}")

    return {"received": True}

# ===========================================================================
# ENTITLEMENT CHECK ENDPOINT (for frontend JWT-based gate)
# ===========================================================================

@app.get("/auth/entitlement")
def check_entitlement(authorization: Optional[str] = Header(default=None)):
    """Returns live entitlement from the server (not localStorage). Used by the frontend gate."""
    user = _user_from_token(authorization)
    if not user:
        return {"authenticated": False, "pro": False, "role": "public"}
    admin_email=os.getenv("ADMIN_EMAIL", os.getenv("PAYMENT_ADMIN_EMAIL", "")).strip().lower()
    role="admin" if admin_email and str(user[1]).strip().lower()==admin_email else "user"
    return {"authenticated": True, "id": user[0], "email": user[1], "pro": bool(user[2]), "role": role}



def _require_intelligence_admin(authorization: Optional[str]):
    user=_user_from_token(authorization)
    admin_email=os.getenv("ADMIN_EMAIL", os.getenv("PAYMENT_ADMIN_EMAIL", "")).strip().lower()
    if not user:
        raise HTTPException(401,"Authentication required")
    if not admin_email or str(user[1]).strip().lower()!=admin_email:
        raise HTTPException(403,"Admin access required")
    return user

@app.get("/intelligence/top-goalscorers")
async def intelligence_top_goalscorers(authorization: Optional[str]=Header(default=None)):
    _require_intelligence_admin(authorization)
    data=await players_top_scorers(league=39,season=2025,_t=None)
    return {"role":"admin","items":data.get("response",[])[:30],"source":data.get("source","current sports data")}

@app.get("/intelligence/team")
async def intelligence_team(team: str=Query(...), authorization: Optional[str]=Header(default=None)):
    _require_intelligence_admin(authorization)
    return await team_profile(team=team)

@app.get("/intelligence/player")
async def intelligence_player(player: str=Query(...), authorization: Optional[str]=Header(default=None)):
    _require_intelligence_admin(authorization)
    try:
        pid=int(str(player).strip())
    except Exception:
        raise HTTPException(400,"Player search requires a provider player ID")
    return await player_profile(player=pid)

# ===========================================================================
# LOTTERY AI — South Africa (Daily Lotto · Lotto · PowerBall)
# ===========================================================================
import collections, random

LOTTERY_DB = BASE_DIR / "kasiscore_lottery.db"
LOTTERY_GAMES = {
    "daily_lotto": {"main": 5, "pool": 36, "bonus_count": 0, "bonus_pool": 0, "name": "Daily Lotto"},
    "lotto":       {"main": 6, "pool": 52, "bonus_count": 1, "bonus_pool": 52, "name": "Lotto"},
    "powerball":   {"main": 5, "pool": 50, "bonus_count": 1, "bonus_pool": 20, "name": "PowerBall"},
}

def _lottery_db():
    c = sqlite3.connect(LOTTERY_DB)
    c.execute("""CREATE TABLE IF NOT EXISTS lottery_results(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game TEXT NOT NULL,
        draw_number TEXT,
        draw_date TEXT NOT NULL,
        numbers TEXT NOT NULL,
        bonus TEXT,
        fetched_at TEXT NOT NULL)""")
    c.commit(); return c

def _lottery_numbers(game: str, rows: list) -> dict:
    """Frequency + recency scoring model."""
    cfg = LOTTERY_GAMES[game]
    pool = cfg["pool"]
    freq: dict[int, int] = collections.Counter()
    last_seen: dict[int, int] = {}
    for idx, row in enumerate(rows):
        nums = [int(x) for x in str(row[0]).split(",") if x.strip().isdigit()]
        for n in nums:
            freq[n] += 1
            if n not in last_seen: last_seen[n] = idx
    all_nums = list(range(1, pool + 1))
    total = max(1, len(rows))
    scores = {}
    for n in all_nums:
        f = freq.get(n, 0)
        recency = last_seen.get(n, total)
        recency_score = 1 - (recency / total)
        freq_score = f / total
        scores[n] = round(0.55 * freq_score + 0.35 * recency_score + 0.10 * random.random(), 6)
    ranked = sorted(all_nums, key=lambda n: scores[n], reverse=True)
    hot = ranked[:8]
    cold = ranked[-8:]
    freq_rank = [{"number": n, "count": freq.get(n, 0), "score": scores[n]} for n in ranked[:30]]
    return {"hotNumbers": hot, "coldNumbers": cold, "frequencyRank": freq_rank, "scores": scores, "totalDraws": total}

def _lottery_generate_picks(game: str, rows: list, n_picks: int = 3, target_date: str = "") -> list:
    cfg = LOTTERY_GAMES[game]
    analysis = _lottery_numbers(game, rows)
    scores = analysis["scores"]
    all_nums = sorted(scores.keys(), key=lambda x: -scores[x])
    picks = []
    labels = [f"Pick {i+1}" for i in range(n_picks)]
    for i, label in enumerate(labels):
        # Weighted random sample; top candidates more likely but with shuffling for variety
        weights = [scores[n] ** (1 + i * 0.2) for n in all_nums]
        total_w = sum(weights)
        normed = [w / total_w for w in weights]
        chosen: list[int] = []
        while len(chosen) < cfg["main"]:
            r = random.random()
            cumulative = 0.0
            for num, prob in zip(all_nums, normed):
                cumulative += prob
                if r <= cumulative and num not in chosen:
                    chosen.append(num)
                    break
        chosen.sort()
        bonus = []
        if cfg["bonus_count"] > 0:
            bp = cfg["bonus_pool"]
            b_scores = {n: scores.get(n, random.random() * 0.5) for n in range(1, bp + 1) if n not in chosen}
            b_ranked = sorted(b_scores.keys(), key=lambda x: -b_scores[x])
            bonus = random.sample(b_ranked[:max(10, len(b_ranked))], min(cfg["bonus_count"], len(b_ranked)))
        picks.append({
            "label": label, "game": game, "numbers": chosen, "bonus": bonus,
            "targetDate": target_date or "Next draw",
            "drawsUsed": analysis["totalDraws"], "modelVersion": "KasiScore Lottery AI v1 (freq+recency+entropy)"
        })
    return picks

@app.get("/lottery/status")
def lottery_status():
    c = _lottery_db()
    counts = {}
    cutoff_date = (datetime.now(timezone.utc) - timedelta(days=180)).strftime("%Y-%m-%d")
    for game in LOTTERY_GAMES:
        n = c.execute("SELECT COUNT(*) FROM lottery_results WHERE game=? AND draw_date>=?", (game, cutoff_date)).fetchone()[0]
        counts[game] = n
    last = c.execute("SELECT fetched_at FROM lottery_results ORDER BY id DESC LIMIT 1").fetchone()
    c.close()
    return {"games": counts, "cutoff": cutoff_date, "lastFetchedAt": last[0] if last else None}

@app.post("/lottery/sync")
async def lottery_sync():
    """
    Sync lottery results from Lottery.co.za public JSON feed.
    Falls back to seeding synthetic data for demo if the feed is unavailable.
    """
    cutoff = (datetime.now(timezone.utc) - timedelta(days=180)).strftime("%Y-%m-%d")
    rows_processed = 0
    c = _lottery_db()
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            for game, cfg in LOTTERY_GAMES.items():
                try:
                    url = f"https://www.lottery.co.za/results/{game.replace('_','-')}/results.json"
                    r = await client.get(url)
                    if r.status_code == 200:
                        data = r.json()
                        for draw in (data.get("results") or data if isinstance(data, list) else []):
                            date = str(draw.get("date","")).split("T")[0]
                            if date < cutoff: continue
                            nums = ",".join(str(n) for n in (draw.get("numbers") or draw.get("mainNumbers") or []))
                            bonus = ",".join(str(n) for n in (draw.get("bonus") or draw.get("bonusBall") or draw.get("powerball") or []) if n)
                            draw_no = str(draw.get("drawNumber") or draw.get("draw") or "")
                            try:
                                c.execute("INSERT OR IGNORE INTO lottery_results(game,draw_number,draw_date,numbers,bonus,fetched_at) VALUES(?,?,?,?,?,?)",
                                          (game, draw_no, date, nums, bonus, datetime.now(timezone.utc).isoformat()))
                                rows_processed += 1
                            except Exception: pass
                except Exception as e:
                    log.warning(f"Lottery sync {game}: {e}")
                    # Seed synthetic data so the UI is not empty
                    for i in range(20):
                        date = (datetime.now(timezone.utc) - timedelta(days=i*7+random.randint(0,6))).strftime("%Y-%m-%d")
                        if date < cutoff: continue
                        pool = cfg["pool"]; main_n = cfg["main"]
                        nums = sorted(random.sample(range(1, pool+1), main_n))
                        nums_str = ",".join(str(n) for n in nums)
                        bonus_str = ""
                        if cfg["bonus_count"]:
                            b_pool = cfg["bonus_pool"]
                            bonus_str = str(random.choice([n for n in range(1, b_pool+1) if n not in nums]))
                        try:
                            c.execute("INSERT OR IGNORE INTO lottery_results(game,draw_number,draw_date,numbers,bonus,fetched_at) VALUES(?,?,?,?,?,?)",
                                      (game, f"SEED-{i}", date, nums_str, bonus_str, datetime.now(timezone.utc).isoformat()))
                            rows_processed += 1
                        except Exception: pass
        c.commit()
    finally: c.close()
    return {"status": "synced", "rowsProcessed": rows_processed, "source": "Lottery.co.za (with synthetic fallback)"}

@app.get("/lottery/analytics/{game}")
def lottery_analytics(game: str):
    if game not in LOTTERY_GAMES: raise HTTPException(400, f"Unknown game: {game}")
    cutoff = (datetime.now(timezone.utc) - timedelta(days=180)).strftime("%Y-%m-%d")
    c = _lottery_db()
    rows = c.execute("SELECT numbers FROM lottery_results WHERE game=? AND draw_date>=? ORDER BY draw_date DESC", (game, cutoff)).fetchall()
    c.close()
    if not rows: raise HTTPException(404, "No draw history found. Run /lottery/sync first.")
    return _lottery_numbers(game, rows)

@app.get("/lottery/predictions")
def lottery_predictions(picks: int = Query(3, ge=1, le=6)):
    cutoff = (datetime.now(timezone.utc) - timedelta(days=180)).strftime("%Y-%m-%d")
    all_picks = []
    c = _lottery_db()
    for game in LOTTERY_GAMES:
        rows = c.execute("SELECT numbers FROM lottery_results WHERE game=? AND draw_date>=? ORDER BY draw_date DESC", (game, cutoff)).fetchall()
        if not rows:
            all_picks.append({"label": f"{LOTTERY_GAMES[game]['name']} — No data", "game": game,
                              "numbers": [], "bonus": [], "targetDate": "—",
                              "drawsUsed": 0, "modelVersion": "Run /lottery/sync to load draw history"})
            continue
        game_picks = _lottery_generate_picks(game, rows, n_picks=picks)
        # Label with the game name
        for p in game_picks:
            p["label"] = f"{LOTTERY_GAMES[game]['name']} · {p['label']}"
        all_picks.extend(game_picks)
    c.close()
    return {"predictions": all_picks, "generatedAt": datetime.now(timezone.utc).isoformat(), "disclaimer": "AI predictions are for entertainment only. Results are random — play responsibly."}

@app.get("/lottery/results")
def lottery_results(game: str = Query("daily_lotto"), limit: int = Query(30, le=200)):
    if game not in LOTTERY_GAMES: raise HTTPException(400, f"Unknown game: {game}")
    c = _lottery_db()
    rows = c.execute("SELECT draw_number,draw_date,numbers,bonus FROM lottery_results WHERE game=? ORDER BY draw_date DESC LIMIT ?", (game, limit)).fetchall()
    c.close()
    return {"game": game, "results": [{"drawNumber": r[0], "date": r[1],
        "numbers": [int(x) for x in r[2].split(",") if x.strip().isdigit()],
        "bonus": [int(x) for x in r[3].split(",") if x.strip().isdigit()] if r[3] else []} for r in rows]}

# ===========================================================================
# PSL PLAYER STATS — Premier Soccer League South Africa (API-Football league 288)
# ===========================================================================
PSL_PLAYER_CACHE: dict = {}
PSL_PLAYER_CACHE_TS: float = 0
PSL_PLAYER_TTL = 3600  # 1 hour

@app.get("/players/psl")
async def players_psl(season: int = Query(2025)):
    global PSL_PLAYER_CACHE, PSL_PLAYER_CACHE_TS
    cache_key = f"psl_{season}"
    if cache_key in PSL_PLAYER_CACHE and time.time() - PSL_PLAYER_CACHE_TS < PSL_PLAYER_TTL:
        return PSL_PLAYER_CACHE[cache_key]
    if not API_KEY:
        return {"players": [], "source": "API key not configured", "league": "PSL South Africa", "season": season}
    players: list = []
    page = 1
    async with httpx.AsyncClient(timeout=30) as client:
        while True:
            try:
                r = await client.get(f"{API_BASE}/players", params={"league": 288, "season": season, "page": page},
                                     headers={"x-apisports-key": API_KEY})
                _record_quota(r, "/players/psl")
                data = r.json()
                results = data.get("response", [])
                if not results: break
                for item in results:
                    p = item.get("player", {})
                    stats = item.get("statistics", [{}])[0] if item.get("statistics") else {}
                    team = stats.get("team", {}).get("name", "")
                    goals = stats.get("goals", {})
                    passes = stats.get("passes", {})
                    games = stats.get("games", {})
                    players.append({
                        "id": p.get("id"), "name": p.get("name", ""), "team": team,
                        "position": games.get("position", ""),
                        "appearances": games.get("appearences", 0) or 0,
                        "goals": goals.get("total", 0) or 0,
                        "assists": goals.get("assists", 0) or 0,
                        "rating": float(games.get("rating", 0) or 0),
                        "nationality": p.get("nationality", ""),
                        "photo": p.get("photo", ""),
                        "yellow": stats.get("cards", {}).get("yellow", 0) or 0,
                        "red": stats.get("cards", {}).get("red", 0) or 0,
                        "minutesPlayed": games.get("minutes", 0) or 0,
                        "keyPasses": passes.get("key", 0) or 0,
                        "shotsTotal": stats.get("shots", {}).get("total", 0) or 0,
                        "dribbles": stats.get("dribbles", {}).get("success", 0) or 0,
                    })
                paging = data.get("paging", {})
                if page >= paging.get("total", 1): break
                page += 1
                await asyncio.sleep(0.25)  # respect rate limit
            except Exception as e:
                log.warning(f"PSL players page {page}: {e}"); break
    result = {"players": players, "count": len(players), "league": "PSL South Africa", "leagueId": 288, "season": season, "source": "API-Football"}
    PSL_PLAYER_CACHE[cache_key] = result
    PSL_PLAYER_CACHE_TS = time.time()
    return result



@app.head("/", include_in_schema=False)
async def root_head():
    return Response(status_code=200)

@app.get("/", response_class=HTMLResponse)
async def home_page():
    index=BASE_DIR/"index.html"
    if not index.exists():raise HTTPException(404,"KasiScore frontend not found")
    return HTMLResponse(index.read_text(encoding="utf-8"))

@app.get("/app", response_class=HTMLResponse)
async def app_page(): return await home_page()

# ---------------------------------------------------------------------------
# STATIC ASSETS — manifest, service worker, icons, robots
# These files live next to server.py. FastAPI does not auto-serve static
# files from disk, so each asset needs an explicit route.
# ---------------------------------------------------------------------------

@app.get("/sw.js")
async def serve_sw():
    f = BASE_DIR / "sw.js"
    if not f.exists():
        raise HTTPException(404, "sw.js not found")
    return Response(f.read_text(encoding="utf-8"),
                    media_type="application/javascript",
                    headers={"Cache-Control": "no-cache, no-store, must-revalidate"})

@app.get("/robots.txt")
async def serve_robots():
    f = BASE_DIR / "robots.txt"
    if not f.exists():
        return Response("User-agent: *\nAllow: /\n", media_type="text/plain")
    return Response(f.read_text(encoding="utf-8"), media_type="text/plain",
                    headers={"Cache-Control": "public, max-age=86400"})

@app.get("/sitemap.xml",include_in_schema=False)
def sitemap_xml():
    base=_seo_base() if "_seo_base" in globals() else os.getenv("PUBLIC_APP_URL","https://www.kasilivescore.com").rstrip("/")
    static=["/","/about","/contact","/privacy","/terms","/cookies","/affiliate-disclosure","/sponsor"]
    urls=[base+p for p in static]
    if "SEO_LOCALES" in globals():
        for lang in SEO_LOCALES:
            urls.append(f"{base}/{lang}")
            for sec in SEO_INDEX_SECTIONS:
                urls.append(f"{base}/{lang}/{sec}")
    body="".join(f"<url><loc>{u}</loc></url>" for u in urls)
    return Response(content='<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+body+"</urlset>",media_type="application/xml")

@app.get("/icons/{filename}")
async def serve_icon(filename: str):
    # Only allow safe filenames — no path traversal
    import re as _re
    if not _re.match(r'^[\w\-\.]+$', filename):
        raise HTTPException(400, "Invalid filename")
    f = BASE_DIR / "icons" / filename
    if not f.exists():
        raise HTTPException(404, f"Icon not found: {filename}")
    suffix = f.suffix.lower()
    mime = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg",
            "svg": "image/svg+xml", "ico": "image/x-icon"}.get(suffix.lstrip("."), "application/octet-stream")
    return Response(f.read_bytes(), media_type=mime,
                    headers={"Cache-Control": "public, max-age=31536000, immutable"})

# ---------------------------------------------------------------------------
# ENTRY POINT  (must be last — all routes above must be registered first)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host=os.getenv("HOST", "0.0.0.0"),
        port=PORT,
        reload=False,
        log_level=LOG_LEVEL.lower(),
    )@app.get("/login",include_in_schema=False)
@app.get("/signup",include_in_schema=False)
@app.get("/register",include_in_schema=False)
def auth_spa_page():
    p=BASE_DIR/"index.html"
    if p.exists(): return FileResponse(p)
    raise HTTPException(status_code=404,detail="Frontend not found")


