"""V663 Trial 05 — read-only, cache-only match SEO helper.
No provider calls, database access, network requests, or writes.
"""
from datetime import datetime, timezone, timedelta
from html import escape
import json
import re

VALID_ID = re.compile(r'[1-9][0-9]{0,11}\Z')
LIVE = {'1H', 'HT', '2H', 'ET', 'P', 'BT', 'LIVE'}
UPCOMING = {'NS', 'TBD', 'SCHEDULED', 'UPCOMING', 'NOT STARTED'}
FINISHED = {'FT', 'AET', 'PEN'}
EXCLUDED = {'PST', 'P', 'CANC', 'ABD', 'SUSP', 'POSTPONED', 'CANCELLED', 'ABANDONED'}
BAD_NAMES = {'unknown', 'unknown team', 'tbd', 'tba', 'home', 'away', 'team', '-', 'placeholder', 'to be decided'}

def _text(val):
    if isinstance(val, dict):
        return str(val.get('name') or '').strip()
    return str(val or '').strip()

def _time(value):
    if isinstance(value, (int, float)):
        try: return datetime.fromtimestamp(value, timezone.utc)
        except (ValueError, OSError, OverflowError): return None
    try:
        parsed = datetime.fromisoformat(str(value).replace('Z', '+00:00'))
        return parsed.astimezone(timezone.utc) if parsed.tzinfo else None
    except (ValueError, TypeError, OverflowError):
        return None

def normalized_fixture(row, now=None):
    """Return only verified, time-bounded football fixture metadata."""
    if not isinstance(row, dict): return None
    sport = str(row.get('sport') or row.get('sportType') or 'football').casefold()
    if sport not in ('football', 'soccer'): return None
    fixture = row.get('fixture') if isinstance(row.get('fixture'), dict) else {}
    teams = row.get('teams') if isinstance(row.get('teams'), dict) else {}
    league = row.get('league')
    fid = row.get('_afootFixtureId') or fixture.get('id') or row.get('id')
    if not VALID_ID.fullmatch(str(fid or '')): return None
    status_obj = fixture.get('status')
    status = str(row.get('statusShort') or row.get('providerStatusShort') or
                 (status_obj.get('short') if isinstance(status_obj, dict) else status_obj) or
                 row.get('status') or '').strip().upper()
    # Provider's 'P' means penalty shootout, and must not be treated as live when
    # status classifications from different feeds are ambiguous. Fail closed.
    if status in EXCLUDED or status == 'P' or status not in (LIVE | UPCOMING | FINISHED): return None
    when = _time(row.get('fixtureDate') or row.get('datetime') or row.get('kickoff') or
                 row.get('date') or fixture.get('date'))
    if when is None: return None
    now = now or datetime.now(timezone.utc)
    if not (now - timedelta(days=2) <= when <= now + timedelta(days=14)): return None
    if status in UPCOMING and when < now: return None
    if status in (LIVE | FINISHED) and when > now: return None
    home = _text(row.get('home') or row.get('homeTeam') or teams.get('home'))
    away = _text(row.get('away') or row.get('awayTeam') or teams.get('away'))
    if not home or not away or home.casefold() == away.casefold(): return None
    if home.casefold() in BAD_NAMES or away.casefold() in BAD_NAMES: return None
    home_id = row.get('homeId') or (teams.get('home') or {}).get('id') if isinstance(teams.get('home'), dict) else row.get('homeId')
    away_id = row.get('awayId') or (teams.get('away') or {}).get('id') if isinstance(teams.get('away'), dict) else row.get('awayId')
    if not VALID_ID.fullmatch(str(home_id or '')) or not VALID_ID.fullmatch(str(away_id or '')): return None
    competition = _text(row.get('leagueName') or league or row.get('competition'))
    if not competition: return None
    return {'id':str(fid),'home':home,'away':away,'home_id':str(home_id),
            'away_id':str(away_id),'league':competition,'when':when,'status':status}

