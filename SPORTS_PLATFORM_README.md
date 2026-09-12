# KasiScore Sports Intelligence Platform — Phase 1 → Phase 4

This package upgrades the existing Football AI Predictions dashboard into a multi-sport South Africa-first platform while preserving the existing football prediction/odds/learning engine.

## What's New in Phase 4 — SA Rugby Intelligence Layer

### Dedicated Rugby Endpoints (server.py)
| Endpoint | Description |
|---|---|
| `GET /rugby/health` | Layer status, API key check, available leagues |
| `GET /rugby/leagues` | SA leagues (URC, Currie Cup, Rugby Championship, Super Rugby Africa) and club directory |
| `GET /rugby/matches` | Match centre — live, scheduled, results. Params: `league`, `season`, `date`, `live`, `team` |
| `GET /rugby/standings` | League table. Params: `league`, `season` |
| `GET /rugby/news` | SA rugby news headlines (Google News RSS). Params: `team`, `limit` |
| `GET /rugby/squad` | Player squad for a team (API-Sports). Params: `team_id`, `season` |
| `GET /rugby/h2h` | Head-to-head history. Params: `home_id`, `away_id` |
| `GET /rugby/predictions` | **AI rugby predictions** — scoreline, try count, confidence, ensemble signals |

### KasiScore Rugby AI v1 — Prediction Engine
Weighted ensemble model across 5 signals:
- **Form (28%)** — last 5 results, recency-weighted
- **H2H (20%)** — head-to-head historical record
- **Home Advantage (15%)** — ~5–8 pt boost for home side in rugby
- **World Ranking proxy (17%)** — relative ranking signal
- **Attack/Defence ratio (20%)** — points scored vs points conceded

Each prediction returns:
- Best pick (Home Win / Away Win / Draw)
- Win/Draw/Loss probabilities
- Predicted scoreline (rounded to rugby scoring increments)
- Predicted try count per team
- Per-signal breakdown
- Confidence score (45–93%)

### Frontend — 🏉 SA Rugby Intel Tab
- **Match Centre** — live scores, HT scores, venue, round, SA team highlighting
- **Standings** — league table with SA franchise badges
- **AI Predictions** — full prediction cards with signal grid and try estimates
- **Rugby News** — team-filtered SA rugby headlines (Bulls, Stormers, Sharks, Lions, Cheetahs)

## Earlier Phases

### Phase 1 — Traffic foundation
- Sports Hub homepage section, Multi-sport score centre, Sports News, Transfer centre, Injury centre

### Phase 2 — Intelligence foundation
- Football AI predictions, injury feed, sport/provider abstraction

### Phase 3 — Multi-sport expansion
- Rugby, Cricket, Tennis, Basketball, Motorsport/Golf/MMA

## Providers

| Sport | Primary | Fallback |
|---|---|---|
| Football | API-Football | — |
| Rugby | API-Sports (rugby) | ESPN rugby-union scoreboard |
| Basketball | API-Sports (basketball) | ESPN |
| Cricket/Tennis | ESPN | — |
| News | Google News RSS (headlines only) | — |

## Environment

Copy `.env.example` to `.env` and set the provider keys.

```text
AFOOT_API_KEY=...      # API-Football (football predictions/odds)
RUGBY_API_KEY=...      # API-Sports rugby — required for SA rugby intelligence
BASKETBALL_API_KEY=... # API-Sports basketball
TIMEZONE=Africa/Johannesburg
PORT=8000
```

API-Sports rugby coverage includes URC, Currie Cup, Rugby Championship (Springboks), and Super Rugby Africa. Free plan: 100 requests/day.

## Run

```powershell
cd "C:\Users\Admin\Downloads\QSR Folder\Predictive Dashboard"
python -m pip install -r requirements.txt
uvicorn server:app --host 127.0.0.1 --port 8000 --reload
```

Open `index.html` in the browser or serve through your existing deployment.

## Next Phase Ideas
- Player-level stats (tries, conversions, tackles) from API-Sports
- Live in-play rugby scoring events (tries, penalties, yellow cards)
- Springboks squad tracker with injury/availability status
- Currie Cup form tables auto-fed into the AI prediction engine
- Betting odds integration for rugby matches (Betway/HollywoodBets)
- H2H visualiser for SA franchise derbies (Bulls vs Stormers, etc.)

## Important
Before public launch, replace localStorage-only admin/subscriber gates with real auth/authorisation and server-side entitlement checks. Affiliate links must use your approved partner URLs and comply with South African advertising and gambling regulations.


## Phase 5 + Phase 6 — Traffic & Intelligence Network

