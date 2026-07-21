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

    testdir.makepyfile(
        test_one="""
            import src_a
            import src_b

            def test_a1():
                assert src_a.helper() == 1
                assert src_b.helper() == 2

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

            def test_b1():
                assert src_a.helper() == 1
                assert src_b.helper() == 2
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
        "--cov", "--cov-context=test", f"--circleci-coverage={coverage_file}"
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
        },
        "test_one.py": {
            "test_one.py!!test_one.py::test_a1|run": [5, 6],
            "test_one.py!!test_one.py::test_a2|run": [9],
            "test_one.py!!test_one.py::TestClass!!test_one.py::TestClass::test_fn|run": [13],
        },
        "test_two.py": {
            "test_two.py!!test_two.py::test_b1|run": [5, 6],
        },
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
