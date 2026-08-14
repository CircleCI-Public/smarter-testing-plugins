# AGENTS.md

This file provides guidance to coding agents working with code in this repository.

## Repository shape

A monorepo of 7 independently published plugins that produce per-test coverage data for CircleCI's Smarter Testing
(`circleci testsuite`). There is **no root package manager, workspace, or lockfile** — each plugin directory is
fully self-contained with its own manifest, lockfile, `.circleci/config.yml`, `.circleci/test-suites.yml`, README,
CHANGELOG, and LICENSE. Always `cd` into the plugin directory before running anything.

| Directory                   | Package                                     | Ecosystem         |
|-----------------------------|---------------------------------------------|-------------------|
| `v8-coverage-collector`     | `@circleci/v8-coverage-collector` (npm)     | shared library    |
| `jest-circleci-coverage`    | `@circleci/jest-circleci-coverage` (npm)    | pnpm / TypeScript |
| `vitest-circleci-coverage`  | `@circleci/vitest-circleci-coverage` (npm)  | pnpm / TypeScript |
| `mocha-circleci-coverage`   | `@circleci/mocha-circleci-coverage` (npm)   | pnpm / TypeScript |
| `cypress-circleci-coverage` | `@circleci/cypress-circleci-coverage` (npm) | pnpm / TypeScript |
| `pytest-circleci-coverage`  | `pytest_circleci_coverage` (PyPI)           | pip / uv_build    |
| `rspec-circleci-coverage`   | `rspec-circleci-coverage` (RubyGems)        | bundler           |

**One plugin per PR.** The root `.circleci/config.yml` is a setup config that uses `path-filtering` to select the
changed plugin's config, and explicitly fails the build if more than one plugin directory was touched. Splitting a
cross-plugin change into separate PRs is mandatory, not stylistic. Cross-cutting edits to `v8-coverage-collector`
therefore land first, get published, and consumers bump the pinned dependency afterwards.

## Commands

JS plugins (all use pnpm; `cd <plugin>` first):

```bash
pnpm install
pnpm build            # tsc -> dist/
pnpm test             # unit/integration tests
pnpm lint             # oxlint --quiet
pnpm format           # prettier . --check  (NOT a formatter — it checks)
pnpm generate         # regenerate the checked-in coverage.json (see below)
```

Single test: `pnpm exec vitest run test/integration.test.ts -t 'name'` (vitest),
`NODE_OPTIONS='--experimental-vm-modules' pnpm exec jest test/integration.test.ts -t 'name'` (jest),
`pnpm exec mocha test/integration.test.ts --grep 'name'` (mocha),
`pnpm exec cypress run --config-file cypress.integration.config.ts --spec cypress/e2e/<file>.cy.ts` (cypress).

Python:

```bash
cd pytest-circleci-coverage
pip install -r dev-requirements.txt && pip install --editable .
pytest                                    # single test: pytest tests/test_x.py::test_name
```

Ruby:

```bash
cd rspec-circleci-coverage
bundle install
bundle exec rspec                          # single test: bundle exec rspec spec/path_spec.rb:42
```

`pnpm build` is required before `pnpm test` in jest/vitest/mocha/cypress: the integration configs load the compiled
`dist/` (or `src/` for mocha/cypress) reporter and environment by absolute path, so stale builds silently test old
behaviour.

## The `coverage.json` golden file

Every plugin except `v8-coverage-collector` checks in a `coverage.json` at its root. It is **generated output used as a
fixture**, and CI regenerates it (`pnpm generate:ci`, or the equivalent inline script for pytest/rspec) then runs
`git diff --exit-code`. Any behavioural change to coverage collection fails CI until you regenerate locally and commit
the result:

```bash
pnpm generate                              # JS plugins
# pytest
circleci testsuite run 'integration test' --local --test-analysis=all && cat coverage.json | jq --sort-keys > coveragetmp.json && mv coveragetmp.json coverage.json
# rspec: same command, run from rspec-circleci-coverage/
```

This needs the `circleci` CLI and `jq` on PATH. The `jq --sort-keys` pass is what keeps diffs stable — don't hand-edit
the file. `outputs.circleci-coverage: coverage.json` is pinned in each `test-suites.yml` *only* because these packages
must assert on their own output; normal consumers let the testsuite command auto-generate that path.

## Architecture

All plugins implement the same contract, differing only in how they hook their test runner and where coverage comes
from.

