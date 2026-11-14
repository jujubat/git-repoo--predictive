import ast
import asyncio
import datetime
import logging
import time
import warnings
from pathlib import Path

source = Path("server.py").read_text(encoding="utf-8-sig")

with warnings.catch_warnings():
    warnings.simplefilter("ignore", SyntaxWarning)
    tree = ast.parse(source)

node = next(
    (
        n for n in tree.body
        if isinstance(n, ast.AsyncFunctionDef)
        and n.name == "team_seasons_history"
    ),
    None
)

assert node is not None, "History endpoint missing"

node.decorator_list = []
node.args.defaults = [
    ast.Constant(value=None),
    ast.Constant(value=6),
    ast.Constant(value=0),
]

module = ast.fix_missing_locations(
    ast.Module(body=[node], type_ignores=[])
)

def record(year, played, points, rank=1):
    return {
        "season": year,
        "played": played,
        "wins": played,
        "draws": 0,
        "losses": 0,
        "goalsFor": played,
        "goalsAgainst": 0,
        "points": points,
        "rank": rank,
        "cleanSheets": 0,
    }

def valid(row):
    return (
        isinstance(row, dict)
        and all(
            type(row.get(field)) is int
            for field in (
                "played", "wins", "draws", "losses",
                "goalsFor", "goalsAgainst", "points"
            )
        )
        and row["played"] > 0
        and row["wins"] + row["draws"] + row["losses"]
            == row["played"]
    )

def run_case(label, league, verified, expected):
    calls = []

    snapshots = {
        f"team_history_v614:42:{year}": {
            "data": {
                "teamId": 42,
                "season": year,
                "leagueId": league,
                "summary": record(
                    year,
                    8 if year == 2026 else 38,
                    21 if year == 2026 else 80,
                ),
            }
        }
        for year in range(2021, 2027)
    }

    snapshots[f"canonical_standings:{league}:2026"] = {
        "data": {
            "standings": [
                {
                    "team": {"id": 42},
                    "rank": 2,
                    "points": 21,
                    "all": {"played": 8},
                }
            ]
        }
    }

    def read_history(team, year, pre=None):
        payload = (pre or {}).get("data") or {}
        summary = payload.get("summary")
        return dict(summary) if isinstance(summary, dict) else None

    def read_standings(team, year, league_id, pre=None):
        rows = ((pre or {}).get("data") or {}).get("standings") or []

        for item in rows:
            if str((item.get("team") or {}).get("id")) != str(team):
                continue

            matches = int(
                (item.get("all") or {}).get("played") or 0
            )

            return record(
                year,
                matches,
                int(item.get("points") or 0),
                int(item.get("rank") or 1),
            )

        return None

    def recovery(base, team, year):
        calls.append((team, year))

        if verified:
            base["standingsSource"] = "verified-epl-last-good"
            base["standings"] = [
                {
                    "team": {"id": 42},
                    "rank": 1,
                    "points": 27,
                    "all": {"played": 10},
                }
            ]

        return base

    namespace = {
        "time": time,
        "datetime": datetime.datetime,
        "timezone": datetime.timezone,
        "asyncio": asyncio,
        "log": logging.getLogger("v663-971d"),
        "_current_season": lambda: 2026,
        "_ksn_v622_on": lambda team: False,
        "_KSN_V644_BIG5": set(),
        "_ksn_v617_snapshots_bulk": lambda keys: {
            key: snapshots[key]
            for key in keys
            if key in snapshots
        },
        "_dashboard_snapshot_get": lambda key: snapshots.get(key),
        "_team_league_hint_db": lambda team, year: None,
        "SPORTS_DB_ENABLED": False,
        "_v448_api_football_provider_locked": lambda: True,
        "_ksn_v614_history_row": read_history,
        "_ksn_v615_history_row_from_standings": read_standings,
        "_ksn_v663_history_complete": valid,
        "_ksn_v663_968ek_fresh_epl_standings": recovery,
        "_ksn_v607_mirrored_fixtures": lambda team, year: [],
        "_ksn_v620_clean_sheets_from_fixtures": lambda *args: (None, {}),
        "_ksn_v621_schedule_cs_fill": lambda *args: False,
        "_sql_team_profile": lambda *args: None,
    }

    exec(compile(module, "server.py", "exec"), namespace)

    output = asyncio.run(
        namespace["team_seasons_history"](42, 6, 0)
    )

    rows = output.get("seasons") or []

    current = next(
        (row for row in rows if row.get("season") == 2026),
        None,
    )

    assert current is not None, (
        f"{label}: current season missing"
    )

    actual = (
        current["played"],
        current["points"],
        current["rank"],
    )

    assert actual == expected, (
        f"{label}: expected {expected}, received {actual}"
    )

    assert len(rows) == 6, (
        f"{label}: expected 6 seasons, received {len(rows)}"
    )

    assert all(
        row["played"] == 38
        for row in rows
        if row["season"] < 2026
    ), f"{label}: historical records changed"

    if league == 39:
        assert calls == [(42, 2026)], (
            f"{label}: wrong recovery invocation {calls}"
        )
    else:
        assert not calls, (
            f"{label}: EPL recovery leaked to league {league}"
        )

    print(
        "PASS:", label,
        "| played:", current["played"],
        "| points:", current["points"],
        "| rank:", current["rank"],
        "| seasons:", len(rows),
    )

print("=== V663 STEP 971D-R1: TEST EXECUTION ===")

run_case(
    "Verified EPL standings advance current season",
    39,
    True,
    (10, 27, 1),
)

run_case(
    "No verified update preserves stored History",
    39,
    False,
    (8, 21, 1),
)

run_case(
    "Other league excludes EPL recovery",
    207,
    True,
    (8, 21, 1),
)

print("\n=== STEP 971D-R1 COMPLETE ===")
print("Direct integration tests: 3 PASS")
print("Historical seasons preserved")
print("Provider requests: 0")
print("Database writes: 0")
print("Deployments: 0")
