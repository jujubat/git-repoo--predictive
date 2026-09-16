# V181 — The Odds API fallback

- Added optional The Odds API v4 fallback for bookmaker-odds/fixture widgets.
- Primary API-Football odds/fixture paths now have a hard 5-second fallback deadline.
- Added team/fixture matching so The Odds API event IDs do not need to match API-Football fixture IDs.
- Added `/odds`, `/odds/batch`, `/fixtures/with-odds`, and `/fixtures/{fixture_id}/odds-detail` fallback handling.
- Added `ODDS_API_*` environment settings to `.env.example`.
- The fallback supplies bookmaker odds/events only; it does not fabricate scores, statistics, lineups, or predictions.
