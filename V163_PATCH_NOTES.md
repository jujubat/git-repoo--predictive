# KasiScore v163 patch

This patch addresses the v162 integration failures reported against the supplied build.

## Fixed
1. Home is the default visible page and remains available in primary navigation.
2. Added `/predictions` compatibility alias to `/ai-predictions`.
3. Added `/injuries` alias to `/sports/injuries`.
4. Added `/transfers` alias to `/sports/transfers`.
5. `/fixtures?range=today` is accepted and normalised to `type=today`.
6. Live widget no longer fabricates demo matches; it is shown only on Home and Live.
7. Live match clicks refresh current fixture statistics before rendering.
8. Finished fixtures are excluded by the existing AI prediction gate; alias uses the same handler.
9. Added `/fixtures/{fixture_id}/stats` and `/match/{fixture_id}/stats`.
10. Home includes a multi-sport live module.
11. Removed the colour-mode button group.
12. KasiScore Explorer continues using the platform API/server rather than Google search.
13. Growth/intelligence calls use server endpoints and now show honest empty states instead of silently failing.
14. Added default-home boot handling to reduce navigation flashing.
15. Moved the `uvicorn.run()` entry point to the end of `server.py`. This is critical: v162 started Uvicorn before the Phase 4 routes below the entry point were registered.
16. Admin is now a single Admin widget; admin-only tools are hidden from the subscriber/public tool list.
17. Subscriber tools remain separate from admin tools.
18. Added `/sports/live` aggregate endpoint and a Home multi-sport live card.
19. Live stats endpoint is available for the Live 75/stats UI integration.
20. League tables now fall back to the previous season if the current competition has not published a table.
21. Past Results now uses the local server `/team/history` path instead of a hard-coded Netlify proxy.
22. Competition data remains server-driven; Home-first discovery is retained.
23. Match Engine receives the server route registration fix because all later Phase 4 routes now register before startup.
24. Weekend hub displays the Wednesday publishing rule before Wednesday.
25. Multi-Sport live endpoint aggregates configured sports.
26. Sports news query includes requested football publishers through Google News search terms.
27. Transfers endpoint remains API-Football for football; sports transfer/news discovery is supported through the expanded news layer.
28. Injuries endpoint alias is available.
29. Rugby/cricket/tennis ESPN provider slugs were broadened.
30. Intelligence Hub empty-state failures are no longer hidden by the startup-order bug.
31. Public account registration/login routes already exist in v162; the frontend keeps the server-token session and Admin widget now separates administration from subscriber access.

## Important
The build still depends on the configured API keys/providers in `.env`. A provider returning no events is represented as `No data` rather than demo/fabricated sports data.
