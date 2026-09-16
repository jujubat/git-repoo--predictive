# KasiScore v181 — Goal-style Player Profiles & Global Entity Links

## Player profile expansion
- Career history across the most recent available seasons.
- Competition-by-competition statistics.
- Current form and fixture-level player ratings.
- Rating summary (average/best) where provider ratings are returned.
- Transfer history.
- Injury/suspension history.
- Trophy history.
- Recent player matches.
- Existing identity, biographical and season statistics retained.

## Global click-through navigation
- Player names are automatically made clickable from provider-backed dashboard data, including line-ups, top scorers, injuries, transfers and player statistics.
- Team names are automatically made clickable from provider-backed dashboard data, including fixtures, live scores, predictions and standings.
- Team/player links route to the standalone `/team/...` and `/player/...` pages.
- Explicit team/player links were added to the standalone entity-page components where needed.

## Data integrity
- No fabricated career, transfer, trophy, injury or rating data is generated.
- API-Football remains the source for the expanded football profile data.
- Match ratings are shown only when returned by the fixture player-statistics endpoint.
