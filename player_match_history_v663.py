
"""Pure player match-history normalization. No network or database access."""

from datetime import datetime


FINISHED = {"FT", "AET", "PEN"}


def _obj(value):
    return value if isinstance(value, dict) else {}


def _number(value):
    if value is None or isinstance(value, bool):
        return None
    try:
        value = float(value)
        if not 0 <= value < float("inf"):
            return None
        return int(value) if value.is_integer() else value
    except (TypeError, ValueError, OverflowError):
        return None


def _rating(value):
    result = _number(value)
    return result if result is not None and result <= 10 else None


def _positive_id(value):
    try:
        result = int(value)
        return result if result > 0 else None
    except (TypeError, ValueError, OverflowError):
        return None


def _date(value):
    try:
        return datetime.fromisoformat(
            str(value).replace("Z", "+00:00")
        ).isoformat()
    except (TypeError, ValueError):
        return None


def _extract_one(player_id, fixture, player_groups):
    fixture = _obj(fixture)
    info = _obj(fixture.get("fixture"))
    teams = _obj(fixture.get("teams"))
    league = _obj(fixture.get("league"))
    goals = _obj(fixture.get("goals"))
    status = _obj(info.get("status"))

    fixture_id = _positive_id(info.get("id"))
    if not fixture_id or status.get("short") not in FINISHED:
        return None

    home = _obj(teams.get("home"))
    away = _obj(teams.get("away"))

    if not isinstance(player_groups, list):
        return None

    for group in player_groups:
        group = _obj(group)
        club = _obj(group.get("team"))
        club_id = _positive_id(club.get("id"))

        if club_id not in (
            _positive_id(home.get("id")),
            _positive_id(away.get("id")),
        ):
            continue

        for entry in group.get("players") or []:
            entry = _obj(entry)
            person = _obj(entry.get("player"))

            if _positive_id(person.get("id")) != player_id:
                continue

            stats = entry.get("statistics") or []
            if not isinstance(stats, list) or not stats:
                continue

            s = _obj(stats[0])
            games = _obj(s.get("games"))
            mins = _number(games.get("minutes"))

            # Presence on a squad list is not proof of appearance.
            if mins is None or mins <= 0:
                continue

            player_goals = _obj(s.get("goals"))
            cards = _obj(s.get("cards"))
            penalty = _obj(s.get("penalty"))

            record = {
                "fixtureId": fixture_id,
                "playerId": player_id,
                "date": _date(info.get("date")),
                "season": league.get("season"),
                "competition": {
                    "id": league.get("id"),
                    "name": league.get("name"),
                    "country": league.get("country"),
                    "logo": league.get("logo"),
                },
                "home": {
                    "id": home.get("id"),
                    "name": home.get("name"),
                    "logo": home.get("logo"),
                },
                "away": {
                    "id": away.get("id"),
                    "name": away.get("name"),
                    "logo": away.get("logo"),
                },
                "score": {
                    "home": goals.get("home"),
                    "away": goals.get("away"),
                },
                "teamId": club_id,
                "minutes": mins,
                "started": games.get("substitute") is False,
                "position": games.get("position"),
                "rating": _rating(games.get("rating")),
                "goals": _number(player_goals.get("total")),
                "assists": _number(player_goals.get("assists")),
                "saves": _number(player_goals.get("saves")),
                "goalsConceded": _number(
                    player_goals.get("conceded")
                ),
                "penaltySaves": _number(
                    penalty.get("saved")
                ),
                "yellowCards": _number(cards.get("yellow")),
                "redCards": _number(cards.get("red")),
                "matchCentre": f"/match/football/{fixture_id}",
                "source": "verified-fixture-player-statistics",
            }
            return record

    return None


def build_player_matches(player_id, fixture_packets):
    """Packets contain fixture and corresponding fixture-player data."""
    player_id = _positive_id(player_id)
    if player_id is None:
        return []

    records = {}

    for packet in fixture_packets:
        packet = _obj(packet)
        record = _extract_one(
            player_id,
            packet.get("fixture"),
            packet.get("playerGroups"),
        )

        if record is None:
            continue

        fixture_id = record["fixtureId"]
        existing = records.get(fixture_id)

        # Prefer a verified rating when duplicated sources disagree.
        if existing is None or (
            existing["rating"] is None
            and record["rating"] is not None
        ):
            records[fixture_id] = record

    return sorted(
        records.values(),
        key=lambda x: (
            x.get("date") or "",
            x["fixtureId"],
        ),
        reverse=True,
    )


