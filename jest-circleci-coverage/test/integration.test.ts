import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const fixturesDir = resolve(__dirname, 'fixtures');
const outputDir = resolve(__dirname, 'output');
const reporterPath = resolve(projectRoot, 'dist/reporter.js');
const coverageEnvironmentAdapter = resolve(
  __dirname,
  'adapters/coverage-environment.mjs',
);

const jestMatrix = ['28', '29', '30'] as const;
type JestMajor = (typeof jestMatrix)[number];

interface JestInstall {
  version: JestMajor;
  bin: string;
  nodeEnvironmentPackage: string;
  jsdomEnvironmentPackage: string;
}

function getJestInstall(version: JestMajor): JestInstall {
  return {
    version,
    bin: resolve(projectRoot, `node_modules/jest-${version}/bin/jest.js`),
    nodeEnvironmentPackage: `jest-environment-node-${version}`,
    jsdomEnvironmentPackage: `jest-environment-jsdom-${version}`,
  };
}

function runJest(
  install: JestInstall,
  env: Record<string, string | undefined> = {},
): void {
  const configFile = resolve(outputDir, `jest-${install.version}.config.cjs`);

  const configContent = `
const { createDefaultEsmPreset } = require('ts-jest');
const { transform, extensionsToTreatAsEsm } = createDefaultEsmPreset();

/** @type {import('jest').Config} */
const config = {
  verbose: true,
  rootDir: '${fixturesDir}',
  testEnvironment: '${coverageEnvironmentAdapter}',
  reporters: ['default', '${reporterPath}'],
  extensionsToTreatAsEsm,
  transform,
};

module.exports = config;
`;
  writeFileSync(configFile, configContent);

  execSync(
    `node "${install.bin}" --config="${configFile}" --no-cache --silent=false --useStderr`,
    {
      cwd: projectRoot,
      stdio: 'pipe',
      env: {
        ...process.env,
        ...env,
        JEST_ENV_PACKAGE: install.nodeEnvironmentPackage,
        NODE_OPTIONS: '--experimental-vm-modules',
      },
    },
  );
}

describe.each(jestMatrix)(
  'circleci-coverage integration (jest %s)',
  (version) => {
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
      const install = getJestInstall(version);
      const outputFile = resolve(outputDir, `coverage-jest-${version}.json`);
      const tmpCoverageDir = join(outputDir, `coverage-jest-${version}`);
      runJest(install, {
        CIRCLECI_COVERAGE: outputFile,
        TMP_COVERAGE_DIR: tmpCoverageDir,
      });

      expect(existsSync(outputFile)).toBe(true);
      const output = JSON.parse(readFileSync(outputFile, 'utf-8'));

      expect(output).toEqual({
        // The runner covers all tests because the runner code executes
        // the tests, and has to call the functions to capture coverage.
        // This doesn't happen with the installed plugin because files
        // in `node_modules` are omitted from results.
        'dist/coverage-environment.js': {
          'test/fixtures/math.test.ts!!should add two numbers|run': [1],
          'test/fixtures/math.test.ts!!should divide two numbers|run': [1],
          'test/fixtures/math.test.ts!!should multiply two numbers|run': [1],
          'test/fixtures/math.test.ts!!should subtract two numbers|run': [1],
          'test/fixtures/math.test.ts!!should throw on division by zero|run': [
            1,
          ],
          'test/fixtures/math2.test.ts!!should add and multiply two numbers|run':
            [1],
        },
        'test/fixtures/math.ts': {
          'test/fixtures/math.test.ts!!should add two numbers|run': [1],
          'test/fixtures/math.test.ts!!should subtract two numbers|run': [1],
          'test/fixtures/math.test.ts!!should multiply two numbers|run': [1],
          'test/fixtures/math.test.ts!!should divide two numbers|run': [1],
          'test/fixtures/math.test.ts!!should throw on division by zero|run': [
            1,
          ],
          'test/fixtures/math2.test.ts!!should add and multiply two numbers|run':
            [1],
        },
        'test/fixtures/math.test.ts': {
          'test/fixtures/math.test.ts!!should add two numbers|run': [1],
          'test/fixtures/math.test.ts!!should subtract two numbers|run': [1],
          'test/fixtures/math.test.ts!!should multiply two numbers|run': [1],
          'test/fixtures/math.test.ts!!should divide two numbers|run': [1],
          'test/fixtures/math.test.ts!!should throw on division by zero|run': [
            1,
          ],
        },
        'test/fixtures/math2.test.ts': {
          'test/fixtures/math2.test.ts!!should add and multiply two numbers|run':
            [1],
        },
      });
    });

    it('should not produce output or capture coverage when disabled', () => {
      runJest(getJestInstall(version), { CIRCLECI_COVERAGE: undefined });

      const files = existsSync(outputDir) ? readdirSync(outputDir) : [];
      const jsonFiles = files.filter((f) => f.endsWith('.json'));
      expect(jsonFiles).toEqual([]);
    });
  },
);

