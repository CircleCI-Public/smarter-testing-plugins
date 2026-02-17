/**
 * Vitest test runner that collects V8 code coverage per test
 * for CircleCI's Smarter Testing.
 *
 * @module
 */

import type {
  RunnerTask,
  RunnerTestCase,
  SerializedConfig,
  RunnerTestFile,
  TaskMeta,
} from 'vitest';
import type { VitestRunner } from 'vitest/suite';
import { VitestTestRunner } from 'vitest/runners';
import { ENV_VAR } from './constants.ts';
import { V8CoverageCollector } from '@circleci/v8-coverage-collector';

interface CircleTaskMeta extends TaskMeta {
  coveredFiles?: string[];
  testKey?: string;
}

interface CircleRunnerTestCase extends RunnerTestCase {
  meta: CircleTaskMeta;
}

/**
 * A custom Vitest test runner that uses the V8 profiler to collect per-test
 * code coverage data for CircleCI's Smarter Testing.
 *
 * Enabled when the `CIRCLECI_COVERAGE` environment variable is set. When
 * active, it connects to the V8 inspector before tests run and collects
 * coverage after each test, attaching the covered file paths to the test's
 * metadata for the {@linkcode VitestCircleCICoverageReporter} to consume.
 */
export default class VitestCircleCICoverageRunner
  extends VitestTestRunner
  implements VitestRunner
{
  public config: SerializedConfig;
  private inspector: V8CoverageCollector;
  private initialized = false;
  private readonly enabled: boolean;
  private readonly cwd = process.cwd();

  constructor(config: SerializedConfig) {
    super(config);
    this.config = config;
    this.inspector = new V8CoverageCollector();
    this.enabled = process.env[ENV_VAR] !== undefined;
  }

  /**
   * Connects to the V8 inspector before test files are run.
   *
   * @param _files
   */
  async onBeforeRunFiles(_files: RunnerTestFile[]): Promise<void> {
    if (!this.enabled || this.initialized) return;

    await this.inspector.connect().then(() => {
      this.initialized = true;
    });
  }

  /**
   * Resets V8 coverage counters before each test so coverage is isolated per test.
   *
   * @param test
   */
  async onBeforeTryTask(test: RunnerTask): Promise<void> {
    super.onBeforeTryTask(test);
    if (!this.enabled) return;

    await this.inspector.resetCoverage();
  }

  /**
   * Collects V8 coverage after each test and attaches the covered file paths
   * and test key to the test's metadata.
   *
   * @param test
   */
  async onAfterTryTask(test: CircleRunnerTestCase): Promise<void> {
    super.onAfterTryTask(test);
    if (!this.enabled) return;

    await this.inspector
      .collectCoverage(this.cwd, test.file.filepath, test.name)
      .then((result) => {
        test.meta.testKey = result.testKey;
        test.meta.coveredFiles = result.coveredFiles;
      });
  }

  /**
   * Disconnects from the V8 inspector after all test files have been run.
   */
  async onAfterRunFiles(): Promise<void> {
    super.onAfterRunFiles();
    if (!this.initialized) return;

    await this.inspector.disconnect().then(() => {
      this.initialized = false;
    });
  }
}
