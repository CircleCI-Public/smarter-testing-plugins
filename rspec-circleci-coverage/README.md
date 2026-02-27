# RSpec CircleCI Coverage

A RSpec plugin that generates coverage data for
CircleCI's [Smarter Testing](https://circleci.com/docs/guides/test/smarter-testing/).

## Usage

Add the plugin to the Gemfile:

```ruby
gem 'rspec-circleci-coverage', :git => 'git://github.com/circleci/rspec-circleci-coverage.git'
```

Install the plugin:

```bash
bundle install
```

To generate coverage, set the `CIRCLECI_COVERAGE` environment variable:

```bash
CIRCLECI_COVERAGE=coverage.json bundle exec rspec
```

## Development

Run the integration tests:

```bash
bundle install
bundle exec rspec
```

Generate the testsuite integration test:

```shell
circleci run testsuite 'integration test' --local --test-analysis=all && cat coverage.json | jq --sort-keys > coveragetmp.json && mv coveragetmp.json coverage.json
```
