# RSpec CircleCI Coverage

A RSpec plugin that generates coverage data for CircleCI's Smarter Testing.

## Usage

Install the plugin:

```bash
gem install rspec-circleci-coverage
```

Add the plugin to your `spec_helper.rb`

```ruby
require "rspec-circleci-coverage"
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
