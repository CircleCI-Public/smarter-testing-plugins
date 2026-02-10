import type {
  RunnerTask,
  RunnerTestCase,
  SerializedConfig,
  RunnerTestFile,
} from 'vitest';
import type { VitestRunner } from 'vitest/suite';
import { VitestTestRunner } from 'vitest/runners';
import inspector from 'node:inspector';
import { promisify } from 'node:util';
import { relative } from 'node:path';
import { fileURLToPath } from 'url';
import { ENV_VAR } from './constants.ts';

interface V8ScriptCoverage {
  scriptId: string;
  url: string;
  functions: unknown[];
}

class InspectorSession {
  private readonly session: inspector.Session;
  private readonly post: (method: string, params?: object) => Promise<unknown>;

  constructor() {
    this.session = new inspector.Session();
    this.post = promisify(this.session.post.bind(this.session)) as (
      method: string,
      params?: object,
    ) => Promise<unknown>;
  }

  connect(): void {
    this.session.connect();
  }

  disconnect(): void {
    this.session.disconnect();
  }

  async enable(): Promise<void> {
    await this.post('Profiler.enable');
  }

  async disable(): Promise<void> {
    await this.post('Profiler.disable');
  }

  async startPreciseCoverage(): Promise<void> {
    await this.post('Profiler.startPreciseCoverage', {
      callCount: true,
      detailed: false,
    });
  }

  async stopPreciseCoverage(): Promise<void> {
    await this.post('Profiler.stopPreciseCoverage');
  }

  async takePreciseCoverage(): Promise<V8ScriptCoverage[]> {
    const result = (await this.post('Profiler.takePreciseCoverage')) as {
      result: V8ScriptCoverage[];
    };
    return result.result;
  }
}

export default class VitestCircleCICoverageRunner
  extends VitestTestRunner
  implements VitestRunner
{
  public config: SerializedConfig;
  private inspector: InspectorSession;
  private initialized = false;
  private readonly enabled: boolean;
  private readonly cwd = process.cwd();

  constructor(config: SerializedConfig) {
    super(config);
    this.config = config;
    this.inspector = new InspectorSession();
    this.enabled = process.env[ENV_VAR] !== undefined;
  }

  async onBeforeRunFiles(_files: RunnerTestFile[]): Promise<void> {
    if (!this.enabled || this.initialized) return;

    await this.enable().then(() => {
      this.initialized = true;
    });
  }

  async onBeforeTryTask(test: RunnerTask): Promise<void> {
    super.onBeforeTryTask(test);
    if (!this.enabled) return;

    await this.captureCoverage();
  }

  async onAfterTryTask(test: RunnerTestCase): Promise<void> {
    super.onAfterTryTask(test);
    if (!this.enabled) return;

    await this.captureCoverage().then((result) => {
      test.meta.testKey = this.testKey(test);
      test.meta.coveredFiles = this.coveredFiles(result);
    });
  }

  async onAfterRunFiles(): Promise<void> {
    super.onAfterRunFiles();
    if (!this.initialized) return;

    await this.cleanup().then(() => {
      this.initialized = false;
    });
  }

  private testKey(test: RunnerTask): string {
    const testFile = relative(this.cwd, test.file.filepath);
    const testName = test.name;

    return `${testFile}::${testName}|run`;
  }

  private coveredFiles(result: V8ScriptCoverage[]): string[] {
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
      .map((url) => relative(this.cwd, fileURLToPath(url)));
  }

  private async enable() {
    this.inspector.connect();
    await this.inspector.enable();
    await this.inspector.startPreciseCoverage();
  }

  private async cleanup() {
    await this.inspector.stopPreciseCoverage();
    await this.inspector.disable();
    this.inspector.disconnect();
  }

  private async captureCoverage(): Promise<V8ScriptCoverage[]> {
    return await this.inspector.takePreciseCoverage();
  }
}
