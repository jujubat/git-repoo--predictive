# Kasi Sports News v227 — Cloudflare edge protection

Goal: user refreshes should not force sports providers to refresh. Cloudflare serves cached GET responses while the origin/provider keeps the established cadence.

## Prerequisite
Proxy `kasilivescore.com` and `www.kasilivescore.com` through Cloudflare (orange cloud).

## Cache Rules (create in this order)
1. BYPASS PRIVATE
Expression:
`(http.request.uri.path starts_with "/auth") or (http.request.uri.path starts_with "/admin") or (http.request.uri.path starts_with "/login") or (http.request.uri.path starts_with "/signup") or (http.request.uri.path starts_with "/register")`
Action: Bypass cache.

2. LIVE DATA — 3 minutes
Expression:
`(http.request.method eq "GET" and (http.request.uri.path starts_with "/live" or http.request.uri.path starts_with "/sports/football/live" or http.request.uri.path starts_with "/api/live-scores-with-odds"))`
Action: Eligible for cache. Edge TTL: 3 minutes.

3. FIXTURES / ODDS / PREDICTIONS — 30 minutes
Expression:
`(http.request.method eq "GET" and (http.request.uri.path starts_with "/fixtures" or http.request.uri.path starts_with "/odds" or http.request.uri.path starts_with "/ai-predictions"))`
Action: Eligible for cache. Edge TTL: 30 minutes.

4. STANDINGS / PUBLIC TEAM / PLAYER DATA — 6 hours
Use public GET endpoints only. Do not include authenticated profile/account routes.
Action: Eligible for cache. Edge TTL: 6 hours.

5. PUBLIC HTML / LOCALIZED SEO PAGES
Action: Eligible for cache. Recommended Edge TTL: 15 minutes. The v227 origin also emits shared-cache headers.

IMPORTANT: cache rules reduce origin requests, but Cloudflare has distributed edge locations. Do not interpret this as mathematically guaranteeing exactly one origin request worldwide per TTL. The backend/provider cache and single-flight behavior remain necessary.

## Rate Limiting
Create WAF rate-limit rules for abusive API refreshes and auth attempts. Do not block ordinary cached page views.
Suggested starting policy:
- `/auth/*`: strict per-IP rate limit.
- public API endpoints: challenge/block clearly abusive per-IP bursts.
- Prefer counting requests to origin where your Cloudflare plan/rule options support it.
Tune after observing real traffic so legitimate score-following users are not blocked.

## Cache verification
Inspect response headers in production. Repeated requests should move to Cloudflare cache hits where eligible. Verify private/auth responses remain uncached.

## AdSense
Set these Render environment variables only after you receive the real values:
`ADSENSE_CLIENT_ID=ca-pub-...`
`ADS_TXT_LINE=google.com, pub-..., DIRECT, f08c47fec0942fa0`

Do not invent a publisher ID. `/ads.txt` is already wired and will publish the configured line.

## Affiliate and sponsorship
Affiliate links created by the site helper use `rel="sponsored nofollow noopener"`.
Public pages:
- `/affiliate-disclosure`
- `/sponsor`
Commercial contact defaults to `admin@kasilivescore.com` and can be overridden with `SPONSORSHIP_EMAIL`.
