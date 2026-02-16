import path from 'node:path';
import fs from 'node:fs';
import { V8CoverageCollector } from '@circleci/v8-coverage-collector';

const ENV_VAR = 'CIRCLECI_COVERAGE';

interface TestCoverage {
  [testKey: string]: string[];
}

interface CircleCICoverageOutput {
  [sourceFile: string]: {
    [testKey: string]: number[];
  };
}

/**
 * mochaHooks is a MochaJS Root Hook Plugin that collects coverage
 * data per test, outputting CircleCI coverage JSON.
 */
export const mochaHooks = async (): Promise<Mocha.RootHookObject> => {
  const outputFile = process.env[ENV_VAR];
  if (!outputFile) {
    return {};
  }

  process.stdout.write(
    'mocha-circleci-coverage: generating CircleCI coverage JSON...\n',
  );

  const collector = new V8CoverageCollector();
  const testCoverageMap: TestCoverage = {};

  return {
    async beforeAll(): Promise<void> {
      await collector.connect();
    },

    async beforeEach(): Promise<void> {
      await collector.resetCoverage();
    },

    async afterEach(): Promise<void> {
      const test = (this as Mocha.Context).currentTest;
      if (!test || !test.file) return;

      await collector
        .collectCoverage(process.cwd(), test.file, test.title)
        .then((result) => {
          testCoverageMap[result.testKey] = result.coveredFiles;
        });
    },

    async afterAll(): Promise<void> {
      await collector.disconnect();

      const coverageMap: CircleCICoverageOutput = {};

      for (const [test, files] of Object.entries(testCoverageMap)) {
        for (const file of files) {
          if (!coverageMap[file]) {
            coverageMap[file] = {};
          }

          if (!coverageMap[file][test]) {
            coverageMap[file][test] = [1];
          }
        }
      }

      const dir = path.dirname(outputFile);
      if (dir && dir !== '.') {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(outputFile, JSON.stringify(coverageMap));

      if (Object.entries(coverageMap).length === 0) {
        process.stdout.write(
          `mocha-circleci-coverage: warning: no coverage data collected\n`,
        );
      }

      process.stdout.write(`mocha-circleci-coverage: wrote ${outputFile}\n`);
    },
  };
};

export default mochaHooks;
