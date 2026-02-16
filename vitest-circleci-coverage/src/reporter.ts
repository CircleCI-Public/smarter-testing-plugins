import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type {
  TestCase,
  TestModule,
  TestRunEndReason,
  TestSpecification,
  Reporter,
} from 'vitest/node';
import type { SerializedError, TaskMeta } from 'vitest';
import { ENV_VAR } from './constants.ts';

interface CircleTaskMeta extends TaskMeta {
  coveredFiles?: string[];
  testKey?: string;
}

export interface VitestCircleCICoverageOutput {
  [sourceFile: string]: {
    [testKey: string]: number[];
  };
}

export default class VitestCircleCICoverageReporter implements Reporter {
  private output: VitestCircleCICoverageOutput = {};
  private readonly outputFile: string | undefined;

  constructor() {
    this.outputFile = process.env[ENV_VAR];
  }

  private get enabled(): boolean {
    return this.outputFile !== undefined;
  }

  onTestCaseResult(testCase: TestCase): void {
    if (!this.enabled) return;

    const meta: CircleTaskMeta = testCase.meta();
    if (!meta.coveredFiles || !meta.testKey) return;

    for (const path of meta.coveredFiles) {
      if (!this.output[path]) {
        this.output[path] = {};
      }

      if (!this.output[path][meta.testKey]) {
        // executed lines isn't supported, but the testsuite coverage
        // parser requires some lines executed to be accounted for.
        this.output[path][meta.testKey] = [1];
      }
    }
  }

  onTestRunStart(_specifications: readonly TestSpecification[]): void {
    process.stdout.write(
      'vitest-circleci-coverage: generating CircleCI coverage JSON...\n',
    );
  }

  onTestRunEnd(
    _testModules: ReadonlyArray<TestModule>,
    _unhandledErrors: ReadonlyArray<SerializedError>,
    _reason: TestRunEndReason,
  ): void {
    if (!this.enabled || !this.outputFile) return;

    const dir = dirname(this.outputFile);
    if (dir && dir !== '.') {
      mkdirSync(dir, { recursive: true });
    }

    if (Object.entries(this.output).length === 0) {
      process.stdout.write(
        `vitest-circleci-coverage: warning: no coverage data collected\n`,
      );
    }

    writeFileSync(this.outputFile, JSON.stringify(this.output));

    process.stdout.write(
      `vitest-circleci-coverage: wrote ${this.outputFile}\n`,
    );
  }
}