def fixture_candidates(cache, now=None, max_records=150):
    """Bounded memory-only snapshot scan; no refresh or I/O."""
    try: payloads = list(cache.values())[-max_records:]
    except (AttributeError, RuntimeError, TypeError): return []
    found = {}
    for payload in payloads:
        if isinstance(payload, list): rows = payload
        elif isinstance(payload, dict) and not (payload.get('stale') or payload.get('providerLocked')):
            rows = payload.get('matches') or payload.get('fixtures') or payload.get('response') or []
        else: continue
        if not isinstance(rows, list): continue
        for row in rows[:2000]:
            normalized = normalized_fixture(row, now)
            if normalized:
                found[normalized['id']] = normalized
    return list(found.values())

def fixture_sitemap_rows(cache, now=None, max_urls=200):
    now = now or datetime.now(timezone.utc)
    allowed = [x for x in fixture_candidates(cache, now) if x['status'] in (UPCOMING | LIVE)
               and now <= x['when'] <= now + timedelta(days=7)]
    allowed.sort(key=lambda x:(x['when'], x['id']))
    return [{'path': f"/matches/{x['id']}/stats", 'indexable':True,'pageType':'match'}
            for x in allowed[:max_urls]]

def ssr_document(document, fixture):
    """Enrich existing Match Centre document without touching interactive JS/UI."""
    if not fixture or '<div id="page">' not in document or '</head>' not in document: return document
    e=lambda v:escape(str(v), quote=True)
    canonical=f"https://kasilivescore.com/matches/{fixture['id']}/stats"
    title=f"{fixture['home']} vs {fixture['away']} | {fixture['league']} | KasiScore"
    # Strip only canonical and robots metadata, not unrelated tags.
    document=re.sub(r'<link\b(?=[^>]*\brel\s*=\s*["\']canonical["\'])[^>]*>\s*','',document,flags=re.I)
    document=re.sub(r'<meta\b(?=[^>]*\bname\s*=\s*["\']robots["\'])[^>]*>\s*','',document,flags=re.I)
    document=re.sub(r'<title>.*?</title>',f'<title>{e(title)}</title>',document,count=1,flags=re.I|re.S)
    metadata=(f'<link rel="canonical" href="{e(canonical)}">\n'
              '<meta name="robots" content="index,follow">\n'
              f'<meta name="description" content="{e(fixture["home"])} vs {e(fixture["away"])} — '
              f'{e(fixture["league"])} football match, kickoff and status.">\n')
    document=document.replace('</head>',metadata+'</head>',1)
    date=fixture['when'].strftime('%d %B %Y, %H:%M UTC')
    status='Upcoming' if fixture['status'] in UPCOMING else ('Live' if fixture['status'] in LIVE else 'Just finished')
    event={'@context':'https://schema.org','@type':'SportsEvent','name':f"{fixture['home']} vs {fixture['away']}",
           'startDate':fixture['when'].isoformat(), 'eventStatus':('https://schema.org/EventScheduled' if fixture['status'] in UPCOMING else 'https://schema.org/EventCompleted' if fixture['status'] in FINISHED else 'https://schema.org/EventScheduled'),
           'sport':'Football', 'url':canonical,
           'homeTeam':{'@type':'SportsTeam','name':fixture['home']},
           'awayTeam':{'@type':'SportsTeam','name':fixture['away']}}
    markup=(f'<section id="ksn-v663-trial05-ssr" class="card" aria-label="Match information">'
            f'<h1>{e(fixture["home"])} vs {e(fixture["away"])}</h1>'
            f'<p>{e(fixture["league"])} · {e(date)} · {e(status)}</p>'
            f'<nav aria-label="Teams"><a href="/teams/{e(fixture["home_id"])}">{e(fixture["home"])}</a> · '
            f'<a href="/teams/{e(fixture["away_id"])}">{e(fixture["away"])}</a></nav></section>'
            '<script type="application/ld+json">'+json.dumps(event,ensure_ascii=False).replace('<','\\u003c')+'</script>')
    return document.replace('<div id="page">',markup+'<div id="page">',1)
