
"""V663 staging-only football fixture memory publisher.

This module does not fetch or authenticate provider data.
Only trusted server-side code may invoke publish_football_fixtures.
"""

from datetime import datetime, timezone

MAX_FIXTURES = 100
CACHE_KEY = "fixtures:V663_STAGING:verified"

ALLOWED_STATUSES = frozenset({
    "NS", "TBD", "1H", "HT", "2H", "ET",
    "P", "BT", "FT", "AET", "PEN",
})


def validate_football_fixture(row):
    if not isinstance(row, dict):
        return None

    if str(row.get("sport") or "").strip().lower() != "football":
        return None

    fixture_id = row.get("_afootFixtureId")
    if fixture_id is None:
        fixture_id = row.get("id")

    if isinstance(fixture_id, bool):
        return None

    try:
        numeric_id = int(str(fixture_id))
    except (ValueError, TypeError):
        return None

    if numeric_id <= 0 or str(fixture_id).strip() != str(numeric_id):
        return None

    status = str(row.get("statusShort") or "").strip().upper()
    if status not in ALLOWED_STATUSES:
        return None

    kickoff = str(
        row.get("fixtureDate")
        or row.get("datetime")
        or ""
    ).strip()

    try:
        parsed = datetime.fromisoformat(kickoff.replace("Z", "+00:00"))
    except ValueError:
        return None

    if parsed.tzinfo is None or parsed.utcoffset() is None:
        return None

    home = str(row.get("home") or "").strip()
    away = str(row.get("away") or "").strip()

    if not home or not away or home.casefold() == away.casefold():
        return None

    accepted = dict(row)
    accepted["sport"] = "football"
    accepted["statusShort"] = status
    accepted["_afootFixtureId"] = numeric_id
    accepted["fixtureDate"] = parsed.astimezone(timezone.utc).isoformat()

    return accepted


def publish_football_fixtures(cache, rows):
    """Publish a bounded, trusted-server-supplied fixture batch.

    Validation is not proof of provider authenticity.
    This function must not be exposed directly to HTTP callers.
    """
    if cache is None:
        raise ValueError("An isolated staging cache is required")

    if not isinstance(rows, list):
        raise TypeError("Fixture batch must be a list")

    if len(rows) > MAX_FIXTURES:
        raise ValueError("Fixture batch exceeds safety limit")

    accepted = []
    seen = set()

    for raw in rows:
        fixture = validate_football_fixture(raw)
        if fixture is None:
            continue

        identity = fixture["_afootFixtureId"]
        if identity in seen:
            continue

        seen.add(identity)
        accepted.append(fixture)

    if not accepted:
        return {
            "accepted": 0,
            "published": False,
            "reason": "no-valid-football-fixtures",
        }

    cache[CACHE_KEY] = {
        "matches": accepted,
        "count": len(accepted),
        "sport": "football",
        "stagingCacheOnly": True,
        "stale": False,
        "providerLocked": False,
        "ingestedAt": datetime.now(timezone.utc).isoformat(),
    }

    return {
        "accepted": len(accepted),
        "published": True,
        "reason": "validated-staging-memory-ingestion",
    }
