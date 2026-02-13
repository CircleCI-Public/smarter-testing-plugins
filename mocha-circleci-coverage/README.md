# mocha-circleci-coverage

A Mocha plugin that generates coverage data for CircleCI's Smarter Testing.

## Usage

This plugin uses the v8 JS engine Profiler APIs to collect coverage.

Install the plugin.

```shell
pnpm add -D jsr:@circleci/mocha-circleci-coverage
```

Add the custom hook to the `.mocharc.js` file:

```js
module.exports = {
  require: ['@circleci/mocha-circleci-coverage'],
};
```

Run tests with the `CIRCLECI_COVERAGE` env to collect coverage.

```shell
CIRCLECI_COVERAGE=coverage.json mocha
```

## Development

Install and use current node version.

```shell
NODE_VER=$(cat ./.nvmrc)
nvm install $NODE_VER
nvm use $NODE_VER
```

Install dependencies with pnpm.

```shell
pnpm install
```

Build the plugin.

```shell
pnpm build
```

Run tests.

```shell
pnpm test
```
