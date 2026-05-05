import { TestEnvironment } from 'jest-environment-jsdom';
import { createJestCircleCICoverageEnvironment } from './coverage-environment.ts';

/**
 * JSDOM {@link https://jestjs.io/docs/configuration#testenvironment-string test environment}
 * with per-test V8 coverage for CircleCI Smarter Testing when `CIRCLECI_COVERAGE` is set.
 */
export default createJestCircleCICoverageEnvironment(TestEnvironment);
