"""V663 Step 491: opt-in staging-only, isolated community voting router.

Not activated by importing. Requires explicit include_router and a SERVER-side
trusted fixture resolver; no production routes, no provider calls.
"""
import hashlib
import hmac
import os
import secrets
import sqlite3
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, Field

router = APIRouter(prefix='/__ksn_v663/staging/community-votes', tags=['staging-v663-community-votes'])
COOKIE = 'ksn_staging_vote_id'


def enabled():
    env = os.getenv('KSN_ENVIRONMENT', '').lower().strip()
    service = ' '.join(os.getenv(k, '') for k in ('RENDER_SERVICE_NAME', 'RENDER_EXTERNAL_URL', 'KSN_ENV')).lower()
    return (env == 'staging' and 'staging' in service and
            os.getenv('KSN_STAGING_COMMUNITY_VOTES') == '1' and
            len(os.getenv('KSN_STAGING_VOTE_SECRET', '')) >= 32 and
            bool(os.getenv('KSN_STAGING_VOTE_DB', '').strip()))


def guard():
    if not enabled():
        raise HTTPException(404, 'Not available')


def connect():
    p = Path(os.environ['KSN_STAGING_VOTE_DB']).resolve()
    expected = (Path(__file__).resolve().parent / 'data' / 'v663_staging_isolated' / 'community_votes.sqlite3').resolve()
    if p != expected:
        raise HTTPException(503, 'Vote database must use dedicated isolated staging path')
    if not p.parent.exists():
        raise HTTPException(503, 'Vote database directory does not exist')
    db = sqlite3.connect(str(p), timeout=5, isolation_level=None)
    db.row_factory = sqlite3.Row
    db.execute('PRAGMA busy_timeout=5000')
    db.execute('CREATE TABLE IF NOT EXISTS votes (fixture_id TEXT NOT NULL, voter_id TEXT NOT NULL, choice TEXT NOT NULL CHECK(choice IN (\'H\',\'A\')), created_at INTEGER NOT NULL, PRIMARY KEY(fixture_id, voter_id))')
    db.execute('CREATE TABLE IF NOT EXISTS rate_events (key_hash TEXT NOT NULL, ts INTEGER NOT NULL)')
    db.execute('CREATE INDEX IF NOT EXISTS rate_events_idx ON rate_events(key_hash,ts)')
    return db


def digest(data):
    return hmac.new(os.environ['KSN_STAGING_VOTE_SECRET'].encode(), data.encode(), hashlib.sha256).hexdigest()


def voter(request):
    candidate = request.cookies.get(COOKIE, '')
    if len(candidate) == 129 and candidate[64] == '.' and hmac.compare_digest(candidate[65:], digest(candidate[:64])):
        return candidate[:64], None
    token = secrets.token_hex(32)
    return token, token + '.' + digest(token)


def fixture_rows(request: Request):
    """Require a trusted server-side resolver provided by the existing football feed.
    Resolver returns list[dict]: id, home, away, league, league_id, kickoff
    (ISO8601 with timezone), status, sport. Never accept client fixture details.
    """
    resolve: Callable | None = getattr(request.app.state, 'ksn_vote_fixture_resolver', None)
    if not callable(resolve):
        raise HTTPException(503, 'Trusted fixture resolver not configured')
    source = resolve()
    if not isinstance(source, list):
        raise HTTPException(503, 'Fixture resolver returned invalid data')
    now = time.time()
    valid = []
    for x in source[:300]:
        if not isinstance(x, dict): continue
        fid, home, away = str(x.get('id', '')), str(x.get('home', '')), str(x.get('away', ''))
        league, league_id = str(x.get('league', '')), str(x.get('league_id', ''))
        status = str(x.get('status','')).upper()
        if not(fid.isdecimal() and len(fid) <= 24 and home and away and league and status in ('NS','TBD','SCHEDULED','UPCOMING')): continue
        if str(x.get('sport','football')).lower() != 'football': continue
        try:
            stamp = datetime.fromisoformat(str(x['kickoff']).replace('Z', '+00:00'))
            if stamp.tzinfo is None: continue
            kickoff_epoch = stamp.timestamp()
        except (ValueError, KeyError, TypeError, OverflowError): continue
        if kickoff_epoch <= now or kickoff_epoch > now + 30*86400: continue
        valid.append({'id':fid,'home':home[:120],'away':away[:120],'league':league[:120],
                      'league_key':league_id or league.casefold(),'kickoff':stamp.isoformat(),
                      '_epoch':kickoff_epoch})
    seen_leagues, seen_fixtures, selected = set(), set(), []
    for m in sorted(valid, key=lambda x:x['_epoch']):
        if m['league_key'] in seen_leagues or m['id'] in seen_fixtures: continue
        seen_leagues.add(m['league_key']); seen_fixtures.add(m['id'])
        selected.append(m)
        if len(selected) == 4: break
    return selected


