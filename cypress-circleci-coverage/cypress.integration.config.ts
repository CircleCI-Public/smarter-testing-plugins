import { defineConfig } from 'cypress';
import webpackPreprocessor from '@cypress/webpack-preprocessor';
import cypressCircleCICoverage from './src/plugin.ts';

export default defineConfig({
  e2e: {
    specPattern: 'cypress/e2e/**/*.cy.ts',
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

      on('file:preprocessor', webpackPreprocessor({ webpackOptions }));

      return cypressCircleCICoverage(on, config);
    },
  },
});
