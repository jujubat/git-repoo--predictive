
"""Provider-scoped football player identities and verified crosswalk."""

import re

BIG5_LEAGUES = frozenset({39, 140, 135, 78, 61})

FP_ID = re.compile(
    r"^fp:(39|140|135|78|61):([1-9][0-9]*)$"
)


def parse_fantasy_identity(value):
    if not isinstance(value, str):
        return None

    match = FP_ID.fullmatch(value)

    if not match:
        return None

    return {
        "source": "FantasyPlayoffs",
        "leagueId": int(match.group(1)),
        "providerPlayerId": match.group(2),
        "sourceId": value,
    }


def resolve_player_identity(
    fantasy_id, verified_crosswalk=None
):
    """Never infer canonical identity from name or numeric similarity."""

    identity = parse_fantasy_identity(fantasy_id)

    if identity is None:
        return {
            "status": "unresolved",
            "canonicalPlayerId": None,
            "reason": "invalid_or_unstable_source_id",
        }

    crosswalk = verified_crosswalk or {}
    mapping = crosswalk.get(fantasy_id)

    if mapping is None:
        return {
            "status": "unresolved",
            "canonicalPlayerId": None,
            "reason": "verified_crosswalk_missing",
            "fantasyIdentity": identity,
        }

    if not isinstance(mapping, dict):
        raise ValueError("Invalid crosswalk entry")

    if mapping.get("verified") is not True:
        return {
            "status": "unresolved",
            "canonicalPlayerId": None,
            "reason": "identity_not_verified",
            "fantasyIdentity": identity,
        }

    canonical = mapping.get("canonicalPlayerId")

    if (
        type(canonical) is not int
        or canonical <= 0
    ):
        raise ValueError("Invalid canonical player ID")

    if mapping.get("sourceId") != fantasy_id:
        raise ValueError("Crosswalk source identity mismatch")

    if mapping.get("evidence") not in (
        "verified_provider_cross_reference",
        "verified_official_player_mapping",
    ):
        raise ValueError("Unsupported crosswalk evidence")

    return {
        "status": "verified",
        "canonicalPlayerId": canonical,
        "fantasyIdentity": identity,
        "evidence": mapping["evidence"],
    }
