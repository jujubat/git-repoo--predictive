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
    and n.name == "_ksn_v663_971g_history_league_candidates"
)
node.decorator_list = []
module = ast.fix_missing_locations(
    ast.Module(body=[node], type_ignores=[])
)
ns = {}
exec(compile(module, "server-selector", "exec"), ns)
selector = ns[node.name]

def entry(i, kind, nation, years):
    return {
        "league": {"id": i, "type": kind},
        "country": {"name": nation},
        "seasons": [{"year": y} for y in years],
    }

data = {"response": [
    entry(207, "League", "Switzerland", [2023, 2025, 2026]),
    entry(208, "League", "Switzerland", [2021, 2022, 2023, 2024]),
    entry(209, "Cup", "Switzerland", [2021, 2022, 2023]),
]}

expected = {
    2026: [207],
    2025: [207],
    2024: [208],
    2023: [207, 208],
    2022: [208],
    2021: [208],
}

for year, value in expected.items():
    assert selector(data, year) == value
    print("PASS: Global selector", year, value)

assert selector(data, 2020) == []
assert selector({}, 2024) == []
assert selector({"response": [
    entry(209, "Cup", "Switzerland", [2024])
]}, 2024) == []
assert selector({"response": [
    entry(208, "League", "Switzerland", [2024]),
    entry(208, "League", "Switzerland", [2024]),
]}, 2024) == [208]

print("PASS: Missing, cup and duplicate safeguards")
print("=== V663 971G REGRESSION COMPLETE ===")
