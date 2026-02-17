/**
 * The coverage output structure written to the JSON file.
 *
 * Maps file paths to the tests that cover them.
 */
export interface JestCircleCICoverageOutput {
  [sourceFile: string]: {
    [testKey: string]: number[];
  };
}
