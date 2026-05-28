# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-06-02

### Breaking change

- `jest-environment-node` and `jest-environment-jsdom` are no longer bundled as direct dependencies. They are now peer dependencies and must be installed by the consumer alongside `jest`. See the README for installation instructions.

### Added

- Support for Jest 28, 29, and 30. The `jest` peer range is broadened from `>=30.0.0` to `>=28.0.0 <31.0.0`.
- New peer dependencies (all accepting `>=28.0.0 <31.0.0`): `@jest/environment`, `@jest/reporters`, `@jest/types`, `jest-environment-node`, `jest-environment-jsdom`.
- README guidance on installing the appropriate Jest test environment (Node or JSDOM) as a peer dependency, including how to pin a specific Jest major.

### Fixed

- Typo in the `package.json` exports map: the misspelled `./enrironment-node` subpath has been corrected to `./environment-node`.

## [0.2.0] - 2026-05-07

### Added

- `environment-jsdom` package subpath for JSDOM / browser-style tests (for example React Testing Library).
- Documentation for new environment `@circleci/jest-circleci-coverage/environment-jsdom`

### Changed

- Split Node and JSDOM test environment implementations; `@circleci/jest-circleci-coverage/environment` still resolves to the Node environment.

### Fixed

## [0.1.3] - 2026-02-17

### Added

- Documentation to exported symbols.

## [0.1.2] - 2026-02-16

### Added

- Stdout logs when plugin is enabled.

## [0.1.1] - 2026-02-16

Initial release of `jest-circleci-coverage`
