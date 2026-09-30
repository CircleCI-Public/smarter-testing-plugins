/**
 * Vitest reporter that writes per-test coverage data as JSON for
 * CircleCI's Smarter Testing.
 *
 * @module
 */

import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import type {
  TestCase,
  TestModule,
  TestRunEndReason,
  TestSpecification,
  Reporter,
  Vitest,
} from 'vitest/node';
import type { SerializedError, TaskMeta } from 'vitest';
import { ENV_VAR, COVERAGE_ENABLED_KEY } from './constants.ts';

interface CircleTaskMeta extends TaskMeta {
  coveredFiles?: string[];
  testKey?: string;
}

/**
 * The coverage output format mapping files to their test coverage data.
 *
 * Keys are file paths, and values are objects mapping test keys to `true`.
 */
export interface VitestCircleCICoverageOutput {
  [sourceFile: string]: {
    [testKey: string]: true;
  };
}

/**
 * A Vitest {@linkcode Reporter} that collects per-test file coverage metadata
 * from the {@linkcode VitestCircleCICoverageRunner} and writes it as JSON
 * for CircleCI's Smarter Testing.
 *
 * Enabled when the `CIRCLECI_COVERAGE` environment variable is set to an
 * output file path.
 */
export default class VitestCircleCICoverageReporter implements Reporter {
  private output: VitestCircleCICoverageOutput = {};
  private readonly outputFile: string | undefined;
  private readonly cwd = process.cwd();
  private readonly resolvedUrls = new Map<string, string | undefined>();

  constructor() {
    this.outputFile = process.env[ENV_VAR];
  }

  private get enabled(): boolean {
    return this.outputFile !== undefined;
  }

  /**
   * Called when Vitest is initialised to check if coverage is enabled.
   *
   * @param vitest
   */
  onInit(vitest: Vitest): void {
    for (const project of vitest.projects) {
      project.provide(COVERAGE_ENABLED_KEY, this.enabled);
    }
  }

  /**
   * Called after each test case completes. Records which source files were
   * covered by the test using metadata set by the {@linkcode VitestCircleCICoverageRunner}.
   *
   * @param testCase
   */
  onTestCaseResult(testCase: TestCase): void {
    if (!this.enabled) return;

    const meta: CircleTaskMeta = testCase.meta();
    if (meta.coveredUrls) {
      meta.testKey = `${relative(this.cwd, testCase.module.moduleId)}!!${testCase.name}|run`;
      meta.coveredFiles = this.resolveBrowserUrls(
        testCase.project.config.root,
        meta.coveredUrls,
      );
    }
    if (!meta.coveredFiles || !meta.testKey) return;

    for (const path of meta.coveredFiles) {
      if (!this.output[path]) {
        this.output[path] = {};
      }

      this.output[path][meta.testKey] = true;
    }
  }

  /**
   * Transforms script URLs in browser mode to source files relative
   * to the cwd.
   *
   * @param root
   * @param urls
   */
  private resolveBrowserUrls(root: string, urls: string[]): string[] {
    const files = new Set<string>();
    for (const url of urls) {
      if (!this.resolvedUrls.has(url)) {
        this.resolvedUrls.set(url, this.resolveBrowserUrl(root, url));
      }
      const file = this.resolvedUrls.get(url);
      if (file) files.add(file);
    }
    return [...files];
  }

  private resolveBrowserUrl(root: string, url: string): string | undefined {
    if (!URL.canParse(url)) return undefined;

    const path = decodeURIComponent(new URL(url).pathname).replace(
      /^\/@fs\//,
      '/',
    );
    if (path.includes('node_modules')) return undefined;

    const file = [path, join(root, path)].find((p) =>
      statSync(p, { throwIfNoEntry: false })?.isFile(),
    );
    return file && relative(this.cwd, file);
  }

  /**
   * Called when the test run starts. Logs a message indicating coverage collection is active.
   *
   * @param _specifications
   */
  onTestRunStart(_specifications: readonly TestSpecification[]): void {
    if (!this.enabled || !this.outputFile) return;

    process.stdout.write(
      'vitest-circleci-coverage: generating CircleCI coverage JSON...\n',
    );
  }

  /**
   * Called when the test run ends. Writes the collected coverage data as JSON
   * to the file specified by `CIRCLECI_COVERAGE` when enabled.
   *
   * @param _testModules
   * @param _unhandledErrors
   * @param _reason
   */
  onTestRunEnd(
    _testModules: ReadonlyArray<TestModule>,
    _unhandledErrors: ReadonlyArray<SerializedError>,
    _reason: TestRunEndReason,
  ): void {
    if (!this.enabled || !this.outputFile) return;

    const dir = dirname(this.outputFile);
    if (dir && dir !== '.') {
      mkdirSync(dir, { recursive: true });
    }

    if (Object.entries(this.output).length === 0) {
      process.stdout.write(
        `vitest-circleci-coverage: warning: no coverage data collected\n`,
      );
    }

    writeFileSync(this.outputFile, JSON.stringify(this.output));

    process.stdout.write(
      `vitest-circleci-coverage: wrote ${this.outputFile}\n`,
    );
  }
}
