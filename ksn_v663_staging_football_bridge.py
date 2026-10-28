
"""V663 staging-only, one-attempt provider-to-memory bridge.

This module defines no HTTP routes or background jobs.
Its caller must supply the backend's existing V662 budget ContextVar.
"""

from datetime import date, datetime, timezone

from ksn_v663_staging_football_adapter import (
    publish_trusted_football_batch,
)

MAX_HTTP_ATTEMPTS = 1


async def refresh_staging_football_memory(
    *,
    cache,
    provider_get,
    normalize_fixture,
    provider_budget_context,
    target_date,
    environment,
    football_only,
):
    if str(environment).strip().lower() != "staging":
        raise PermissionError("Staging environment required")

    if str(football_only).strip() != "1":
        raise PermissionError("Football-only staging mode required")

    if not isinstance(target_date, date) or isinstance(target_date, datetime):
        raise ValueError("Explicit UTC date required")

    if not callable(provider_get) or not callable(normalize_fixture):
        raise TypeError("Trusted backend provider functions required")

    if not hasattr(provider_budget_context, "set") or not hasattr(
        provider_budget_context, "reset"
    ):
        raise TypeError("Backend request-budget ContextVar required")

    # Never overwrite an outer recovery budget or expand its allowance.
    if provider_budget_context.get() is not None:
        raise PermissionError("Nested provider budget context rejected")

    budget = {"remaining": MAX_HTTP_ATTEMPTS}
    token = provider_budget_context.set(budget)

    try:
        raw = await provider_get(
            "/fixtures",
            {"date": target_date.isoformat()},
            force_fresh=False,
            priority="general",
        )
    finally:
        provider_budget_context.reset(token)

    if not isinstance(raw, dict):
        raise ValueError("Invalid provider response")

    response = raw.get("response")
    if not isinstance(response, list):
        raise ValueError("Provider fixtures list missing")

    if len(response) > 5000:
        raise ValueError("Provider batch exceeds 5000-fixture safety limit")

    normalized = []

    for item in response:
        if not isinstance(item, dict):
            continue

        try:
            fixture = normalize_fixture(item)
        except (TypeError, ValueError, KeyError, AttributeError):
            continue

        if not isinstance(fixture, dict):
            continue

        # Sport is established by the trusted API-Football /fixtures source,
        # not by a client-submitted field.
        fixture = dict(fixture)
        fixture["sport"] = "football"
        normalized.append(fixture)

    return publish_trusted_football_batch(
        cache,
        normalized,
        environment=environment,
        football_only=football_only,
        trusted_source=True,
    )
