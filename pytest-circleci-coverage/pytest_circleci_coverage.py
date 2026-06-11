import json
import os.path
import sys

from coverage import CoverageData


def _format_context(context):
    # context: "nodeid|phase" e.g. "src/foo.py::TestClass::test_fn[p]|run"
    # output:  "testfile!!nodeid|phase"
    nodeid, phase = context.rsplit("|", 1)
    testfile = nodeid.split("::")[0]
    return f"{testfile}!!{nodeid}|{phase}"


def pytest_addoption(parser):
    parser.addoption("--circleci-coverage", dest="circleci-coverage")


def _restart_monitoring_events(config):
    # coverage.py's sys.monitoring core (default on Python 3.14+) returns
    # DISABLE from its LINE callback, which silences each (code, lineno) after
    # the first hit. Re-enable events at each test setup so that all context
    # are recorded.
    if not config.getoption("circleci-coverage", default=None):
        return
    monitoring = getattr(sys, "monitoring", None)
    if monitoring is not None:
        monitoring.restart_events()


def pytest_runtest_setup(item):
    _restart_monitoring_events(item.config)


def pytest_sessionfinish(session):
    try:
        output_path = session.config.getoption("circleci-coverage")
        if not output_path:
            # If the flag is not set, noop skip coverage reporting.
            return

        print("Generating CircleCI coverage JSON...")

        data = CoverageData()
        data.read()
        files = data.measured_files()

        if not files:
            print(
                "No coverage data found. "
                + "Ensure pytest is run with --cov and --cov-context=test flags.",
                file=sys.stderr,
            )
            return

        has_contexts = False
        tests = {}
        for filename in files:
            contexts = data.contexts_by_lineno(filename=filename)

            rev = {}
            for lineno, contexts in contexts.items():
                for context in contexts:
                    if context and context.endswith("|run"):
                        key = _format_context(context)
                        rev.setdefault(key, []).append(lineno)
                        has_contexts = True

            if rev:
                name = os.path.relpath(filename)
                tests[name] = rev

        if not has_contexts:
            print(
                "No coverage context data found. "
                + "Ensure pytest is run with --cov-context=test to enable context tracking.",
                file=sys.stderr,
            )
            return

        with open(output_path, "w") as f:
            json.dump(tests, f)

        print(f"Coverage data written to {output_path}")

    except Exception as e:
        print(f"Unexpected error generating coverage data: {e}", file=sys.stderr)
