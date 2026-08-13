import { rectangleArea } from './geometry';

// Deliberately shares its basename with ../math.test.ts to cover coverage-file collisions.
describe('nested math', () => {
  it('should compute the rectangle area', () => {
    expect(rectangleArea(3, 4)).toBe(12);
  });
});
