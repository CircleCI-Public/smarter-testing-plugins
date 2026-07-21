# pytest-circleci-coverage

A pytest plugin that works with pytest-cov to generate coverage data for CircleCI's
[Smarter Testing](https://circleci.com/docs/guides/test/smarter-testing/).

## Usage

Install the plugin via git.

```shell
python -m pip install git+https://github.com/circleci/pytest-circleci-coverage.git
```

Install [pytest-cov](https://pypi.org/project/pytest-cov/).

Run pytest with coverage and the `--circleci-coverage` flag to generate coverage JSON.

```shell
pytest --cov --cov-context=test --circleci-coverage=coverage.json
```

## Development

### Running tests

Install the plugin locally in editable mode.

```shell
pip install --editable .
```

Run tests.

```shell
pytest
```

To generate the coverage.json, used in the CI integration test.

```shell
circleci testsuite "integration test" --local --analyze-tests="all" && cat coverage.json | jq --sort-keys > coveragetmp.json && mv coveragetmp.json coverage.json
```
