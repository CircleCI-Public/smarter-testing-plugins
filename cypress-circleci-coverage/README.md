# cypress-circleci-coverage

A Cypress plugin that generates coverage data for
CircleCI's [Smarter Testing](https://circleci.com/docs/guides/test/smarter-testing/).

## Usage

This plugin uses Istanbul code coverage collected from the browser to map
source files to test specs.

Install the plugin.

```bash
pnpm add -D jsr:@circleci/cypress-circleci-coverage
```

Add the plugin to your Cypress configuration:

Instrument your code with Istanbul (e.g. via `babel-plugin-istanbul` in a
webpack preprocessor) so that `window.__coverage__` is available in the
browser during test execution.

```typescript
// cypress.config.ts
import {defineConfig} from 'cypress';
import cypressCircleCICoverage from '@circleci/cypress-circleci-coverage/plugin';

export default defineConfig({
  e2e: {
    supportFile: './cypress/support/e2e.ts',
    setupNodeEvents(on, config) {
      const webpackOptions = {
        module: {
          rules: [
            {
              test: /\.ts$/,
              exclude: /node_modules/,
              use: {
                // instrument files with the istanbul plugin.
                loader: 'babel-loader',
                options: {
                  presets: ['@babel/preset-typescript'],
                  plugins: [['istanbul']],
                },
              },
            },
          ],
        },
      };

      on('file:preprocessor', webpackPreprocessor({webpackOptions}));

      return cypressCircleCICoverage(on, config);
    },
  },
});
```

Import the support file in your Cypress support file:

```typescript
// cypress/support/e2e.ts
import '@circleci/cypress-circleci-coverage/support';
```

Set the `CIRCLECI_COVERAGE` environment variable when running tests to
enable coverage collection.

```bash
CIRCLECI_COVERAGE=coverage.json cypress run
```

## Development

Install dependencies with pnpm.

```bash
pnpm install
```

Install cypress.

```bash
pnpm cypress install
```

Build the plugin.

```bash
pnpm build
```

Run tests.

```bash
pnpm test
```

