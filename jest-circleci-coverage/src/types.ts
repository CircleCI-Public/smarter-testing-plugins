export interface JestCircleCICoverageOutput {
  [sourceFile: string]: {
    [testKey: string]: number[];
  };
}
