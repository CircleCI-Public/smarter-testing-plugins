# v8-coverage-collector

Wrapper around v8's Profiler APIs used to gather coverage data for CircleCI's Smarter Testing Javascript plugins.

The coverage collector can be used to collect precise coverage during the test run lifecycles.

## Usage

Add the package as a dependency

```shell
pnpm i jsr:@circleci/v8-coverage-collector
```

Use the provided APIs to collect and reset coverage during the test lifecycle events.

```ts
import {V8CoverageCollector} from '@circleci/v8-coverage-collector';

export default class TestHookExample {
  private inspector: V8CoverageCollector;

  constructor() {
    this.inspector = new V8CoverageCollector();
  }

  async onBeforeAll(): Promise<void> {
    await this.inspector.connect()
  }

  async onBeforeTest(): Promise<void> {
    await this.inspector.resetCoverage();
  }

  async onAfterTest(test: ExampleTest): Promise<void> {
    await this.inspector
      .collectCoverage(process.cwd(), test.file, test.name)
      .then((result) => {
        test.meta.testKey = result.testKey;
        test.meta.coveredFiles = result.coveredFiles;
      });
  }

  async onAfterAll(): Promise<void> {
    await this.inspector.disconnect()
  }
}
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
