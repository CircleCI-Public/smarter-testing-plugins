const { createDefaultEsmPreset } = require('ts-jest');

const { transform, extensionsToTreatAsEsm } = createDefaultEsmPreset();

/** @type {import('jest').Config} */
const config = {
  verbose: true,
  testEnvironment: 'node',
  transform,
  extensionsToTreatAsEsm,
  testPathIgnorePatterns: [
    '/node_modules/',
    'test/fixtures/',
    'test/fixtures-browser/',
  ],
};

module.exports = config;
