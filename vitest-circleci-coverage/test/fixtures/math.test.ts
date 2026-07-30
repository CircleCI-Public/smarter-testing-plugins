import { describe, it, expect } from 'vitest';
import { add, subtract, multiply, divide } from './math.ts';

describe('math', () => {
  it('should add two numbers', () => {
    expect(add(1, 2)).toBe(3);
  });

  it('should subtract two numbers', () => {
    expect(subtract(5, 3)).toBe(2);
  });

  it('should multiply two numbers', () => {
    expect(multiply(2, 3)).toBe(6);
  });

  it('should divide two numbers', () => {
    expect(divide(6, 2)).toBe(3);
  });

  it('should throw on division by zero', () => {
    expect(() => divide(1, 0)).toThrow('Division by zero');
  });
});
