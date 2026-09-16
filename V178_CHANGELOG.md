# KasiScore v178 — Dashboard Repairs

## Repairs
- Live Football, Rugby and Cricket cards are clickable and open the unified match page.
- Sports Live is placed under the Sports section instead of the Home page.
- Match Coverage navigation is grouped under Matches/Fixtures.
- Predictions & Intelligence navigation is grouped under Intelligence.
- Team & Player Intel navigation is grouped under Sports.
- Removed the large Home Explore/duplicate feature showcase.
- Removed the Home prediction-opportunity duplicate.
- Football News remains on Home, with improved image extraction from Google News RSS descriptions.
- News images use eager loading for the first visible stories and async decoding.
- Multi-sport Sports Hub loading is parallelized for faster initial data availability.
- Removed artificial 300ms/700ms startup delays for live/news loading.

## Validation
- `server.py` Python syntax validated.
- All inline JavaScript blocks passed `node --check`.