def paginate_player_matches(
    records, season=None, competition=None,
    limit=25, offset=0,
):
    limit = int(limit)
    offset = int(offset)

    if not 1 <= limit <= 100 or offset < 0:
        raise ValueError("Invalid pagination")

    filtered = [
        x for x in records
        if (
            season is None
            or str(x.get("season")) == str(season)
        ) and (
            competition is None
            or str(_obj(x.get("competition")).get("id"))
            == str(competition)
        )
    ]

    page = filtered[offset:offset + limit]

    rated = [
        x["rating"] for x in filtered
        if x.get("rating") is not None
    ]

    return {
        "count": len(page),
        "total": len(filtered),
        "limit": limit,
        "offset": offset,
        "hasMore": offset + len(page) < len(filtered),
        "matches": page,
        "ratedMatchCount": len(rated),
        "averageRating": (
            round(sum(rated) / len(rated), 2)
            if rated else None
        ),
        "coverage": "verified fixture-player records only",
    }


def collect_cached_player_matches(
    player_id, years, profile_reader,
    fixture_reader, snapshot_reader,
    max_candidates=400,
):
    """Index verified existing snapshots without external requests."""
    pid = _positive_id(player_id)
    if pid is None:
        return {"matches": [], "coverage": "invalid_player"}

    team_years = set()
    unavailable_years = []

    for year in years:
        profile = profile_reader(pid, year)
        if not isinstance(profile, dict):
            unavailable_years.append(year)
            continue

        for stat in profile.get("statistics") or []:
            if not isinstance(stat, dict):
                continue

            league = _obj(stat.get("league"))
            try:
                recorded_year = int(league.get("season"))
            except (TypeError, ValueError):
                continue

            if recorded_year != year:
                continue

            tid = _positive_id(
                _obj(stat.get("team")).get("id")
            )
            if tid:
                team_years.add((tid, year))

    fixtures_by_id = {}
    missing_team_mirrors = 0

    for tid, year in sorted(team_years):
        fixtures = fixture_reader(tid, year)

        if not isinstance(fixtures, list) or not fixtures:
            missing_team_mirrors += 1
            continue

        for fixture in fixtures:
            if not isinstance(fixture, dict):
                continue

            info = _obj(fixture.get("fixture"))
            league = _obj(fixture.get("league"))
            fid = _positive_id(info.get("id"))

            try:
                fixture_year = int(league.get("season"))
            except (TypeError, ValueError):
                continue

            if not fid or fixture_year != year:
                continue

            date = _date(info.get("date")) or ""
            previous = fixtures_by_id.get(fid)

            if previous is None or date > previous[0]:
                fixtures_by_id[fid] = (date, fixture)

    ordered = sorted(
        fixtures_by_id,
        key=lambda fid: (
            fixtures_by_id[fid][0], fid
        ),
        reverse=True,
    )

    truncated = len(ordered) > max_candidates
    selected = ordered[:max_candidates]

    packets = []
    incomplete = 0
    no_player_record = 0

    for fid in selected:
        wrapper = snapshot_reader(
            f"match:football:{fid}"
        )

        data = (
            _obj(wrapper.get("data"))
            if isinstance(wrapper, dict)
            else {}
        )

        match = data.get("match")
        players = data.get("players")

        match_info = _obj(
            _obj(match).get("fixture")
        )
        match_status = str(
            _obj(match_info.get("status")).get("short") or ""
        ).upper()

        if (
            not isinstance(match, dict)
            or not isinstance(players, list)
            or _positive_id(match_info.get("id")) != fid
            or match_status not in FINISHED
        ):
            incomplete += 1
            continue

        packets.append({
            "fixture": match,
            "playerGroups": players,
        })

        if not build_player_matches(pid, [packets[-1]]):
            no_player_record += 1

    records = build_player_matches(pid, packets)

    return {
        "matches": records,
        "verifiedAppearances": len(records),
        "candidateFixtureCount": len(ordered),
        "scannedFixtureCount": len(selected),
        "missingMatchSnapshots": incomplete,
        "fixturesWithoutVerifiedAppearance": no_player_record,
        "missingTeamSeasonMirrors": missing_team_mirrors,
        "missingProfileYears": unavailable_years,
        "scanTruncated": truncated,
        "coverage": "partial_verified_cache_index",
        "cacheOnly": True,
    }
