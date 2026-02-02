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


def test_pytest_sessionfinish_success(test_files, testdir, pytester):
    pytester.plugins.append("pytest_circleci_coverage")

    coverage_file = testdir.tmpdir / "coverage.json"
    result = testdir.runpytest_subprocess(
        "--cov", "--cov-context=test", f"--circleci-coverage={coverage_file}"
    )
    result.assert_outcomes(passed=1)
    assert result.stderr.str() == ""

    expected = {
        "src_file.py": {"test_file.py::test_print_hello_world|run": [2]},
        "test_file.py": {"test_file.py::test_print_hello_world|run": [6, 7, 8, 9]},
    }

    coverage = json.loads(coverage_file.read_text(encoding="utf-8"))
    for file_data in coverage.values():
        for context, lines in file_data.items():
            file_data[context] = sorted(lines)

    assert coverage == expected


def test_pytest_sessionfinish_no_flag(test_files, testdir, pytester):
    pytester.plugins.append("pytest_circleci_coverage")

    result = testdir.runpytest_subprocess()
    result.assert_outcomes(passed=1)
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
