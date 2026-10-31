
"""Provider-free My Kasi fixture selection. No network or DB access."""

from datetime import datetime, timezone
from urllib.parse import urlsplit

ALLOWED = {
    "NS", "TBD", "SCHEDULED",
    "NOT STARTED", "UPCOMING"
}


def _team(raw, fallback_name, fallback_logo):
    if isinstance(raw, dict):
        name = raw.get("name") or fallback_name
        logo = (
            raw.get("logo")
            or raw.get("badge")
            or raw.get("crest")
            or fallback_logo
        )
    else:
        name = raw or fallback_name
        logo = fallback_logo

    name = name.strip() if isinstance(name, str) else ""
    logo = logo.strip() if isinstance(logo, str) else ""

    parsed = urlsplit(logo)

    if (
        parsed.scheme.lower() != "https"
        or not parsed.hostname
        or parsed.username
        or parsed.password
    ):
        logo = ""

    return name, logo


def select_my_kasi_fixtures(payload, now=None):
    """Return at most two real future fixtures from an existing snapshot."""

    if not isinstance(payload, dict):
        return []

    rows = payload.get("matches")
    if not isinstance(rows, list):
        rows = payload.get("games")

    if not isinstance(rows, list):
        return []

    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        raise ValueError("now must be timezone-aware")
    now = now.astimezone(timezone.utc)

    selected = {}

    for row in rows:
        if not isinstance(row, dict):
            continue

        fixture = row.get("fixture")
        fixture = fixture if isinstance(fixture, dict) else {}

        teams = row.get("teams")
        teams = teams if isinstance(teams, dict) else {}

        fid = fixture.get("id") or row.get("_afootFixtureId")

        # Never invent a fixture identity.
        if isinstance(fid, bool) or not str(fid or "").isdigit():
            continue

        home, home_logo = _team(
            teams.get("home") or row.get("homeTeam") or row.get("home"),
            row.get("home") if isinstance(row.get("home"), str) else "",
            row.get("homeLogo") or ""
        )

        away, away_logo = _team(
            teams.get("away") or row.get("awayTeam") or row.get("away"),
            row.get("away") if isinstance(row.get("away"), str) else "",
            row.get("awayLogo") or ""
        )

        if not all((home, away, home_logo, away_logo)):
            continue

        raw_date = (
            fixture.get("date")
            or row.get("fixtureDate")
            or row.get("date")
            or row.get("datetime")
            or row.get("kickoff")
        )

        try:
            kickoff = datetime.fromisoformat(
                str(raw_date).replace("Z", "+00:00")
            )
            if kickoff.tzinfo is None:
                continue
            kickoff = kickoff.astimezone(timezone.utc)
        except (ValueError, TypeError, OverflowError):
            continue

        if kickoff <= now:
            continue

        status_obj = fixture.get("status")
        status = (
            status_obj.get("short")
            if isinstance(status_obj, dict)
            else status_obj
        )
        status = str(
            status or row.get("statusShort")
            or row.get("status") or ""
        ).upper().strip()

        if status not in ALLOWED:
            continue

        if row.get("isFinished") is True or row.get("isLive") is True:
            continue

        if row.get("homeScore") is not None:
            continue

        if row.get("awayScore") is not None:
            continue

        key = str(fid)

        if key in selected:
            continue

        selected[key] = {
            "fixtureId": key,
            "home": home,
            "away": away,
            "homeLogo": home_logo,
            "awayLogo": away_logo,
            "kickoff": kickoff.isoformat(),
            "status": status,
        }

    return sorted(
        selected.values(),
        key=lambda x: (x["kickoff"], x["fixtureId"])
    )[:2]
