
"""V663 authenticated staging-only football refresh handler.

No FastAPI route is registered here. This module is inactive until
explicitly integrated into the staging backend.
"""

import hmac
from datetime import date

from ksn_v663_staging_football_bridge import (
    refresh_staging_football_memory,
)


def authorize_staging_refresh(
    *,
    environment,
    football_only,
    supplied_secret,
    configured_secret,
):
    if str(environment).strip().lower() != "staging":
        raise PermissionError("Staging environment required")

    if str(football_only).strip() != "1":
        raise PermissionError("Football-only mode required")

    if not isinstance(configured_secret, str) or len(configured_secret) < 32:
        raise PermissionError("Strong staging refresh secret required")

    if not isinstance(supplied_secret, str):
        raise PermissionError("Refresh authentication required")

    if not hmac.compare_digest(
        supplied_secret.encode("utf-8"),
        configured_secret.encode("utf-8"),
    ):
        raise PermissionError("Refresh authentication failed")

    return True


async def execute_authenticated_refresh(
    *,
    supplied_secret,
    configured_secret,
    environment,
    football_only,
    target_date,
    cache,
    provider_get,
    normalize_fixture,
    provider_budget_context,
):
    authorize_staging_refresh(
        environment=environment,
        football_only=football_only,
        supplied_secret=supplied_secret,
        configured_secret=configured_secret,
    )

    if not isinstance(target_date, date):
        raise ValueError("Explicit UTC fixture date required")

    return await refresh_staging_football_memory(
        cache=cache,
        provider_get=provider_get,
        normalize_fixture=normalize_fixture,
        provider_budget_context=provider_budget_context,
        target_date=target_date,
        environment=environment,
        football_only=football_only,
    )
