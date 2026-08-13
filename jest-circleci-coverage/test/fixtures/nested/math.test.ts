import { rectangleArea } from './geometry';

// Shares its basename with ../math.test.ts on purpose: per-suite coverage
// files are keyed by test file name, so same-named suites in one run must
// not overwrite each other's coverage.
describe('nested math', () => {
  it('should compute the rectangle area', () => {
    expect(rectangleArea(3, 4)).toBe(12);
  });
});
