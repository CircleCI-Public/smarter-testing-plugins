import {
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  mkdirSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { JestCircleCICoverageOutput } from './types.ts';
import { ENV_VAR, TMP_COVERAGE_DIR } from './constants.ts';
import type { Reporter } from '@jest/reporters';

export default class JestCircleCICoverageReporter implements Reporter {
  private readonly outputFile: string | undefined;

  constructor() {
    this.outputFile = process.env[ENV_VAR];
  }

  async onRunStart(): Promise<void> {
    if (!this.outputFile) return;

    if (!existsSync(TMP_COVERAGE_DIR)) return;

    process.stdout.write(
      'jest-circleci-coverage: generating CircleCI coverage JSON...\n',
    );
  }

  async onRunComplete(): Promise<void> {
    if (!this.outputFile) return;

    if (!existsSync(TMP_COVERAGE_DIR)) return;

    const coverageFiles = readdirSync(TMP_COVERAGE_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => resolve(TMP_COVERAGE_DIR, f));

    if (coverageFiles.length === 0) return;

    const merged: JestCircleCICoverageOutput = {};
    for (const coverageFile of coverageFiles) {
      const coverage: JestCircleCICoverageOutput = JSON.parse(
        readFileSync(coverageFile, 'utf-8'),
      );

      for (const [sourceFile, tests] of Object.entries(coverage)) {
        if (!merged[sourceFile]) {
          merged[sourceFile] = {};
        }
        for (const [testKey, lines] of Object.entries(tests)) {
          if (!merged[sourceFile][testKey]) {
            merged[sourceFile][testKey] = lines;
          }
        }
      }
    }

    rmSync(TMP_COVERAGE_DIR, { recursive: true });
    mkdirSync(dirname(this.outputFile), { recursive: true });
    writeFileSync(this.outputFile, JSON.stringify(merged));

    if (Object.entries(merged).length === 0) {
      process.stdout.write(
        `jest-circleci-coverage: warning: no coverage data collected\n`,
      );
    }

    process.stdout.write(`jest-circleci-coverage: wrote ${this.outputFile}\n`);
  }
}
