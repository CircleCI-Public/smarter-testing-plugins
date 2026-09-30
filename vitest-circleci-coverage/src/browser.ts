/**
 * Vitest setup file that collects V8 code coverage per test in Vitest
 * browser mode for CircleCI's Smarter Testing.
 *
 * Browser mode collects coverage over the Chrome DevTools Protocol using
 * the `beforeEach`/`afterEach` hooks.
 * This requires a Chromium browser.
 *
 * @module
 */

import { afterEach, beforeEach, inject } from 'vitest';
import { cdp } from 'vitest/browser';
import { COVERAGE_ENABLED_KEY } from './constants.ts';

interface CDPSession {
  send(method: string, params?: object): Promise<unknown>;
}

if (inject(COVERAGE_ENABLED_KEY)) {
  const session = cdp() as CDPSession;

  await session.send('Profiler.enable');
  await session.send('Profiler.startPreciseCoverage', {
    callCount: true,
    detailed: false,
  });

  const takeCoverage = async (): Promise<string[]> => {
    const { result } = (await session.send('Profiler.takePreciseCoverage')) as {
      result: { url: string }[];
    };
    return result.map((s) => s.url);
  };

  beforeEach(async () => {
    await takeCoverage();
  });

  afterEach(async ({ task }) => {
    task.meta.coveredUrls = await takeCoverage();
  });
}
