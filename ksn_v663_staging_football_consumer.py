"""Provider-free V663 staging football fixture consumer."""
from datetime import date, timedelta

CACHE_KEY = "fixtures:V663_STAGING:verified"
LIVE = frozenset({"1H", "HT", "2H", "ET", "P", "BT"})
FINISHED = frozenset({"FT", "AET", "PEN"})

def read_verified_fixtures(
    cache, *, league, fixture_type, date_from, date_to,
    today, resolve_league_id
):
    if fixture_type not in {"today", "upcoming", "live"}:
        raise ValueError("Unsupported staging fixture type")

    def parse_date(value):
        if not isinstance(value, str) or len(value) != 10:
            raise ValueError("Invalid fixture date")
        parsed = date.fromisoformat(value)
        if parsed.isoformat() != value:
            raise ValueError("Noncanonical fixture date")
        return parsed

    start = parse_date(date_from) if date_from else today
    end = (
        parse_date(date_to) if date_to else
        start + timedelta(days=7) if fixture_type == "upcoming"
        else start
    )
    if end < start or (end - start).days > 31:
        raise ValueError("Invalid fixture date range")

    wanted_league = None
    if league.upper() != "ALL":
        wanted_league = int(resolve_league_id(league))

    snapshot = cache.get(CACHE_KEY)
    valid_snapshot = (
        isinstance(snapshot, dict)
        and snapshot.get("sport") == "football"
        and snapshot.get("stagingCacheOnly") is True
        and isinstance(snapshot.get("matches"), list)
    )
    matches = []

    if valid_snapshot:
        for row in snapshot["matches"]:
            if not isinstance(row, dict) or row.get("sport") != "football":
                continue

            if wanted_league is not None:
                try:
                    if int(row.get("leagueId")) != wanted_league:
                        continue
                except (TypeError, ValueError):
                    continue

            kickoff = row.get("fixtureDate")
            if not isinstance(kickoff, str) or len(kickoff) < 10:
                continue
            try:
                match_date = parse_date(kickoff[:10])
            except ValueError:
                continue

            if fixture_type != "live" and not start <= match_date <= end:
                continue

            status = row.get("statusShort")
            if fixture_type == "live":
                if status not in LIVE:
                    continue
            elif fixture_type == "upcoming":
                if status not in {"NS", "TBD"}:
                    continue
            elif status in FINISHED and match_date != today:
                continue

            matches.append(dict(row))

    matches.sort(key=lambda row: (
        str(row.get("fixtureDate") or ""),
        str(row.get("_afootFixtureId") or "")
    ))
    return {
        "matches": matches,
        "count": len(matches),
        "source": "V663 verified staging memory",
        "league": league,
        "type": fixture_type,
        "stagingOnly": True,
        "snapshotAvailable": bool(valid_snapshot),
        "stale": not valid_snapshot,
        "providerLocked": True,
    }
