import json

import pytest


@pytest.fixture
def test_files(testdir):
    testdir.makepyfile(
        src_file="""
            def print_hello_world():
                print("Hello World")
        """
    )

    testdir.makepyfile(
        test_file="""
            import pytest

            import src_file

            def test_print_hello_world(capsys: pytest.CaptureFixture):
                src_file.print_hello_world()
                captured = capsys.readouterr()
                assert captured.out == "Hello World\\n"
                assert captured.err == ""
        """
    )

    testdir.makepyfile(
        src_a="""
            def helper():
                return 1
        """
    )

    testdir.makepyfile(
        src_b="""
            def helper():
                return 2
        """
    )

    # Nothing here runs once the module has been imported, so coverage credits
    # it to no test at all.
    testdir.makepyfile(
        declarations="""
            from enum import Enum


            class Color(Enum):
                RED = "red"


            MAX_RETRIES = 3
        """
    )

    # Declarations behind a relative import, reachable only through pkg.sub.deep.
    testdir.makepyfile(
        **{
            # Reached only as an ancestor of the modules deep imports, never
            # named itself. Needs a line of its own to be worth reporting.
            "pkg/__init__": 'NAME = "pkg"',
            "pkg/sub/__init__": "",
            # Each of these reaches deep by a different kind of import, so each
            # keeps one resolution rule honest: base is a package up, so it
            # covers a "from .." import.
            "pkg/base": "BASE = 3",
            # Imported by an absolute name from inside pkg.sub, so that package
            # must not be prepended when resolving it.
            "leaf": "STEP = 2",
            "pkg/sub/limits": "LIMIT = 8",
            "pkg/sub/deep": """
                from leaf import STEP
                from . import limits
                from ..base import BASE

                def go():
                    return BASE + STEP + limits.LIMIT
            """,
        }
    )

    # A fixture body referencing an import: those lines run during setup, which
    # is not reported, but the dependency is still the test's.
    testdir.makepyfile(
        fixture_only="""
            TIMEOUT = 30
        """
    )
    testdir.makepyfile(
        conftest="""
            import pytest

            import fixture_only

            @pytest.fixture
            def timeout():
                return fixture_only.TIMEOUT
        """
    )

    testdir.makepyfile(
        test_one="""
            import declarations
            import src_a
            import src_b

            def test_a1():
                assert src_a.helper() == 1
                assert src_b.helper() == 2
                assert declarations.MAX_RETRIES == 3

            def test_a2():
                assert src_a.helper() == 1

            class TestClass:
                def test_fn(self):
                    assert src_a.helper() == 1
        """
    )

    testdir.makepyfile(
        test_two="""
            import src_a
            import src_b

            from pkg.sub.deep import go

            def test_b1(timeout):
                assert src_a.helper() == 1
                assert src_b.helper() == 2
                assert go() == 13
                assert timeout == 30
        """
    )


@pytest.fixture
def test_skipped(testdir):
    testdir.makepyfile(
        src_file="""
                def print_hello_world():
                    print("Hello World")
            """
    )

    testdir.makepyfile(
        test_skip="""
                import pytest

                import src_file

                @pytest.mark.skip(reason="always skip")
                def test_foo():
                    assert True
            """
    )


