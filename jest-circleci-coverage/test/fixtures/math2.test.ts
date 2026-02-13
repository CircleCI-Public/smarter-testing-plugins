import { add, multiply } from './math.ts';

describe('math2', () => {
  it('should add and multiply two numbers', () => {
    expect(multiply(add(1, 2), 2)).toBe(6);
  });
});
