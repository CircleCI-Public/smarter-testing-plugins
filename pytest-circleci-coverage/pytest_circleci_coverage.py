import json
import os.path
import sys

from coverage import CoverageData


def pytest_addoption(parser):
    parser.addoption("--circleci-coverage", dest="circleci-coverage")


def pytest_sessionfinish(session):
    try:
        print("Generating CircleCI coverage JSON...")

        output_path = session.config.getoption("circleci-coverage")
        if not output_path:
            print(
                "No flag named 'circleci-coverage'. "
                + "Ensure --circleci-coverage flag is set.",
                file=sys.stderr,
            )
            return

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
                    if context:
                        rev.setdefault(context, []).append(lineno)
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
