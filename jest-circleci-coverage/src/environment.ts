import { TestEnvironment } from 'jest-environment-node';
import type {
  JestEnvironmentConfig,
  EnvironmentContext,
} from '@jest/environment';
import type { Circus } from '@jest/types';
import { basename, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { ENV_VAR, TMP_COVERAGE_DIR } from './constants.ts';
import type { JestCircleCICoverageOutput } from './types.ts';
import type { Context } from 'vm';
import { V8CoverageCollector } from '@circleci/v8-coverage-collector';

interface TestCoverage {
  [testKey: string]: string[];
}

export default class JestCircleCICoverageEnvironment extends TestEnvironment {
  private collector: V8CoverageCollector;
  private initialized = false;
  private readonly enabled: boolean;
  private readonly cwd: string;
  private readonly testPath: string;
  private coverage: TestCoverage = {};

  constructor(config: JestEnvironmentConfig, context: EnvironmentContext) {
    super(config, context);
    this.collector = new V8CoverageCollector();
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

    if (event.name === 'test_fn_success' || event.name === 'test_fn_failure') {
      await this.collector
        .collectCoverage(this.cwd, this.testPath, event.test.name)
        .then((result) => {
          this.coverage[result.testKey] = result.coveredFiles;
        });
    }
  }
}
