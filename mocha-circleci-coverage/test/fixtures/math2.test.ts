import assert from 'node:assert';
import { add, multiply } from './math.ts';

describe('math2', () => {
  it('should add and multiply two numbers', () => {
    assert.strictEqual(multiply(add(1, 2), 2), 6);
  });
});
