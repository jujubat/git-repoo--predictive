
from player_identity_crosswalk_v663 import (
    parse_fantasy_identity,
    resolve_player_identity,
)

for league in (39, 140, 135, 78, 61):
    identity = parse_fantasy_identity(f"fp:{league}:19465")
    assert identity["leagueId"] == league

print("PASS: Five Big 5 leagues recognized")

assert parse_fantasy_identity("fp:39:19465")["sourceId"] == "fp:39:19465"
print("PASS: Fantasy identity preserved")

assert parse_fantasy_identity("fp:39:row:2026:1") is None
print("PASS: Unstable row identity excluded")

assert parse_fantasy_identity("fp:999:19465") is None
print("PASS: Unsupported league excluded")

unknown = resolve_player_identity("fp:39:19465")

assert unknown["status"] == "unresolved"
assert unknown["canonicalPlayerId"] is None
print("PASS: No numeric identity guessing")

unverified = {
    "fp:39:19465": {
        "sourceId": "fp:39:19465",
        "canonicalPlayerId": 19465,
        "verified": False,
    }
}

assert resolve_player_identity(
    "fp:39:19465", unverified
)["status"] == "unresolved"

print("PASS: Unverified mapping rejected")

verified = {
    "fp:39:19465": {
        "sourceId": "fp:39:19465",
        "canonicalPlayerId": 19465,
        "verified": True,
        "evidence": "verified_provider_cross_reference",
    }
}

result = resolve_player_identity(
    "fp:39:19465", verified
)

assert result["status"] == "verified"
assert result["canonicalPlayerId"] == 19465
print("PASS: Explicit verified mapping accepted")

assert resolve_player_identity(
    "fp:140:19465", verified
)["status"] == "unresolved"

print("PASS: League-scoped identities isolated")

bad = {
    "fp:39:19465": {
        "sourceId": "fp:140:19465",
        "canonicalPlayerId": 19465,
        "verified": True,
        "evidence": "verified_provider_cross_reference",
    }
}

try:
    resolve_player_identity("fp:39:19465", bad)
except ValueError:
    print("PASS: Conflicting crosswalk rejected")
else:
    raise AssertionError("Conflicting crosswalk was accepted")

print("=== V663 STEP 980F: 9 PASS ===")
