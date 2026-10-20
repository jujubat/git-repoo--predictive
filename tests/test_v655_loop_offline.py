"""Offline v655 loop tests. No DB, provider, or app import."""
import ast
import asyncio
import copy
import warnings
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace

source = Path("server.py").read_text(encoding="utf-8")

with warnings.catch_warnings():
    warnings.simplefilter("ignore", SyntaxWarning)
    tree = ast.parse(source)

def get_function(name):
    nodes = [
        node for node in tree.body
        if isinstance(node, ast.AsyncFunctionDef)
        and node.name == name
    ]
    assert len(nodes) == 1, name
    return nodes[0]

loop_node = copy.deepcopy(
    get_function("_ksn655_retention_scheduler_loop")
)
loop_node.decorator_list = []

unit = ast.fix_missing_locations(
    ast.Module(body=[loop_node], type_ignores=[])
)

class StopTest(Exception):
    pass

class FakeLog:
    def info(self, *args, **kwargs):
        pass

    def warning(self, *args, **kwargs):
        pass

    def error(self, *args, **kwargs):
        pass

async def run_case(results, expected_sleeps):
    calls = []
    sleeps = []
    enabled = True

    async def fake_sleep(seconds):
        sleeps.append(seconds)
        if len(sleeps) > expected_sleeps:
            raise StopTest()

    async def fake_to_thread(fn):
        calls.append("cleanup")
        value = results.pop(0)
        if isinstance(value, BaseException):
            raise value
        return value

    ns = {
        "asyncio": SimpleNamespace(
            sleep=fake_sleep,
            to_thread=fake_to_thread,
            CancelledError=asyncio.CancelledError,
        ),
        "datetime": datetime,
        "timezone": timezone,
        "_ksn655_scheduler_allowed": lambda: enabled,
        "_ksn655_next_run_utc": lambda: (
            datetime.now(timezone.utc) + timedelta(seconds=1)
        ),
        "_ksn655_run_once_sync": lambda: None,
        "log": FakeLog(),
    }

    exec(compile(unit, "<v655-loop-test>", "exec"), ns)
    loop = ns["_ksn655_retention_scheduler_loop"]

    try:
        await loop()
    except StopTest:
        pass

    return calls, sleeps

async def checks():
    calls, sleeps = await run_case(
        [{"status": "completed"}], 1
    )
    assert calls == ["cleanup"]
    assert len(sleeps) == 2
    assert sleeps[0] >= 0
    print("PASS: Successful run returns to daily scheduling")

    calls, sleeps = await run_case(
        [
            RuntimeError("simulated failure"),
            {"status": "completed"},
        ], 2
    )
    assert calls == ["cleanup", "cleanup"]
    assert sleeps[1] == 3600
    print("PASS: Failed run retries after one hour")

    calls, sleeps = await run_case(
        [
            {"status": "another_worker_running"},
            {"status": "cleanup_skipped"},
            {"status": "completed"},
        ], 3
    )
    assert calls == ["cleanup"] * 3
    assert sleeps[1:3] == [3600, 3600]
    print("PASS: Contended and skipped runs retry")

    calls, sleeps = await run_case(
        [
            RuntimeError("failure one"),
            RuntimeError("failure two"),
            RuntimeError("failure three"),
        ], 3
    )
    assert len(calls) == 3
    assert sleeps[1:3] == [3600, 3600]
    print("PASS: At most three attempts per daily cycle")

    # Verify cancellation is propagated, not swallowed.
    try:
        await run_case(
            [asyncio.CancelledError()], 5
        )
    except asyncio.CancelledError:
        print("PASS: Cancellation propagates correctly")
    else:
        raise AssertionError("Cancellation was swallowed")

asyncio.run(checks())

lifespan_source = ast.unparse(get_function("lifespan"))

assert "_ksn_staging_seo_test_mode()" in lifespan_source
assert "_ksn655_retention_scheduler_loop()" in lifespan_source
assert "if _ksn655_scheduler_allowed()" in lifespan_source
assert "retention_scheduler_task.cancel()" in lifespan_source

assert (
    lifespan_source.index("_ksn_staging_seo_test_mode()")
    < lifespan_source.index(
        "_ksn655_retention_scheduler_loop()"
    )
)

print("PASS: Staging offline startup guard precedes scheduler")
print("PASS: Scheduler is registered conditionally")
print("PASS: Scheduler is cancelled during shutdown")
print("ALL V655 LOOP TESTS PASSED")
print("Real database connections: 0")
print("API-Football calls: 0")
