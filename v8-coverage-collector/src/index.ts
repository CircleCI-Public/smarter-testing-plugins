/**
 * This module contains the CircleCI v8 coverage collector, used to gather
 * coverage data for CircleCI's Smarter Testing JavaScript plugins.
 *
 * The coverage collector can be used to collect precise coverage during the
 * test run lifecycles.
 *
 * @example
 * ```ts
 * import { V8CoverageCollector } from '@circleci/v8-coverage-collector';
 *
 * export default class TestHookExample {
 *   private inspector: V8CoverageCollector;
 *
 *   constructor() {
 *     this.inspector = new V8CoverageCollector();
 *   }
 *
 *   async onBeforeAll(): Promise<void> {
 *     await this.inspector.connect()
 *   }
 *
 *   async onBeforeTest(): Promise<void> {
 *     await this.inspector.resetCoverage();
 *   }
 *
 *   async onAfterTest(test: ExampleTest): Promise<void> {
 *     await this.inspector
 *       .collectCoverage(process.cwd(), test.file, test.name)
 *       .then((result) => {
 *         test.meta.testKey = result.testKey;
 *         test.meta.coveredFiles = result.coveredFiles;
 *       });
 *   }
 *
 *   async onAfterAll(): Promise<void> {
 *     await this.inspector.disconnect()
 *   }
 * }
 * ```
 *
 * @module
 */

import inspector from 'node:inspector';
import { promisify } from 'node:util';
import { relative } from 'node:path';
import { fileURLToPath } from 'node:url';

interface V8ScriptCoverage {
  scriptId: string;
  url: string;
  functions: unknown[];
}

/**
 * TestCoverage is the response from {@link collectCoverage}
 * for a given test file and name.
 */
export interface TestCoverage {
  /**
   * testKey is unique identifier for a given test.
   *
   * @example `{test file}::{test name}|{phase}`
   *
   * */
  testKey: string;
  /**
   * coveredFiles is a list of found covered files, relative
   * to the given working directory.
   */
  coveredFiles: string[];
}

/**
 * V8CoverageCollector provides APIs for collecting coverage using the
 * v8 Profile APIs.
 */
export class V8CoverageCollector {
  private readonly session: inspector.Session;
  private readonly post: (method: string, params?: object) => Promise<unknown>;

  constructor() {
    this.session = new inspector.Session();
    this.post = promisify(this.session.post.bind(this.session)) as (
      method: string,
      params?: object,
    ) => Promise<unknown>;
  }

  /**
   * connect connects and enables the v8 Profiler APIs.
   *
   * @returns {Promise<void>}
   */
  async connect(): Promise<void> {
    this.session.connect();
    await this.enable();
    await this.startPreciseCoverage();
  }

  /**
   * disconnect disconnects and disables the v8 Profiler APIs.
   *
   * @returns {Promise<void>}
   */
  async disconnect(): Promise<void> {
    await this.stopPreciseCoverage();
    await this.disable();
    this.session.disconnect();
  }

  /**
   * resetCoverage resets the execution counts of the coverage.
   *
   * @returns {Promise<void>}
   */
  async resetCoverage(): Promise<void> {
    await this.takePreciseCoverage();
  }

  /**
   * collectCoverage collects coverage data since the last time
   * {@link resetCoverage} was called.
   *
   * @param {string} wd
   * @param {string} testFile
   * @param {string} testName
   * @returns {Promise<TestCoverage>}
   */
  async collectCoverage(
    wd: string,
    testFile: string,
    testName: string,
  ): Promise<TestCoverage> {
    return this.takePreciseCoverage().then((result) => {
      const testKey = this.testKey(wd, testFile, testName);
      return {
        testKey: testKey,
        coveredFiles: this.coveredFiles(wd, result),
      };
    });
  }

  private testKey(wd: string, testFile: string, testName: string): string {
    return `${relative(wd, testFile)}::${testName}|run`;
  }

  private coveredFiles(wd: string, result: V8ScriptCoverage[]): string[] {
    return result
      .map((s) => s.url)
      .filter((s) => {
        const url = URL.canParse(s) && new URL(s);
        return (
          url &&
          url.protocol === 'file:' &&
          !url.pathname.includes('node_modules')
        );
      })
      .map((url) => relative(wd, fileURLToPath(url)));
  }

  private async enable(): Promise<void> {
    await this.post('Profiler.enable');
  }

  private async disable(): Promise<void> {
    await this.post('Profiler.disable');
  }

  private async startPreciseCoverage(): Promise<void> {
    await this.post('Profiler.startPreciseCoverage', {
      callCount: true,
      detailed: false,
    });
  }

  private async stopPreciseCoverage(): Promise<void> {
    await this.post('Profiler.stopPreciseCoverage');
  }

  private async takePreciseCoverage(): Promise<V8ScriptCoverage[]> {
    const result = (await this.post('Profiler.takePreciseCoverage')) as {
      result: V8ScriptCoverage[];
    };
    return result.result;
  }
}
