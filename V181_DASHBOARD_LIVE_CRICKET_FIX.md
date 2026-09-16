# v181 Dashboard Live + Cricket Data Fix

- Dashboard KPIs now explicitly show:
  - Fixtures loaded
  - Fixtures with real odds
  - Qualified predictions
  - Live matches (combined live feed)
  - Current Odds (fixtures carrying real 1X2 odds)
  - Sport · Live matches (cross-sport live count)
- Cross-sport live data is merged into the dashboard without duplicating football matches.
- `/sports/live` now returns only genuinely live events; scheduled ESPN fallback events are no longer reported as live.
- Cricket ESPN feeds now query SA20 plus international/test/ODI/T20/domestic feeds instead of relying on only `icc`/`domestic`.
- Cricket score records can be enriched with real The Odds API h2h prices when the teams match an odds event.
- SA Cricket Intelligence now displays correctly parsed scores and real odds where supplied.
- Existing API-Football primary odds remain primary; The Odds API remains the real-odds fallback.
