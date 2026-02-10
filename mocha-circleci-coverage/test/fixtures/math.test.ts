import assert from 'node:assert';
import { add, subtract, multiply, divide } from './math.ts';

describe('math', () => {
  it('should add two numbers', () => {
    assert.strictEqual(add(1, 2), 3);
  });

  it('should subtract two numbers', () => {
    assert.strictEqual(subtract(5, 3), 2);
  });

  it('should multiply two numbers', () => {
    assert.strictEqual(multiply(2, 3), 6);
  });

  it('should divide two numbers', () => {
    assert.strictEqual(divide(6, 2), 3);
  });

  it('should throw on division by zero', () => {
    assert.throws(() => divide(1, 0), /Division by zero/);
  });
});
