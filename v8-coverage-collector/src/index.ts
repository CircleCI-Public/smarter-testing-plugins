import inspector from 'node:inspector';
import { promisify } from 'node:util';
import { relative } from 'node:path';
import { fileURLToPath } from 'node:url';

interface V8ScriptCoverage {
  scriptId: string;
  url: string;
  functions: unknown[];
}

export interface TestCoverage {
  [testKey: string]: string[];
}

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

  async connect(): Promise<void> {
    this.session.connect();
    await this.enable();
    await this.startPreciseCoverage();
  }

  async disconnect(): Promise<void> {
    await this.stopPreciseCoverage();
    await this.disable();
    this.session.disconnect();
  }

  async resetCoverage(): Promise<void> {
    await this.takePreciseCoverage();
  }

  async collectCoverage(
    wd: string,
    testFile: string,
    testName: string,
  ): Promise<TestCoverage> {
    return this.takePreciseCoverage().then((result) => {
      const testKey = this.testKey(wd, testFile, testName);
      return {
        [testKey]: this.coveredFiles(wd, result),
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
