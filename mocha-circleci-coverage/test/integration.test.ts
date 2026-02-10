import assert from 'node:assert';
import { execSync } from 'node:child_process';
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

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(__dirname, 'fixtures');
const outputDir = resolve(__dirname, 'output');
const pluginPath = resolve(__dirname, '..', 'src', 'index.ts');

function runMocha(env: Record<string, string | undefined> = {}): void {
  const configFile = resolve(outputDir, '.mocharc.cjs');
  const configContent = `
module.exports = {
  require: ['tsx/cjs', '${pluginPath}']
};
`;
  writeFileSync(configFile, configContent);

  execSync(`npx mocha --config "${configFile}" "*.test.ts"`, {
    cwd: fixturesDir,
    stdio: 'pipe',
    env: {
      ...process.env,
      ...env,
    },
  });
}

describe('mocha-circleci-coverage integration', () => {
  beforeEach(() => {
    if (existsSync(outputDir)) {
      rmSync(outputDir, { recursive: true });
    }
    mkdirSync(outputDir, { recursive: true });
  });

  after(() => {
    if (existsSync(outputDir)) {
      rmSync(outputDir, { recursive: true });
    }
  });

  it('should produce the expected coverage map when enabled', () => {
    const outputFile = resolve(outputDir, 'coverage.json');
    runMocha({ CIRCLECI_COVERAGE: outputFile });

    assert.ok(existsSync(outputFile));
    const output = JSON.parse(readFileSync(outputFile, 'utf-8'));

    assert.deepStrictEqual(output, {
      '../../src/index.ts': {
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
      'math.ts': {
        'math.test.ts::should add two numbers|run': [1],
        'math.test.ts::should subtract two numbers|run': [1],
        'math.test.ts::should multiply two numbers|run': [1],
        'math.test.ts::should divide two numbers|run': [1],
        'math.test.ts::should throw on division by zero|run': [1],
        'math2.test.ts::should add and multiply two numbers|run': [1],
      },
      'math2.test.ts': {
        'math2.test.ts::should add and multiply two numbers|run': [1],
      },
    });
  });

  it('should not produce output or capture coverage when disabled', () => {
    runMocha({ CIRCLECI_COVERAGE: undefined });

    const files = existsSync(outputDir) ? readdirSync(outputDir) : [];
    const jsonFiles = files.filter((f) => f.endsWith('.json'));
    assert.deepStrictEqual(jsonFiles, []);
  });
});
