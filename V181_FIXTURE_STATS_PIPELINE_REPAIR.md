# KasiScore v181 — Fixture & Statistics Pipeline Repair

## Fixed
- Removed the 5-second wall-clock timeout around `/fixtures/with-odds` -> `/fixtures`.
  The `ALL` league loader can now complete its configured league scan instead of
  being replaced by an odds-only fallback.
- Kept the 5-second timeout for individual odds/fallback requests where it is
  appropriate.
- Removed the 5-second timeout around the multi-league pre-match odds batch.
- Increased the default local API-Football request limiter from 30 to 90 requests/minute
  to accommodate the dashboard's multi-league and profile workloads.
- Changed the frontend dashboard fixture/prediction refreshes from forced
  `refresh=1` to cache-aware `refresh=0`.
- Changed fixture cache keys to include `date_from` and `date_to`, preventing
  different upcoming windows from sharing an incorrect cache entry.
- Changed fixture statistics to use the persistent API cache instead of forcing
  a fresh provider request on every stats view.
- Added provider/quota metadata to fixture-with-odds responses.
- Preserved the actual odds provider label when The Odds API is used as a
  bookmaker fallback.
- Updated backend health/config version reporting to v181.

## Result
API-Football remains the source of truth for fixtures, statistics, lineups,
events, form, injuries and player data. The Odds API is used only for odds/event
fallbacks and no longer replaces a slow multi-league fixture load with an
odds-only dataset.
