
"""V663 staging football memory integration adapter.

No HTTP route, provider calls, database access or scheduler.
Only trusted server-side code may invoke this adapter.
"""

from ksn_v663_staging_football_loader import publish_football_fixtures


def staging_football_enabled(environment, football_only):
    return (
        str(environment).strip().lower() == "staging"
        and str(football_only).strip() == "1"
    )


def publish_trusted_football_batch(
    cache,
    fixtures,
    *,
    environment,
    football_only,
    trusted_source=False,
):
    """Publish a caller-supplied trusted batch into staging memory.

    trusted_source is an internal assertion, not authentication.
    Never expose this function directly to HTTP clients.
    """
    if not staging_football_enabled(environment, football_only):
        raise PermissionError("Football ingestion is staging-only")

    if trusted_source is not True:
        raise PermissionError("Trusted server-side source required")

    return publish_football_fixtures(cache, fixtures)
