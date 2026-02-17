# vitest-circleci-coverage

A Vitest plugin that generates coverage data for
CircleCI's [Smarter Testing](https://circleci.com/docs/guides/test/smarter-testing/).

## Usage

This plugin uses the v8 JS engine Profiler APIs to collect coverage.

Install the plugin.

```shell
pnpm add -D jsr:@circleci/vitest-circleci-coverage
```

Add the custom runner and reporter to your `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    runner: '@circleci/vitest-circleci-coverage/runner',
    reporters: ['@circleci/vitest-circleci-coverage/reporter'],
  },
});
```

Set the `CIRCLECI_COVERAGE` environment variable when running tests to enable test coverage.

```shell
CIRCLECI_COVERAGE=coverage.json vitest run
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
