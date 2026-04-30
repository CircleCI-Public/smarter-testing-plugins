import { TestEnvironment } from 'jest-environment-node';
import { createJestCircleCICoverageEnvironment } from './coverage-environment.ts';

/**
 * Node {@link https://jestjs.io/docs/configuration#testenvironment-string test environment}
 * with per-test V8 coverage for CircleCI Smarter Testing when `CIRCLECI_COVERAGE` is set.
 */
export default createJestCircleCICoverageEnvironment(TestEnvironment);
