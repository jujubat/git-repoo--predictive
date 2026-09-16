# KasiScore v1790 — Home News, Odds & Live Repair

## Changes
- Restored and enhanced **Football News** on the Home page with publisher thumbnails.
- Added **South Africa Trending** to Home with images.
- Added **Sports News** discovery for football, rugby and cricket with images.
- Added **Current Odds** to Home using API-Football bookmaker 1X2 where supplied, with team badges.
- Added **Match Highlights & Short Videos** using YouTube RSS search without requiring a YouTube API key.
- Removed the visible **API Fixtures / Matches** dashboard tab while retaining fixture data for predictions and odds.
- Improved Live Matches fallback from `/live` to the multi-sport live provider path.
- Made the Tip of the Day resilient to provider errors; raw HTTP 500 messages are no longer shown to users.
- Made `/ai-predictions` and `/live` return structured fallback responses instead of raw provider failures.
- Sports News and Sports Hub previews now render available article images.

## Validation
- `server.py` passes Python compilation.
- All inline JavaScript blocks pass Node syntax validation.
