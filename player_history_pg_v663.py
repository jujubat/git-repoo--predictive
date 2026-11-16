
"""Read-only historical player recovery from existing shared snapshots."""

import json

from player_match_history_v663 import build_player_matches


def recover_historical_player_matches(
    player_id, seasons, connect, limit=250
):
    """Find existing player-fixture snapshots; never call a provider."""
    pid = int(player_id)
    years = {int(y) for y in seasons}

    if pid <= 0 or not years or not 1 <= limit <= 500:
        raise ValueError("Invalid historical player query")

    path = (
        '$[*].players[*].player ? (@.id == '
        + str(pid) + ')'
    )

    sql = """
        SELECT payload
        FROM ksn_shared_snapshots_v485
        WHERE k LIKE %s
          AND jsonb_path_exists(
              COALESCE(
                  payload::jsonb->'data'->'players',
                  '[]'::jsonb
              ),
              %s::jsonpath
          )
        ORDER BY updated DESC
        LIMIT %s
    """

    connection = connect()
    try:
        with connection.cursor() as cursor:
            cursor.execute(sql, ("match:football:%", path, limit + 1))
            rows = cursor.fetchall()
    finally:
        connection.close()

    truncated = len(rows) > limit
    packets = []

    for row in rows[:limit]:
        payload = row[0]

        if isinstance(payload, str):
            try:
                payload = json.loads(payload)
            except ValueError:
                continue

        if not isinstance(payload, dict):
            continue

        data = payload.get("data") or {}
        if not isinstance(data, dict):
            continue

        match = data.get("match")
        players = data.get("players")

        if not isinstance(match, dict) or not isinstance(players, list):
            continue

        league = match.get("league") or {}

        try:
            season = int(league.get("season"))
        except (TypeError, ValueError):
            continue

        if season not in years:
            continue

        packets.append({
            "fixture": match,
            "playerGroups": players,
        })

    records = build_player_matches(pid, packets)

    return {
        "matches": records,
        "verifiedHistoricalRecords": len(records),
        "historicalSnapshotsScanned": min(len(rows), limit),
        "historicalScanTruncated": truncated,
        "historicalSource": "existing_postgresql_match_snapshots",
    }
