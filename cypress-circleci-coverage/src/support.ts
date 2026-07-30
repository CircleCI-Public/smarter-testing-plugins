/**
 * Cypress support file that collects per-test Istanbul code coverage
 * from the browser and sends it to the Node process via `cy.task()`.
 *
 * Import this file in your Cypress support file:
 *
 * ```ts
 * // cypress/support/e2e.ts
 * import '@circleci/cypress-circleci-coverage/support';
 * ```
 *
 * @module
 */

/**
 * Istanbul covered statements, functions and branches.
 */
interface IstanbulFileCoverage {
  s: Record<string, number>;
  f: Record<string, number>;
  b: Record<string, number[]>;
}

type IstanbulCoverageMap = Record<string, IstanbulFileCoverage>;

interface CoveragePayload {
  coveredFiles: string[];
  title: string;
  specPath: string;
}

interface Win {
  __coverage__?: IstanbulCoverageMap;
  __circleci_coverage__?: IstanbulCoverageMap;
}

beforeEach(() => {
  if (!Cypress.expose('circleciCoverageEnabled')) {
    return;
  }

  const win = globalThis as unknown as Win;
  if (!win.__coverage__) return;

  win.__circleci_coverage__ = structuredClone(win.__coverage__);
});

afterEach(() => {
  if (!Cypress.expose('circleciCoverageEnabled')) {
    return;
  }

  const win = globalThis as unknown as Win;
  if (!win.__coverage__ || !win.__circleci_coverage__) return;

  const coveredFiles: string[] = [];
  for (const [filePath, fileCoverage] of Object.entries(win.__coverage__)) {
    const baseline = win.__circleci_coverage__[filePath];
    const hasCoverage = Object.entries(fileCoverage.s).some(([key, val]) => {
      const baseCount = baseline?.s[key] ?? 0;
      return val > baseCount;
    });
    if (hasCoverage) {
      coveredFiles.push(filePath);
    }
  }

  // Reset the circleci coverage.
  win.__circleci_coverage__ = undefined;

  const payload: CoveragePayload = {
    coveredFiles,
    title: Cypress.currentTest.title,
    specPath: Cypress.spec.relative,
  };

  cy.task('circleci:coverage:collect', payload, { log: false });
});