const browserFixturesDir = resolve(__dirname, 'fixtures-browser');

function runJestJSDOM(
  install: JestInstall,
  env: Record<string, string | undefined> = {},
): void {
  const configFile = resolve(
    outputDir,
    `jest-${install.version}.jsdom.config.cjs`,
  );

  const configContent = `
const { createDefaultEsmPreset } = require('ts-jest');
const { transform, extensionsToTreatAsEsm } = createDefaultEsmPreset();

/** @type {import('jest').Config} */
const config = {
verbose: true,
rootDir: '${browserFixturesDir}',
testEnvironment: '${coverageEnvironmentAdapter}',
reporters: ['default', '${reporterPath}'],
setupFilesAfterEnv: ['@testing-library/jest-dom'],
extensionsToTreatAsEsm,
transform,
};

module.exports = config;
`;
  writeFileSync(configFile, configContent);

  execSync(
    `node "${install.bin}" --config="${configFile}" --no-cache --silent=false --useStderr`,
    {
      cwd: projectRoot,
      stdio: 'pipe',
      env: {
        ...process.env,
        ...env,
        JEST_ENV_PACKAGE: install.jsdomEnvironmentPackage,
        NODE_OPTIONS: '--experimental-vm-modules',
      },
    },
  );
}

describe.each(jestMatrix)(
  'circleci-coverage integration (jsdom, jest %s)',
  (version) => {
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

    it('should produce coverage output when enabled', () => {
      const install = getJestInstall(version);
      const outputFile = resolve(
        outputDir,
        `coverage-jsdom-jest-${version}.json`,
      );
      const tmpCoverageDir = join(outputDir, `coverage-jsdom-jest-${version}`);
      runJestJSDOM(install, {
        CIRCLECI_COVERAGE: outputFile,
        TMP_COVERAGE_DIR: tmpCoverageDir,
      });

      expect(existsSync(outputFile)).toBe(true);
      const output = JSON.parse(readFileSync(outputFile, 'utf-8'));

      expect(output).toEqual({
        'dist/coverage-environment.js': {
          'test/fixtures-browser/counter.test.ts!!increments when clicked|run':
            [1],
          'test/fixtures-browser/counter2.test.ts!!increments twice when clicked twice|run':
            [1],
        },
        'test/fixtures-browser/counter.test.ts': {
          'test/fixtures-browser/counter.test.ts!!increments when clicked|run':
            [1],
        },
        'test/fixtures-browser/counter2.test.ts': {
          'test/fixtures-browser/counter2.test.ts!!increments twice when clicked twice|run':
            [1],
        },
        'test/fixtures-browser/counter.ts': {
          'test/fixtures-browser/counter.test.ts!!increments when clicked|run':
            [1],
          'test/fixtures-browser/counter2.test.ts!!increments twice when clicked twice|run':
            [1],
        },
      });
    });

    it('should not produce output or capture coverage when disabled', () => {
      runJestJSDOM(getJestInstall(version), {
        CIRCLECI_COVERAGE: undefined,
      });

      const files = existsSync(outputDir) ? readdirSync(outputDir) : [];
      const jsonFiles = files.filter((f) => f.endsWith('.json'));
      expect(jsonFiles).toEqual([]);
    });
  },
);
