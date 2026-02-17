/**
 * A Vitest plugin that generates coverage data for
 * CircleCI's [Smarter Testing](https://circleci.com/docs/guides/test/smarter-testing/).
 *
 * @example
 * ```ts
 * // vitest.config.ts
 * import { defineConfig } from 'vitest/config';
 *
 * export default defineConfig({
 *   test: {
 *     runner: '@circleci/vitest-circleci-coverage/runner',
 *     reporters: ['@circleci/vitest-circleci-coverage/reporter'],
 *   },
 * });
 * ```
 *
 * @example
 * ```shell
 * CIRCLECI_COVERAGE=coverage.json jest
 * ```
 *
 * @module
 */

export { default as VitestCircleCICoverageRunner } from './runner.ts';

export { default as VitestCircleCICoverageReporter } from './reporter.ts';
export type { VitestCircleCICoverageOutput } from './reporter.ts';
