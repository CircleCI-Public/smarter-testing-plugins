# Writing a coverage plugin

A Smarter Testing coverage plugin records which source files each test touched.

For repository mechanics (one plugin per pull request, commit messages, release versioning) see
[CONTRIBUTING.md](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md).

Terms used below:

- **Test atom** — a unit the runner can execute, as produced by a suite's `discover` command. Usually a test file,
  sometimes a class or test name.
- **Root directory** — the root of a VCS project or where `.circleci/test-suites.yml` was found.
- **Working directory** — where the testsuite command was invoked. Not necessarily the root, in monorepos.

## Enabling collection

Collection is off by default. To enable it, accept a `CIRCLECI_COVERAGE=<path>` environment variable that includes the
location to write the generated coverage file. If the test runner can't pass an environment variable, use a test runner
flag with the same name and value, `--circleci-coverage=<path>`.

When disabled, do nothing: no instrumentation and no output file.

When enabled, write to the path given, creating parent directories as needed.

Intermediate files, such as per-worker fragments waiting to be merged:

- keep them out of the root directory;
- scope the path to this run, so no concurrent or earlier run can write it;
- clean them up afterward.

## The document

One JSON object, UTF-8: source file path → test key → `true`.

```json
{
  "src/order.ts": {
    "test/order.test.ts!!rejects an empty basket|run": true,
    "test/order.test.ts!!totals a basket|run": true
  },
  "test/order.test.ts": {
    "test/order.test.ts!!rejects an empty basket|run": true,
    "test/order.test.ts!!totals a basket|run": true
  }
}
```

`{}` is a valid document and means no coverage was observed.

Coverage is per file, not per line. If the coverage source returns line numbers, reduce them to a boolean.

### Paths

A source file path is relative to the **working directory**, never absolute, and must resolve to a file inside the
**root directory**.

`..` segments are allowed to address a file under the root but outside the working directory. Running a suite
from `packages/web` with `test-suites.yml` at the repository root puts `../lib/src/x.ts` in scope, and coverage there
must be reported.

The file must:

- exist when the run ends;
- spell it canonically: no `./` prefix, no doubled separators, no symlinked alias;
- keep each path unique in the document, merging rather than repeating entries for the same file.

Absolute paths, `file://` URLs and instrumentation-specific keys must be converted to **working directory**
relative paths.

If a path can't be made to conform, drop it and warn once.

### Values

`true`, meaning the test touched the file. Absence means not covered.

### Test keys

A key lists, from coarsest to finest, each test atom granularity the runner supports, joined by `!!` and followed by
`|` and the phase, which is always `run`.

```
test/handler.rb|run
test/order.test.ts!!totals a basket|run
tests/test_math.py!!tests/test_math.py::TestMath!!tests/test_math.py::TestMath::test_add|run
```

Record every granularity the runner can execute. If a runner accepts both `test-runner path/to/file.test.ts` and
`test-runner TestFoo`, the file and the class are both selectable units and both belong in the key:

```
path/to/file.test.ts!!TestFoo|run
```

A key has to identify exactly one test atom in the run.

## Attribution

**Attribute to the test.** Where the runner exposes per-test hooks, reset or snapshot your coverage source
immediately before each test and read it immediately after.

**Record only successful tests.** A failing test may produce incomplete coverage data, and should not be reported.

**Record nothing for skipped tests.** Skipped, filtered, and never-started tests are omitted.

**Project code only.** Vendored directories, installed packages, and runtime internals are touched by every test.
Exclude by whole path segment rather than substring: a project directory legitimately named `vendor`, or a source file
under a path containing `node_modules`, is project code. Where the ecosystem can identify a dependency root (an install
directory, an installed distribution, a loaded gem), test against that root instead of matching a name.

**Scope collection to the test lifecycle**, so import-time execution of shared setup doesn't fan out across the suite.

**Import-only dependencies.** A module of constants, models, or type declarations that a test imports but
never executes is a dependency, since changing it can change the result. Attribute it to the tests that import it,
directly or transitively, where the ecosystem makes the import graph recoverable.

**Generated and evaluated sources.** Where a runner reports coverage for a compiled template or `eval`'d source
under the path it came from, report that path.

**Report the authored file, not the build artifact.** Where the runner executes compiled output (a bundle, a transpiled
directory, a generated binding) and a source map or equivalent is available, report the authored source path.

**Setup and teardown.** Code reached solely from a fixture, hook, or teardown is rarely what the test
exercises, and attributing it selects every test sharing that setup whenever the setup changes. It should be omitted.

## Tests your plugin needs

Assert the real runner, in a child process, over fixtures small enough that you can read the expected document at a
glance, and assert on the whole document by equality.

Cover at least:

- **disabled** — no output file anywhere, and no instrumentation, with the activation signal absent;
- **enabled** — at least two test files and a source file touched by only one test;
- **shared coverage** — a source file exercised by two tests carries a key for each, asserted both for two tests in one
  file and for tests in different files;
- **failing tests** — coverage omitted;
- **skipped tests** — coverage omitted;
- **paths** — fixtures in nested directories, two test files sharing a basename in different directories, and a
  source file outside the working directory but inside the root (a `..` path);
- **missing prerequisites** — a clear warning and an empty or absent document when the plugin dependencies aren't
  enabled;
- **the supported runner range** — the full suite against every runner major version the plugin supports, and
  against every entry point it exports.

### The `coverage.json` golden file

Each plugin checks in the document produced by running `circleci testsuite` against its own suite, as `coverage.json` at
the plugin root. CI regenerates it and fails on any difference.
