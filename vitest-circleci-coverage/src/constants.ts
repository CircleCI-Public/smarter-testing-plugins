export const ENV_VAR = 'CIRCLECI_COVERAGE';
export const COVERAGE_ENABLED_KEY = 'circleciCoverageEnabled';

declare module 'vitest' {
  export interface ProvidedContext {
    [COVERAGE_ENABLED_KEY]: boolean;
  }

  export interface TaskMeta {
    coveredUrls?: string[];
  }
}
