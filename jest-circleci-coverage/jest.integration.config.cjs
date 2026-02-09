const { resolve } = require('node:path');
const { createDefaultEsmPreset } = require('ts-jest');

const environmentPath = resolve(__dirname, './dist/environment.js');
const reporterPath = resolve(__dirname, './dist/reporter.js');
const { transform, extensionsToTreatAsEsm } = createDefaultEsmPreset();

/** @type {import('jest').Config} */
const config = {
  verbose: true,
  testRegex: 'test/integration.test.ts',
  testEnvironment: environmentPath,
  reporters: ['default', reporterPath],
  extensionsToTreatAsEsm,
  transform,
};

module.exports = config;
