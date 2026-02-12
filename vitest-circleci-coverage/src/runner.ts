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

  async onBeforeRunFiles(_files: RunnerTestFile[]): Promise<void> {
    if (!this.enabled || this.initialized) return;

    await this.inspector.connect().then(() => {
      this.initialized = true;
    });
  }

  async onBeforeTryTask(test: RunnerTask): Promise<void> {
    super.onBeforeTryTask(test);
    if (!this.enabled) return;

    await this.inspector.resetCoverage();
  }

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

  async onAfterRunFiles(): Promise<void> {
    super.onAfterRunFiles();
    if (!this.initialized) return;

    await this.inspector.disconnect().then(() => {
      this.initialized = false;
    });
  }
}
