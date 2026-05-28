import { createRequire } from 'node:module';
import { createJestCircleCICoverageEnvironment } from '../../dist/coverage-environment.js';

// The integration tests run Jest against multiple aliased installs
// (`jest-environment-node-28`, `-29`, `-30`, and the jsdom equivalents).
// The underlying environment package name is selected per run via this
// env var so a single committed adapter covers the whole matrix.
const environmentPackage = process.env.JEST_ENV_PACKAGE;
if (!environmentPackage) {
  throw new Error(
    'JEST_ENV_PACKAGE must be set to a jest-environment-{node,jsdom}-* package name',
  );
}

const require = createRequire(import.meta.url);
const { TestEnvironment } = require(environmentPackage);

export default createJestCircleCICoverageEnvironment(TestEnvironment);
