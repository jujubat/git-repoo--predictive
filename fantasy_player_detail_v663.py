
"""Optional FantasyPlayoffs player detail normalization."""

import json
from urllib.parse import urlparse


def normalized_fantasy_details(record):
    details = {}

    stats = record.get("stats")

    if isinstance(stats, dict):
        try:
            encoded = json.dumps(
                stats,
                allow_nan=False,
                ensure_ascii=False,
            )
        except (TypeError, ValueError, OverflowError):
            encoded = None

        if encoded is not None and len(encoded) <= 32768:
            details["stats"] = json.loads(encoded)
            details["statsSource"] = "FantasyPlayoffs"
            details["statsVerified"] = False

    photo = record.get("photoUrl")

    if isinstance(photo, str) and len(photo) <= 2048:
        parsed = urlparse(photo)

        if (
            parsed.scheme == "https"
            and parsed.hostname
            and not parsed.username
            and not parsed.password
        ):
            details["photoUrl"] = photo

    return details
