import { basename, join } from 'node:path';
import { tmpdir } from 'node:os';

export const ENV_VAR = 'CIRCLECI_COVERAGE';
export const ENV_TMP_COVERAGE_DIR = 'TMP_COVERAGE_DIR';

export const TMP_COVERAGE_DIR =
  process.env[ENV_TMP_COVERAGE_DIR] ||
  join(tmpdir(), 'circleci-coverage', basename(process.cwd()));
