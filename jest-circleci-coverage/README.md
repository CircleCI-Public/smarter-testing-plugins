# jest-circleci-coverage

[![JSR](https://jsr.io/badges/@circleci/jest-circleci-coverage)](https://jsr.io/@circleci/jest-circleci-coverage)

A Jest plugin that generates coverage data for
CircleCI's [Smarter Testing](https://circleci.com/docs/guides/test/smarter-testing/).

## Usage

This plugin uses the v8 JS engine Profiler APIs to collect coverage.

Install the plugin.

```shell
pnpm add -D jest-circleci-coverage
```

Add the custom runner and reporter to your `jest.config.ts`:

```ts
import {createDefaultPreset} from 'ts-jest';
import type {Config} from 'jest';

const tsJestTransformCfg = createDefaultPreset().transform;

const config: Config = {
  testEnvironment: '@circleci/jest-circleci-coverage/environment',
  reporters: ['default', '@circleci/jest-circleci-coverage/reporter'],
  transform: {
    ...tsJestTransformCfg,
  },
};

export default config;
```

Set the `CIRCLECI_COVERAGE` environment variable when running tests to enable test coverage.

```shell
CIRCLECI_COVERAGE=coverage.json jest
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