Added in this build:
- Intelligence Hub for Today, Weekend, AI Predictions and SEO discovery.
- Competition-first SEO page registry covering competition, fixtures, results, predictions and table destinations.
- Featured competition network including Saudi Pro League.
- `/seo/pages`, `/seo/manifest` and `/seo/sitemap.xml` endpoints.
- First-party growth telemetry at `/analytics/event` and `/growth/dashboard`.
- Weekend content publishing plan at `/content/weekend`.
- Persistent `kasiscore_growth.sqlite3` event store.
- Netlify routes for `/today` and `/weekend`.
- Expanded competition ID support for major cup competitions already represented in the registry.

### Production SEO
Set `PUBLIC_SITE_URL` to the canonical HTTPS domain before exposing `/seo/sitemap.xml` to search engines. The frontend remains a client-rendered dashboard, so production should also submit the sitemap through Google Search Console and Bing Webmaster Tools and monitor indexing.

### Growth principle
Do not generate thin pages solely for keywords. Each indexed page should contain useful first-party match, team, competition, prediction or statistical intelligence. This protects the site against scaled-content abuse and improves the chance of sustainable organic traffic.


## Phase 7 — Server-rendered SEO + PWA Web App (v161)

The web app now supports server-rendered HTML for high-value discovery routes while preserving the interactive SPA experience.

### Server-rendered routes
- `/`
- `/today` and `/weekend`
- `/match/{home}-vs-{away}`
- `/team/{team}`
- `/player/{player}`
- `/football/{competition}` and deeper football paths

Match pages attempt to reuse pending predictions from the learning store first, then fall back to current fixtures. When data is available, the initial HTML includes bookmaker 1X2 availability, KasiScore probability/confidence, recent form, injuries/availability and H2H context. Predictions remain gated by complete current bookmaker 1X2 odds.

### Deployment
Set `PUBLIC_SITE_URL` on the FastAPI server to the public HTTPS origin. On Netlify, set `KASISCORE_BACKEND_URL` to the deployed FastAPI server. Netlify routes high-value SEO paths through `netlify/functions/seo.js`, which requests the server-rendered HTML and falls back to the SPA shell if the backend is temporarily unavailable.

The client app hides the server-rendered SEO block after hydration and continues using the same interactive dashboard, so users and crawlers share the same canonical URLs.

## Production Readiness — v161

KasiScore v161 is the production-oriented SEO/PWA build. Before public launch, configure the following:

1. **Domain and HTTPS**
   - Set `PUBLIC_SITE_URL` to the canonical HTTPS `.com` domain.
   - Set `KASISCORE_BACKEND_URL` to the public FastAPI service.
   - Keep one canonical host (www or non-www) and permanently redirect the other.

2. **Google Search Console**
   - Verify the domain property.
   - If HTML-token verification is preferred, set `GOOGLE_SITE_VERIFICATION` in the environment.
   - Submit `/sitemap.xml`.
   - Inspect representative `/today`, `/weekend`, `/football/...`, `/match/...`, `/team/...`, and `/player/...` URLs.
   - Validate structured data with Google's Rich Results Test.
   - Monitor Page Indexing, Core Web Vitals and Search performance after launch.

3. **SEO rendering**
   - Important pages are server-rendered first and hydrated into the interactive app.
   - The sitemap includes the canonical registry plus real upcoming match URLs returned by the fixture engine.
   - Unknown match URLs return HTTP 404 rather than a soft-200 page.
   - Do not publish fabricated or thin entity pages solely for keywords.

4. **Performance / RUM**
   - v161 records LCP, INP, CLS and TTFB to `/analytics/web-vital`.
   - Review `/growth/dashboard` for collected web-vital samples.
   - Target Google's recommended Core Web Vitals thresholds in real-user data, not only lab tests.

5. **Security headers**
   - Netlify sends HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and a restrictive `Permissions-Policy`.
   - Keep all API credentials server-side; never place API-Football keys in browser JavaScript.

6. **Traffic / engagement instrumentation**
   - Track page views, match opens, prediction views, live opens, shares, follows, notification enables, searches, affiliate clicks, ad views and ad clicks.
   - Use internal links to move users naturally from match → team → player → competition → live → Live 75 → related match.

7. **Monetisation compliance**
   - Clearly label affiliate relationships and sponsored content.
   - Use operator links only under the applicable bookmaker affiliate agreement and South African advertising/gambling requirements.
   - Keep the intelligence/data value visible independently of affiliate calls-to-action.

8. **Operational launch checks**
   - Load test the FastAPI service and Netlify SSR function.
   - Confirm API-Football quotas, caching and rate limiting.
   - Verify that a provider outage degrades gracefully instead of generating incorrect predictions.
   - Confirm current bookmaker 1X2 odds are complete before publishing a qualified pre-match prediction.
