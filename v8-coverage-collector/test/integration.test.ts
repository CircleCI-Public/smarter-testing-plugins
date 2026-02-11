import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { V8CoverageCollector } from '../src/index.ts';
import * as process from 'node:process';
import { add } from './fixtures/math.ts';

describe('circleci-coverage integration', () => {
  const coll = new V8CoverageCollector();
  const wd = process.cwd();

  beforeEach(async () => {
    await coll.connect();
  });

  afterEach(async () => {
    await coll.disconnect();
  });

  it('should produce the expected coverage map when enabled', async () => {
    await coll.resetCoverage();
    const result = await coll.collectCoverage(wd, 'foo.ts', 'foo');
    // Any code executed between resetting coverage and collecting coverage will be covered.
    // In this test, we need to execute code in the v8 collector to read coverage from the v8 Profiler APIs,
    // that code in the v8 collector is therefore covered when it was invoked. Likewise, we execute some code
    // to assign to variables in between the calls, resulting in this test also being covered.
    expect(result).toStrictEqual({
      testKey: 'foo.ts::foo|run',
      coveredFiles: ['test/integration.test.ts', 'src/index.ts'],
    });
  });

  it('should produce coverage for another test function', async () => {
    await coll.resetCoverage();
    // fixtures/math.ts
    add(1, 2);
    const result = await coll.collectCoverage(wd, 'foo.ts', 'foo');
    expect(result).toStrictEqual({
      testKey: 'foo.ts::foo|run',
      coveredFiles: [
        'test/integration.test.ts',
        'src/index.ts',
        'test/fixtures/math.ts',
      ],
    });
  });
});