def test_pytest_sessionfinish_success(test_files, testdir, pytester):
    pytester.plugins.append("pytest_circleci_coverage")

    coverage_file = testdir.tmpdir / "coverage.json"
    result = testdir.runpytest_subprocess(
        "--cov=.", "--cov-context=test", f"--circleci-coverage={coverage_file}"
    )
    result.assert_outcomes(passed=5)
    assert result.stderr.str() == ""

    expected = {
        "src_file.py": {"test_file.py!!test_file.py::test_print_hello_world|run": [2]},
        "test_file.py": {
            "test_file.py!!test_file.py::test_print_hello_world|run": [6, 7, 8, 9]
        },
        "src_a.py": {
            "test_one.py!!test_one.py::test_a1|run": [2],
            "test_one.py!!test_one.py::test_a2|run": [2],
            "test_one.py!!test_one.py::TestClass!!test_one.py::TestClass::test_fn|run": [2],
            "test_two.py!!test_two.py::test_b1|run": [2],
        },
        "src_b.py": {
            "test_one.py!!test_one.py::test_a1|run": [2],
            "test_two.py!!test_two.py::test_b1|run": [2],
            # Neither calls src_b, but a sibling test in test_one.py references
            # it, and the dependency is tracked per test file.
            "test_one.py!!test_one.py::test_a2|run": [1],
            "test_one.py!!test_one.py::TestClass!!test_one.py::TestClass::test_fn|run": [1],
        },
        "test_one.py": {
            "test_one.py!!test_one.py::test_a1|run": [6, 7, 8],
            "test_one.py!!test_one.py::test_a2|run": [11],
            "test_one.py!!test_one.py::TestClass!!test_one.py::TestClass::test_fn|run": [15],
        },
        "test_two.py": {
            "test_two.py!!test_two.py::test_b1|run": [7, 8, 9, 10],
        },
        # Referenced only by a fixture body, whose lines run during setup rather
        # than during the test, so only the test using that fixture is credited.
        "fixture_only.py": {"test_two.py!!test_two.py::test_b1|run": [1]},
        # Nothing imports a conftest.py, so it is credited to every test it
        # applies to -- here, all of them.
        "conftest.py": {
            "test_file.py!!test_file.py::test_print_hello_world|run": [1],
            "test_one.py!!test_one.py::test_a1|run": [1],
            "test_one.py!!test_one.py::test_a2|run": [1],
            "test_one.py!!test_one.py::TestClass!!test_one.py::TestClass::test_fn|run": [1],
            "test_two.py!!test_two.py::test_b1|run": [1],
        },
        # Declarations only, so no test runs a line of it. Credited to the tests
        # in the one file that references it, and to no other -- test_file.py and
        # test_two.py never name it.
        "declarations.py": {
            "test_one.py!!test_one.py::test_a1|run": [1],
            "test_one.py!!test_one.py::test_a2|run": [1],
            "test_one.py!!test_one.py::TestClass!!test_one.py::TestClass::test_fn|run": [1],
        },
        # Only ever named as an ancestor of the modules pkg.sub.deep imports,
        # never imported itself.
        "pkg/__init__.py": {"test_two.py!!test_two.py::test_b1|run": [1]},
        # Reached by a "from .." import a package up from pkg/sub/deep.py.
        "pkg/base.py": {"test_two.py!!test_two.py::test_b1|run": [1]},
        # Reached by a relative "from . import".
        "pkg/sub/limits.py": {"test_two.py!!test_two.py::test_b1|run": [1]},
        # Reached by absolute name from pkg/sub/deep.py, despite that file
        # living in a package.
        "leaf.py": {"test_two.py!!test_two.py::test_b1|run": [1]},
        # Names all three only inside go(), so each depends on test_b1 having
        # called it. Executed itself, so the line it ran is reported.
        "pkg/sub/deep.py": {"test_two.py!!test_two.py::test_b1|run": [6]},
    }

    coverage = json.loads(coverage_file.read_text(encoding="utf-8"))
    for file_data in coverage.values():
        for context, lines in file_data.items():
            file_data[context] = sorted(lines)

    assert coverage == expected


def test_pytest_sessionfinish_all_tests_skipped(test_skipped, testdir, pytester):
    pytester.plugins.append("pytest_circleci_coverage")

    coverage_file = testdir.tmpdir / "coverage.json"
    result = testdir.runpytest_subprocess(
        "--cov", "--cov-context=test", f"--circleci-coverage={coverage_file}"
    )
    result.assert_outcomes(skipped=1)
    assert "No coverage context data found." in result.stderr.str()

    coverage = json.loads(coverage_file.read_text(encoding="utf-8"))

    assert not coverage


def test_pytest_sessionfinish_no_flag(test_files, testdir, pytester):
    pytester.plugins.append("pytest_circleci_coverage")

    result = testdir.runpytest_subprocess()
    result.assert_outcomes(passed=5)
    assert result.stderr.str() == ""


def test_pytest_sessionfinish_no_coverage(test_files, testdir, pytester):
    pytester.plugins.append("pytest_circleci_coverage")

    coverage_file = testdir.tmpdir / "coverage.json"
    result = testdir.runpytest_subprocess(f"--circleci-coverage={coverage_file}")
    expected = "No coverage data found. Ensure pytest is run with --cov and --cov-context=test flags."
    assert result.stderr.str().find(expected) != -1


def test_pytest_sessionfinish_no_context(test_files, testdir, pytester):
    pytester.plugins.append("pytest_circleci_coverage")

    coverage_file = testdir.tmpdir / "coverage.json"
    result = testdir.runpytest_subprocess(
        "--cov", f"--circleci-coverage={coverage_file}"
    )

    expected = "No coverage context data found. Ensure pytest is run with --cov-context=test to enable context tracking."
    assert result.stderr.str().find(expected) != -1
