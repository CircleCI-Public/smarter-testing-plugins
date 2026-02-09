import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import type { VitestCircleCICoverageOutput } from '../src';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(__dirname, 'fixtures');
const outputDir = resolve(__dirname, 'output');
const runnerPath = resolve(__dirname, '../src/runner.ts');
const reporterPath = resolve(__dirname, '../src/reporter.ts');

function runVitest(env: Record<string, string | undefined> = {}): void {
  const configFile = resolve(outputDir, 'vitest.config.ts');
  const configContent = `
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    root: '${fixturesDir}',
    include: ['**/*.test.ts'],
    fileParallelism: false,
    isolate: false,
    disableConsoleIntercept: true,
    runner: '${runnerPath}',
    reporters: ['${reporterPath}'],
  },
})
`;
  writeFileSync(configFile, configContent);

  execSync(`npx vitest run --config="${configFile}"`, {
    cwd: fixturesDir,
    stdio: 'pipe',
    env: {
      ...process.env,
      ...env,
    },
  });
}

describe('circleci-coverage integration', () => {
  beforeEach(() => {
    if (existsSync(outputDir)) {
      rmSync(outputDir, { recursive: true });
    }
    mkdirSync(outputDir, { recursive: true });
  });

  afterAll(() => {
    if (existsSync(outputDir)) {
      rmSync(outputDir, { recursive: true });
    }
  });

  it('should produce the expected coverage map when enabled', () => {
    const outputFile = resolve(outputDir, 'coverage.json');
    runVitest({ CIRCLECI_COVERAGE: outputFile });

    expect(existsSync(outputFile)).toBe(true);
    const output: VitestCircleCICoverageOutput = JSON.parse(
      readFileSync(outputFile, 'utf-8'),
    );

    expect(output).toEqual({
      // The runner covers all tests because the runner code executes
      // the tests, and has to call the functions to capture coverage.
      // This doesn't happen with the installed plugin because files
      // in `node_modules` are omitted from results.
      '../../src/runner.ts': {
        'math.test.ts::should add two numbers|run': [1],
        'math.test.ts::should divide two numbers|run': [1],
        'math.test.ts::should multiply two numbers|run': [1],
        'math.test.ts::should subtract two numbers|run': [1],
        'math.test.ts::should throw on division by zero|run': [1],
        'math2.test.ts::should add and multiply two numbers|run': [1],
      },
      'math.ts': {
        'math.test.ts::should add two numbers|run': [1],
        'math.test.ts::should subtract two numbers|run': [1],
        'math.test.ts::should multiply two numbers|run': [1],
        'math.test.ts::should divide two numbers|run': [1],
        'math.test.ts::should throw on division by zero|run': [1],
        'math2.test.ts::should add and multiply two numbers|run': [1],
      },
      'math.test.ts': {
        'math.test.ts::should add two numbers|run': [1],
        'math.test.ts::should subtract two numbers|run': [1],
        'math.test.ts::should multiply two numbers|run': [1],
        'math.test.ts::should divide two numbers|run': [1],
        'math.test.ts::should throw on division by zero|run': [1],
      },
      'math2.test.ts': {
        'math2.test.ts::should add and multiply two numbers|run': [1],
      },
    });
  });

  it('should not produce output or capture coverage when disabled', () => {
    runVitest({ CIRCLECI_COVERAGE: undefined });

    const files = existsSync(outputDir) ? readdirSync(outputDir) : [];
    const jsonFiles = files.filter((f) => f.endsWith('.json'));
    expect(jsonFiles).toEqual([]);
  });
});