**Activation**: setting the `CIRCLECI_COVERAGE` environment variable to an output path both enables collection and names
the destination. When unset, every plugin is a complete no-op — preserve that, since users install these into normal
test runs.

**Output format** — file-major map of source path (relative to cwd) → test key → executed lines:

```json
{
  "src/foo.ts": {
    "test/foo.test.ts!!test name|run": [
      1
    ]
  }
}
```

The test key is `!!`-joined scope segments (test file, then class/describe/test name, each progressively qualified)
suffixed with `|run` for the phase. Executed line numbers are *not* tracked by the V8-based collectors; they emit the
literal `[1]` because the testsuite coverage parser requires at least one line per entry. Don't mistake this for a bug.

**Collection mechanisms**:

- `v8-coverage-collector` wraps `node:inspector`'s `Profiler.*Precise Coverage` APIs into a
  `connect / resetCoverage / collectCoverage / disconnect` lifecycle and builds the test key. `jest`, `vitest`, and
  `mocha` plugins depend on it at an **exact pinned version** (e.g. `0.2.110`) and just map their runner's hooks onto
  that lifecycle.
- `cypress-circleci-coverage` cannot use V8 (coverage lives in the browser), so it reads Istanbul's
  `window.__coverage__`, diffs a per-test snapshot in `beforeEach`/`afterEach`, and ships covered files to the Node
  process over `cy.task`. Users must instrument their code (`babel-plugin-istanbul` via a webpack preprocessor).
- `pytest-circleci-coverage` builds on `pytest-cov`/`coverage.py` dynamic contexts (`--cov-context=test`), plus an
  import graph (`_import_graph.py`) so declaration-only modules are attributed to the tests that import them. On Python
  3.14+ it calls `sys.monitoring.restart_events()` at each test setup because coverage.py's `sys.monitoring` core
  otherwise disables a line after its first hit and loses later contexts.
- `rspec-circleci-coverage` uses Ruby's stdlib `Coverage`, peeking results before and after each example and diffing.

**Jest and multi-runner-version support**: the jest plugin ships separate `environment-node` / `environment-jsdom` entry
points built from one `createJestCircleCICoverageEnvironment(Base)` mixin so it can wrap whichever base environment the
user has. Its integration test shells out to `jest-28`/`jest-29`/`jest-30` aliased installs to cover the whole supported
peer range. Those `jest-N`, `jest-environment-node-N`, and `jest-environment-jsdom-N` aliases are deliberately excluded
from Renovate in `renovate.json` — leave them pinned.

**Jest fan-in**: because jest runs each test file in its own worker/environment, the environment writes one JSON per
test file into a temp dir (`TMP_COVERAGE_DIR`, default under `os.tmpdir()`), and the reporter merges them into the final
output in `onRunComplete`. Both halves are needed; a jest config with the environment but no reporter produces nothing.

## Commits

Write one commit per unit of work — in practice usually a single commit per PR, since a PR here already scopes to one
plugin. If a change genuinely contains separable units (a fixture and the behaviour it exercises, a refactor and the
feature built on it), commit them separately; otherwise squash rather than shipping a chain of "fix typo" / "address
review" commits.

The subject line is an imperative sentence describing what the commit does:
`Prevent coverage file collisions for same-basename test files`, not `Fixed collisions` or `Fixing collisions`.
Capitalise the first word, no trailing period, and keep it under ~72 characters.

**Never use conventional commit prefixes.** No `feat:`, `fix:`, `chore:`, `test:`, `refactor:`, and no scoped variants
like `fix(jest):`. Some older commits in the history use them; do not copy that pattern. If the plugin matters for
context, name it in the sentence (`Trim jest fixture comments to the essential note`).

Use the body for the why — motivation, tradeoffs, links to tickets — when the subject alone doesn't carry it. Wrap it
at ~72 characters and separate it from the subject with a blank line.

## Release process

Publishing happens only from `main`, via each plugin's own CI config. Versions are
`MAJOR.MINOR.<CircleCI pipeline number>`: the `MAJOR.MINOR` base lives in `package.json` / `pyproject.toml` / the
gemspec and the patch is injected at build time (`npm version --no-git-tag-version`, `.circleci/build.sh`, or a `sed` on
the gemspec). So bump only major/minor in the manifest, and never expect the checked-in version to match what's on the
registry. npm publishes use OIDC trusted publishing; credentials come from the `smarter-testing-plugin-publish` context.
Non-`main` branches run a `dry-run` job instead.
