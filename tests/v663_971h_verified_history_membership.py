import ast
import warnings
from pathlib import Path

source = Path("server.py").read_text(encoding="utf-8-sig")
with warnings.catch_warnings():
    warnings.simplefilter("ignore", SyntaxWarning)
    tree = ast.parse(source)

node = next(
    n for n in tree.body
    if isinstance(n, ast.FunctionDef)
    and n.name == "_ksn_v663_971h_verify_history_membership"
)

module = ast.fix_missing_locations(
    ast.Module(body=[node], type_ignores=[])
)
ns = {}
exec(compile(module, "membership-test", "exec"), ns)
verify = ns[node.name]

def table(lid, year, include=True):
    rows = [{
        "team": {"id": 999},
        "rank": 1,
        "points": 80,
        "all": {
            "played": 36, "win": 25, "draw": 5, "lose": 6,
            "goals": {"for": 70, "against": 25}
        }
    }]
    if include:
        rows.append({
            "team": {"id": 1012},
            "rank": 2,
            "points": 76,
            "all": {
                "played": 36, "win": 23, "draw": 7, "lose": 6,
                "goals": {"for": 65, "against": 30}
            }
        })
    return {"response": [{
        "league": {
            "id": lid,
            "season": year,
            "name": "Verified League",
            "standings": [rows]
        }
    }]}

def check(label, candidates, responses, expected):
    result = verify(1012, 2023, candidates, responses)
    actual = result["leagueId"] if result else None
    assert actual == expected, (
        f"{label}: expected {expected}, received {actual}"
    )
    print("PASS:", label, "=>", actual)

print("=== V663 971H VERIFIED MEMBERSHIP TESTS ===")

check(
    "FC Thun 2023 Challenge League",
    [207, 208],
    {207: table(207, 2023, False), 208: table(208, 2023)},
    208
)

check(
    "Missing team rejects competition",
    [207], {207: table(207, 2023, False)}, None
)

check(
    "Two verified leagues are ambiguous",
    [207, 208],
    {207: table(207, 2023), 208: table(208, 2023)},
    None
)

check(
    "Wrong provider season rejected",
    [208], {208: table(208, 2024)}, None
)

check(
    "Wrong provider league rejected",
    [208], {208: table(207, 2023)}, None
)

duplicate = table(208, 2023)
duplicate["response"][0]["league"]["standings"][0].append(
    dict(duplicate["response"][0]["league"]["standings"][0][1])
)
check(
    "Duplicate team row rejected",
    [208], {208: duplicate}, None
)

invalid = table(208, 2023)
invalid["response"][0]["league"]["standings"][0][1]["all"]["played"] = 35
check(
    "Inconsistent totals rejected",
    [208], {208: invalid}, None
)

check(
    "No standings fails closed",
    [208], {}, None
)

print("=== V663 STEP 971H: 8 PASS ===")
print("Provider requests: 0")
print("Database writes: 0")
print("Deployments: 0")
