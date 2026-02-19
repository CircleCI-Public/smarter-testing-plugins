import { add, multiply } from './math.ts';

describe('math2', () => {
  it('should add and multiply two numbers', () => {
    const sum = add(1, 2);
    const product = multiply(sum, 3);
    expect(product).to.equal(9);
  });
});
