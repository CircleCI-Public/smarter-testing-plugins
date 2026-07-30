import type {
  EnvironmentContext,
  JestEnvironmentConfig,
} from '@jest/environment';
import type { Circus } from '@jest/types';
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import type { Context } from 'vm';
import { V8CoverageCollector } from '@circleci/v8-coverage-collector';
import { ENV_VAR, TMP_COVERAGE_DIR } from './constants.ts';
import type { JestCircleCICoverageOutput } from './types.ts';

interface TestCoverage {
  [testKey: string]: string[];
}

type JestTestEnvironmentConstructor = new (
  config: JestEnvironmentConfig,
  context: EnvironmentContext,
) => {
  setup(): Promise<void>;
  teardown(): Promise<void>;
  getVmContext(): Context | null;
};

/**
 * Builds a Jest test environment subclass that collects V8 coverage per test when
 * `CIRCLECI_COVERAGE` is set, then writes per-suite JSON under the temp coverage
 * directory for the package reporter to merge.
 */
export function createJestCircleCICoverageEnvironment(
  Base: JestTestEnvironmentConstructor,
): JestTestEnvironmentConstructor {
  class JestCircleCICoverageEnvironment extends Base {
    collector = new V8CoverageCollector();
    initialized = false;
    enabled: boolean;
    cwd: string;
    testPath: string;
    coverage: TestCoverage = {};

    constructor(config: JestEnvironmentConfig, context: EnvironmentContext) {
      super(config, context);
      this.enabled = process.env[ENV_VAR] !== undefined;
      this.testPath = context.testPath;
      this.cwd = process.cwd();
    }

    async setup(): Promise<void> {
      await super.setup();
      if (!this.enabled) return;

      await this.collector.connect().then(() => {
        this.initialized = true;
      });
    }

    async teardown(): Promise<void> {
      if (this.initialized) {
        await this.collector.disconnect().then(() => {
          this.initialized = false;
        });

        const output: JestCircleCICoverageOutput = {};
        for (const [test, paths] of Object.entries(this.coverage)) {
          for (const path of paths) {
            if (!output[path]) {
              output[path] = {};
            }

            if (!output[path][test]) {
              // executed lines isn't supported, but the testsuite coverage
              // parser requires some lines executed to be accounted for.
              output[path][test] = [1];
            }
          }
        }

        mkdirSync(TMP_COVERAGE_DIR, { recursive: true });

        const testFileName = basename(this.testPath);
        const testCoverageFile = resolve(
          TMP_COVERAGE_DIR,
          `${testFileName}.json`,
        );
        writeFileSync(testCoverageFile, JSON.stringify(output));
      }

      await super.teardown();
    }

    getVmContext(): Context | null {
      return super.getVmContext();
    }

    async handleTestEvent(event: Circus.Event): Promise<void> {
      if (!this.initialized) return;

      if (event.name === 'test_fn_start') {
        await this.collector.resetCoverage();
      }

      if (
        event.name === 'test_fn_success' ||
        event.name === 'test_fn_failure'
      ) {
        await this.collector
          .collectCoverage(this.cwd, this.testPath, event.test.name)
          .then((result) => {
            this.coverage[result.testKey] = result.coveredFiles;
          });
      }
    }
  }

  return JestCircleCICoverageEnvironment as unknown as JestTestEnvironmentConstructor;
}
