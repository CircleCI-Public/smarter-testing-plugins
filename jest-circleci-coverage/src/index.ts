/**
 * A Jest plugin that generates coverage data for
 * [CircleCI Smarter Testing](https://circleci.com/docs/guides/test/smarter-testing/).
 *
 * It uses the V8 JS engine Profiler APIs to collect per-test file coverage
 * and outputs a JSON file that CircleCI can consume.
 *
 * @example Configure Jest to use the environment and reporter:
 * ```ts
 * // jest.config.ts
 * const config = {
 *   testEnvironment: '@circleci/jest-circleci-coverage/environment',
 *   reporters: ['default', '@circleci/jest-circleci-coverage/reporter'],
 * };
 *
 * export default config;
 * ```
 *
 * @example
 * ```ts
 * CIRCLECI_COVERAGE=coverage.json jest
 * ```
 *
 * @module
 */

export { default as JestCircleCICoverageEnvironment } from './environment.ts';
export { default as JestCircleCICoverageReporter } from './reporter.js';
export type { JestCircleCICoverageOutput } from './types.ts';
