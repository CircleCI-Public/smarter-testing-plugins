/**
 * A Cypress plugin that generates coverage data for
 * CircleCI's [Smarter Testing](https://circleci.com/docs/guides/test/smarter-testing/).
 *
 * @example
 * ```ts
 * // cypress.config.ts
 * import { defineConfig } from 'cypress';
 * import cypressCircleCICoverage from '@circleci/cypress-circleci-coverage/plugin';
 *
 * export default defineConfig({
 *   e2e: {
 *     setupNodeEvents(on, config) {
 *       const webpackOptions = {
 *         module: {
 *           rules: [
 *             {
 *               test: /\.ts$/,
 *               exclude: /node_modules/,
 *               use: {
 *                 // instrument files with the istanbul plugin.
 *                 loader: 'babel-loader',
 *                 options: {
 *                   presets: ['@babel/preset-typescript'],
 *                   plugins: [['istanbul']],
 *                 },
 *               },
 *             },
 *           ],
 *         },
 *       };
 *
 *       on('file:preprocessor', webpackPreprocessor({ webpackOptions }));
 *
 *       return cypressCircleCICoverage(on, config);
 *     },
 *   },
 * });
 * ```
 *
 * @example
 * ```ts
 * // cypress/support/e2e.ts
 * import '@circleci/cypress-circleci-coverage/support';
 * ```
 *
 * @example
 * ```bash
 * CIRCLECI_COVERAGE=coverage.json cypress run
 * ```
 *
 * @module
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, relative } from 'node:path';
import { ENV_VAR } from './constants.ts';

interface CoveragePayload {
  coveredFiles: string[];
  title: string;
  specPath: string;
}

/**
 * The coverage output format mapping files to their test coverage data.
 *
 * Keys are file paths, and values are objects mapping test keys to
 * arrays of executed line numbers.
 */
interface CypressCircleCICoverageOutput {
  [sourceFile: string]: {
    [testKey: string]: number[];
  };
}

/**
 * A Cypress plugin that collects Istanbul code coverage from the browser
 * per test for CircleCI's Smarter Testing.
 *
 * Requires that the code under test is instrumented with Istanbul
 * (e.g. via `babel-plugin-istanbul` in a webpack preprocessor).
 *
 * Enabled when the `CIRCLECI_COVERAGE` environment variable is set. When
 * active, it registers a task to receive coverage data from the browser
 * support file, and writes the results as JSON after all specs complete.
 */
export default function cypressCircleCICoverage(
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions,
): Cypress.PluginConfigOptions {
  const outputFile = process.env[ENV_VAR];

  // disabled when the output file isn't set.
  if (outputFile === undefined) return config;
  config.expose.circleciCoverageEnabled = true;

  process.stdout.write(
    'cypress-circleci-coverage: generating CircleCI coverage JSON...\n',
  );

  const cwd = process.cwd();
  const allCoverage: CoveragePayload[] = [];

  on('task', {
    'circleci:coverage:collect'(payload: CoveragePayload) {
      allCoverage.push(payload);
      return null;
    },
  });

  on('after:run', () => {
    if (!outputFile) return;

    const output: CypressCircleCICoverageOutput = {};

    for (const { coveredFiles, title, specPath } of allCoverage) {
      const testKey = `${specPath}::${title}|run`;

      for (const absolutePath of coveredFiles) {
        const filePath = relative(cwd, absolutePath);

        if (filePath.includes('node_modules')) {
          continue;
        }

        if (!output[filePath]) {
          output[filePath] = {};
        }

        if (!output[filePath][testKey]) {
          // executed lines isn't supported, but the testsuite coverage
          // parser requires some lines executed to be accounted for.
          output[filePath][testKey] = [1];
        }
      }
    }

    const dir = dirname(outputFile);
    if (dir && dir !== '.') {
      mkdirSync(dir, { recursive: true });
    }

    if (Object.entries(output).length === 0) {
      process.stdout.write(
        'cypress-circleci-coverage: warning: no coverage data collected\n',
      );
    }

    writeFileSync(outputFile, JSON.stringify(output));

    process.stdout.write(`cypress-circleci-coverage: wrote ${outputFile}\n`);
  });

  return config;
}