def outcome(db, fid):
    counts = dict(db.execute('SELECT choice, COUNT(*) AS n FROM votes WHERE fixture_id=? GROUP BY choice',(fid,)).fetchall())
    h, a = int(counts.get('H', 0)), int(counts.get('A', 0))
    total = h+a
    return {'fixtureId':fid,'totalVotes':total,'homeVotes':h,'awayVotes':a,
            'homePercent':round(h*100/total,1) if total else 0,
            'awayPercent':round(a*100/total,1) if total else 0,
            'label':'Community votes, not actual win probabilities'}


class VoteIn(BaseModel):
    fixtureId: str = Field(min_length=1,max_length=24,pattern=r'^[0-9]+$')
    choice: str = Field(pattern=r'^(H|A)$')


@router.get('/matches')
def matches(request: Request, response: Response):
    guard()
    selected = fixture_rows(request)
    token, new_cookie = voter(request)
    if new_cookie:
        response.set_cookie(COOKIE,new_cookie,max_age=31536000,httponly=True,secure=True,samesite='lax',path='/')
    with connect() as db:
        return {'matches':[{k:v for k,v in m.items() if not k.startswith('_')} |
                          {'results': outcome(db,m['id']),
                           'yourVote': next((r['choice'] for r in db.execute('SELECT choice FROM votes WHERE fixture_id=? AND voter_id=?',(m['id'],digest(token)))),None)}
                           for m in selected]}


@router.post('/vote', status_code=200)
def vote(body: VoteIn, request: Request, response: Response):
    guard()
    matches = {m['id']:m for m in fixture_rows(request)}
    if body.fixtureId not in matches:
        raise HTTPException(409, 'Match unavailable or voting closed')
    token, new_cookie = voter(request)
    ip = request.client.host if request.client else 'unknown'
    ip_key = digest('ip:'+ip)
    voter_key = digest(token)
    now = int(time.time())
    with connect() as db:
        try:
            db.execute('BEGIN IMMEDIATE')
            db.execute('DELETE FROM rate_events WHERE ts < ?', (now-3600,))
            recent = db.execute('SELECT COUNT(*) FROM rate_events WHERE key_hash=? AND ts>?',(ip_key,now-60)).fetchone()[0]
            if recent >= 12:
                db.rollback()
                raise HTTPException(429,'Too many vote attempts; please retry later')
            db.execute('INSERT INTO rate_events(key_hash,ts) VALUES (?,?)',(ip_key,now))
            existing = db.execute('SELECT choice FROM votes WHERE fixture_id=? AND voter_id=?',(body.fixtureId,voter_key)).fetchone()
            if existing:
                result = 'already-voted'
            else:
                db.execute('INSERT INTO votes(fixture_id,voter_id,choice,created_at) VALUES(?,?,?,?)',
                           (body.fixtureId,voter_key,body.choice,now))
                result = 'accepted'
            results = outcome(db,body.fixtureId)
            db.commit()
        except Exception:
            db.rollback()
            raise
    if new_cookie:
        response.set_cookie(COOKIE,new_cookie,max_age=31536000,httponly=True,secure=True,samesite='lax',path='/')
    return {'state':result,'yourVote':existing['choice'] if existing else body.choice,'results':results}
