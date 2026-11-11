"""Trial 06: bounded OFFLINE API-Football fixture snapshot producer and read-only consumer.

Never run the producer inside a public request. The producer uses a local ledger;
this is NOT a distributed quota counter across Render workers/deployments.
"""
import argparse
from datetime import datetime, timedelta, timezone
import json
import os
from pathlib import Path
import tempfile
from urllib.request import Request, urlopen

from ksn_v663_match_ssr import normalized_fixture

DEFAULT_SNAPSHOT = Path(__file__).with_name('ksn_v663_provider_fixture_snapshot.json')
DEFAULT_LEDGER = Path(__file__).with_name('ksn_v663_provider_quota_ledger.json')
TOTAL_CEILING = 30000
MAX_PER_RUN = 30
MAX_ROWS = 2000
MAX_AGE_SECONDS = 7200


def _atomic_json(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile('w', encoding='utf-8', dir=str(path.parent), delete=False) as handle:
        json.dump(data, handle, separators=(',', ':'), ensure_ascii=False)
        tmp = handle.name
    os.replace(tmp, path)


def read_snapshot(path=DEFAULT_SNAPSHOT, now=None):
    """Return a validation-filtered fixture mapping or {}. No upstream requests."""
    now = now or datetime.now(timezone.utc)
    try:
        if path == DEFAULT_SNAPSHOT and os.getenv('KSN_SEO_SHARED_DATABASE_URL', '').strip():
            from ksn_v663_shared_seo import get_snapshot
            data = get_snapshot()
            if data is None:
                return {}
        else:
            data = json.loads(Path(path).read_text(encoding='utf-8'))
        generated = datetime.fromisoformat(data['generated_utc'].replace('Z', '+00:00'))
        if generated.tzinfo is None or not timedelta(0) <= now - generated <= timedelta(seconds=MAX_AGE_SECONDS):
            return {}
        if data.get('source') != 'api-football' or not isinstance(data.get('matches'), list):
            return {}
        valid = []
        for row in data['matches'][:MAX_ROWS]:
            if normalized_fixture(row, now) is not None:
                valid.append(row)
        return {'provider-snapshot': {'matches': valid}} if valid else {}
    except (OSError, ValueError, TypeError, KeyError, AttributeError):
        return {}


def plan(now=None):
    now = now or datetime.now(timezone.utc)
    today = now.date()
    # One request per calendar day, 14 days ahead + two days behind.
    return [(today + timedelta(days=i)).isoformat() for i in range(-2, 15)]


def fetch_window(api_key, dates, opener=urlopen, limit=MAX_PER_RUN):
    """Return rows + requests attempted. No retry loop; failures consume budget."""
    if not api_key:
        raise ValueError('Missing AFOOT_API_KEY')
    if limit < 0 or limit > MAX_PER_RUN or len(dates) > limit:
        raise ValueError('Request ceiling exceeded')
    rows = []
    spent = 0
    for date in dates:
        url = 'https://v3.football.api-sports.io/fixtures?date=' + date
        request = Request(url, headers={'x-apisports-key': api_key, 'Accept': 'application/json'})
        spent += 1
        try:
            with opener(request, timeout=12) as response:
                document = json.loads(response.read(3000000).decode('utf-8'))
            if not isinstance(document, dict) or document.get('errors'):
                continue
            payload = document.get('response', [])
            if isinstance(payload, list):
                rows.extend(payload[:2000])
        except Exception:
            # Fail closed for the individual date; never disclose the API key.
            continue
    return rows[:MAX_ROWS], spent


def main(argv=None):
    parser = argparse.ArgumentParser(description='Offline API-Football SEO snapshot; dry-run by default')
    parser.add_argument('--execute', action='store_true', help='actually spend provider requests')
    parser.add_argument('--init-shared', action='store_true', help='create shared PostgreSQL tables, no provider calls')
    parser.add_argument('--shared', action='store_true', help='require shared PostgreSQL storage and quota')
    parser.add_argument('--usage', action='store_true', help='show shared reserved usage, no provider calls')
    parser.add_argument('--snapshot', type=Path, default=DEFAULT_SNAPSHOT)
    parser.add_argument('--ledger', type=Path, default=DEFAULT_LEDGER)
    parser.add_argument('--run-cap', type=int, default=17)
    args = parser.parse_args(argv)
    if args.init_shared or args.usage:
        from ksn_v663_shared_seo import initialize, get_usage
        if args.init_shared:
            initialize()
            print('Shared SEO storage initialized; no provider calls made')
        else:
            print('Shared reserved usage:', get_usage())
        return 0
    dates = plan()
    if not 1 <= args.run_cap <= MAX_PER_RUN or len(dates) > args.run_cap:
        raise SystemExit('Invalid per-run budget')
    if not args.execute:
        print(f'DRY RUN: {len(dates)} daily fixture queries planned; zero provider calls made')
        return 0
    key = os.environ.get('AFOOT_API_KEY', '')
    if not key:
        raise SystemExit('AFOOT_API_KEY is required; no calls made')
    if args.shared:
        from ksn_v663_shared_seo import reserve_calls
        try:
            reserve_calls(len(dates))
        except Exception as exc:
            raise SystemExit('Shared quota reservation failed; no provider calls made') from exc
        rows, spent = fetch_window(key, dates, limit=args.run_cap)
        now = datetime.now(timezone.utc)
        verified = [row for row in rows if normalized_fixture(row, now) is not None]
        if not verified:
            print(f'No eligible fixtures; prior shared snapshot retained. Reserved {len(dates)}, attempted {spent}.')
            return 2
        payload = {'source':'api-football','generated_utc':now.isoformat(), 'matches':verified}
        from ksn_v663_shared_seo import publish_snapshot
        publish_snapshot(payload)
        print(f'Shared snapshot published: {len(verified)} fixtures; attempted {spent} calls')
        return 0
    if os.getenv('KSN_SEO_SHARED_DATABASE_URL', '').strip():
        raise SystemExit('Shared storage configured: use --execute --shared (local mode disabled)')
    try:
        ledger = json.loads(args.ledger.read_text(encoding='utf-8'))
        used = int(ledger['used'])
        if used < 0 or used > TOTAL_CEILING:
            raise ValueError('invalid ledger')
    except FileNotFoundError:
        # Fresh local usage tracker. External provider usage is NOT included.
        used = 0
    except (ValueError, KeyError, TypeError):
        raise SystemExit('Invalid quota ledger; refusing provider requests')
    if used + len(dates) > TOTAL_CEILING:
        raise SystemExit('Local quota ceiling reached; refusing provider requests')
    # Reserve planned calls before sending, conservative on errors / interrupted executions.
    _atomic_json(args.ledger, {'used': used + len(dates), 'ceiling': TOTAL_CEILING})
    rows, spent = fetch_window(key, dates, limit=args.run_cap)
    now = datetime.now(timezone.utc)
    verified = [row for row in rows if normalized_fixture(row, now) is not None]
    if not verified:
        print(f'No eligible fixtures; previous snapshot retained. Reserved {len(dates)} calls, attempted {spent}.')
        return 2
    _atomic_json(args.snapshot, {'source':'api-football','generated_utc':now.isoformat(), 'matches':verified})
    print(f'Snapshot written: {len(verified)} valid fixtures; attempted {spent} provider calls')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
