# KasiScore v185 — Provider Request Coordinator

- Live scores and live matches standardized to 3 minutes (180 seconds).
- Fixture refresh standardized to 30 minutes.
- Local API-Football ceiling defaults to 30 requests/minute.
- Central provider pacing enforces at least 2 seconds between upstream request starts.
- Single-flight locking collapses identical simultaneous API-Football requests.
- Prediction startup no longer triggers standings + two team-form calls per eligible fixture.
- Internal dashboard/prediction routes use refresh=0 and reuse caches.
- Odds persistent TTL set to 30 minutes; standings/injuries set to 6 hours.
- Removed dashboard manual Refresh Data button.
- Removed hardcoded API-Football browser/localStorage key seeding; provider key remains server-side.
- 429/rate-limit responses use backoff and Retry-After when supplied.

Render environment: keep RATE_LIMIT_PER_MINUTE=30 and AFOOT_API_KEY configured.
