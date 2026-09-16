# KasiScore v177 — Required Behaviour Repairs

Implemented the requested data-loading repairs:

- Live Match Statistics now uses the selected fixture ID and loads current statistics + line-ups.
- Back to Live restores the live view and attempts to restore the previous scroll position.
- Tip of the Day now loads actual qualified prediction data from the prediction engine.
- Fixtures now display all fixtures returned by the API; valid bookmaker odds remain clearly identified.
- Real-odds coverage is calculated from the server's actual bookmaker-coverage response.
- Qualified predictions are loaded from `/ai-predictions` with the bookmaker qualification gate applied.
- Live matches load from the live API and display current scores.
- Waiting-for-odds fixtures remain visible in their own section.
- Top confidence is restricted to qualified predictions.
- Weekend Hub now loads real Friday–Sunday fixtures and qualified predictions from `/weekend-data`.
- League Tables load the selected competition through the 2026/27 standings endpoint.
- Competitions load from the competition registry.
- Match Engine and Predictions/Intelligence tabs are routed through the live server data loaders.
- Team & Player Intel tabs trigger their corresponding player/team data loaders.
- Platform now exposes live backend/provider status through `/platform/status`.
- Added final tab routing so earlier feature-specific `showTab` hooks cannot prevent required data loading.

Validation:
- `server.py` Python compilation: passed.
- Netlify `football.js` syntax check: passed.
- All inline JavaScript blocks in `index.html`: passed.
- FastAPI route registration smoke test: passed.
