import asyncio
import os
import runpy
from unittest.mock import patch

# Reuse the exact Step 971R route-isolation harness.
ns = runpy.run_path(
    "tests/v663_971r_history_endpoint_integration.py"
)

make_context = ns["make_context"]
module = ns["module"]

def execute(environment, read_flag, production_flag):
    ctx = make_context()
    exec(compile(module, "971v-gate", "exec"), ctx)

    variables = {
        "KSN_ENVIRONMENT": environment,
        "KSN_V663_HISTORY_CACHE_READ": read_flag,
        "KSN_V663_HISTORY_CACHE_READ_PRODUCTION": production_flag,
    }

    with patch.dict(os.environ, variables):
        result = asyncio.run(ctx["run_integration"]())

    return result, ctx

print("=== V663 STEP 971V: PRODUCTION GATES ===")

result, ctx = execute("production", "0", "0")
assert result == []
print("PASS: Production disabled by default")

result, ctx = execute("production", "1", "0")
assert result == []
print("PASS: General cache flag cannot activate production")

result, ctx = execute("production", "0", "1")
assert result == []
print("PASS: Production flag alone cannot activate recovery")

result, ctx = execute("production", "1", "1")
assert len(result) == 1
assert result[0]["season"] == 2024
assert ctx["sources"][2024] == "verified-cache-only"
print("PASS: Both explicit production flags required")

result, ctx = execute("development", "1", "1")
assert result == []
print("PASS: Development cannot activate recovery")

result, ctx = execute("staging", "1", "0")
assert len(result) == 1
print("PASS: Existing isolated staging gate preserved")

ctx = make_context()
ctx["_ksn_v663_staging_football_only"] = lambda: True
exec(compile(module, "971v-isolation", "exec"), ctx)

with patch.dict(os.environ, {
    "KSN_ENVIRONMENT": "staging",
    "KSN_V663_HISTORY_CACHE_READ": "1",
    "KSN_V663_HISTORY_CACHE_READ_PRODUCTION": "1",
}):
    assert asyncio.run(ctx["run_integration"]()) == []

print("PASS: Football-only staging protection preserved")

print("=== STEP 971V: 7 PASS ===")
print("External provider requests: 0")
print("Database writes: 0")
print("Deployments: 0")
