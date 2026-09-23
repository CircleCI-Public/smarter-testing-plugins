# The CircleCI coverage format

**Status:** normative. This document defines the coverage format that `circleci testsuite` consumes, and the contract a
plugin must satisfy to produce it.

The key words **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT** and **MAY** are to be interpreted as in
[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

## 1. Scope

The CircleCI coverage format answers **which source files did each test touch?** Smarter Testing's test impact
analysis inverts that map so that a later change to a source file selects the tests that touched it.

Coverage is recorded at the granularity of a whole source file. A file was either touched by a test or it was not; how
much of it ran, and which lines ran, is out of scope, because selection only ever asks whether a change to a file can
affect a test.

Tests are recorded at every granularity the runner can be asked to run. If a runner accepts both
`test-runner path/to/file.test.ts` and `test-runner TestFoo`, then both the file and the class are units the consumer
may select, and both MUST appear as scopes in the test key (#5). A key that omits an addressable scope cannot be
selected at that granularity; a key that invents a scope the runner cannot be given produces an unrunnable selection.
This is why keys are progressively qualified rather than being a bare test name.

A *producer* is a plugin that writes a coverage document during a test run. The *consumer* is `circleci testsuite`.
This document is normative for producers; #7 describes consumer behaviour informatively.

## 2. Terminology

- **Test atom** — the unit of test the test runner can execute, as produced by a suite's `discover` command. An atom
  is usually a test file, but could also be a class name, or test name.
- **Source file** — any file in the project whose contents can change the behaviour of a test. Test files are source
  files.
- **Test key** — the identifier of a test within a coverage document, as defined in #5.
- **Analysis run** — a test run performed by a suite's `analysis` command, with a producer enabled.
- **Root directory** — the project root directory where the `test-suites.yml` file was found.
- **Working directory** — the directory the testsuite command was invoked from.

## 3. Activation

A producer MUST be inert unless explicitly enabled for the current run. Enabling MUST be a single explicit signal that
also names the output path: the `CIRCLECI_COVERAGE` environment variable set to that path, or, where a runner cannot
propagate environment variables to the collector, an equivalent command-line option (`--circleci-coverage=<path>`).

When not enabled, a producer MUST NOT instrument the run, MUST NOT write any file, and MUST NOT measurably change the
run's duration or output.

A producer MUST write its document to the path it was given, creating parent directories as required. It MUST NOT
choose its own path, append a suffix, or write to more than one location. Intermediate files (for example, per-worker
fragments awaiting a merge) are permitted outside the root directory and MUST NOT remain after the run.

## 4. Document format

A coverage document is a single JSON object, encoded as UTF-8: source file path → test key → coverage value.

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

A document containing `{}` is valid and means "no coverage was observed". A producer MUST write a valid document, or
no document at all; it MUST NOT write a partial or truncated one.

### 4.1 Source file paths

Each key of the outer object is a source file path, and:

- MUST be relative to the working directory, and MUST NOT be absolute;
- MUST identify a file that exists at the end of the run;
- MUST resolve to a file within the root directory. `..` segments are permitted, and are how a file outside the
  working directory but under the root is addressed; a path resolving outside the root is rejected;
- MUST be spelled canonically: no `./` prefix, no duplicate separators, and the real path rather than a symlinked
  alias;
- MUST be unique within the document. A producer MUST merge, not repeat, coverage for the same file.

Runners report absolute paths, `file://` URLs, or instrumentation-specific keys. Converting them to a relative path
is the producer's job, and it MUST do so against the working directory rather than against a config file, the root
directory, or the test file's own location.

The working directory is not necessarily the root directory: the consumer walks up the tree to find
`test-suites.yml`, and everything under the directory holding it is in scope. A suite run from one package of a
monorepo therefore reports coverage relative to that package, and MAY reach a sibling package or the root itself —
`../lib/src/x.ts` from `packages/web` is in scope when `test-suites.yml` sits at the repository root. Such coverage
MUST be reported: a change in an adjacent package can affect this suite's tests, and dropping it loses that impact.
Placing `test-suites.yml` inside a single package narrows the root to that package, and coverage from its siblings
then resolves outside the root and is rejected.

### 4.2 Coverage values

Each value is the boolean `true`, meaning the test touched the file. A producer whose coverage source reports lines MUST
reduce them to a boolean.

A producer MUST NOT emit `false`; absence is how "not covered" is expressed.

## 5. Test keys

A test key identifies the test that touched the file:

```abnf
test-key   = scope *( "!!" scope ) "|" phase
scope      = 1*VCHAR           ; runner-defined, MUST NOT contain "!!" or "|"
phase      = "run"
```

- The first scope MUST be the test file's path, spelled exactly as the suite's `discover` command emits it (and
  therefore subject to #4.1).
- Each subsequent scope MUST name one level further down the runner's hierarchy — suite, class, `describe`, test —
  and MUST be **progressively qualified**: a scope includes its parents rather than only its own name. A two-segment
  key (file, then the test's full description) is correct for runners with no addressable intermediate scopes.

Keys exist to be matched against test atoms. A producer MUST derive each key from the identifiers its runner also uses
for discovery and reporting, so that a key's leading scopes resolve to a discovered atom. A key that resolves to no
atom is dropped by the consumer and its coverage is lost.

## 6. Attribution

Attribution is the substance of the format, and the rules are where plugins go wrong.

1. **Per test, not per run.** A producer MUST attribute coverage to the individual test that caused it whenever the
   runner exposes per-test hooks. It MUST reset or snapshot its coverage source immediately before each test and read
   it immediately after, so that one test's coverage is never credited to another. Per-file attribution is a fallback
   for runners that cannot do better, and MUST be documented as a limitation of that plugin.
2. **Every test that ran, including failures.** A test that failed still executed code, and that code still selects
   it. A producer MUST record coverage for failing and erroring tests.
3. **No test that did not run.** Skipped, filtered, and never-started tests MUST NOT appear. A test whose body never
   executed has no dependencies to record.
4. **Test files cover themselves.** A test file MUST appear as a source file covered by its own tests, so that editing
   a test selects it.
5. **Project code only.** Coverage of dependencies — vendored directories, installed packages, runtime internals —
   MUST NOT appear. Such files are touched by every test and make every change select everything.
6. **Shared framework files are suspect.** A file that every test loads is technically covered by every test and is
   almost never a useful dependency. A producer SHOULD scope collection to the test lifecycle so that import-time
   execution of shared setup does not fan out across the whole suite.
7. **Import-only dependencies count.** A module that a test imports but whose lines never execute during the test — a
   module of constants, models, or type declarations — is still a dependency: changing it can change the test's
   result. A producer SHOULD attribute such a module to the tests that import it, directly or transitively, where its
   ecosystem makes the import graph recoverable.
8. **Generated and evaluated sources count.** Where a runner reports coverage for a compiled template or `eval`'d
   source under the path of the file it came from, that path MUST be reported, subject to #4.1.
9. **Setup and teardown are not the test.** A producer SHOULD scope collection to the test body, and where its
   coverage source labels phases separately it SHOULD discard everything but the test's own. Code reached only from a
   fixture, hook, or teardown is rarely what the test exercises, and attributing it selects every test sharing that
   setup whenever the setup changes. A producer MAY fold such coverage into the tests it ran for when the runner gives
   it no way to separate the phases, but MUST report it under the `run` phase like any other entry.

## 7. Consumer behaviour (informative)

A suite declares an `analysis` command — its `run` command plus coverage instrumentation — and receives the output
path by interpolation:

```yaml
analysis: CIRCLECI_COVERAGE=<< outputs.circleci-coverage >> <runner> << test.atoms >>
options:
  test-impact-analysis: true
```

`<< outputs.circleci-coverage >>` declares the CircleCI coverage format, and is what lets the testsuite analyse every
atom in a single pass. Without a conforming producer, the only way to learn per-atom coverage is to run the suite
one atom at a time.

The consumer reads the document, inverts it into per-atom impact data, and uploads it. On subsequent pipelines it
diffs the changed files against that data to select atoms. Coverage keyed to unknown atoms is reported and discarded;
paths that do not resolve are a parse error. `circleci testsuite doctor <suite>` reports these conditions, and is the
fastest way to find out which rule a producer is breaking.

Suites MAY leave `outputs.circleci-coverage` undefined and let the command generate a path. The suites in this
repository pin it to `coverage.json` only because these plugins must assert on their own output.

## 8. Conformance

A conforming producer demonstrates conformance with tests that drive the real runner, in a child process, over
fixtures small enough that the expected document can be read at a glance. Those tests MUST assert on the whole
document by equality.

A conforming producer's test suite MUST cover:

- **enabled** — the exact document, for fixtures with at least two test files and a source file touched by only one
  test;
- **shared coverage** — a source file exercised by two tests MUST carry a key for each of them, asserted both for two
  tests in the same test file and for tests in different test files. A producer merges per-test results into a
  file-major document, and this is the case that catches a merge which overwrites an existing entry instead of adding
  to it;
- **disabled** — no output file anywhere, and no instrumentation, when the activation signal is absent;
- **failing tests** — coverage recorded (#6.2);
- **skipped tests** — no entry, including a run in which every test is skipped (#6.3);
- **paths** — fixtures in nested directories, and two test files sharing a basename in different directories;
- **missing prerequisites** — a clear warning and an empty or absent document, never a crash or a half-populated one,
  when instrumentation the plugin depends on is not enabled;
- **the supported runner range** — the full suite run against each runner major version the plugin claims to support,
  and against each entry point it exports.

A conforming plugin also checks in the document produced by running `circleci testsuite` against its own suite
(`coverage.json` at the plugin root), and CI regenerates it and fails on any difference. That file is the end-to-end
conformance assertion: it is the only test that exercises the plugin through the real command, and any behavioural
change to collection must show up as a reviewed diff there.

## 9. Compatibility

The format is versionless; compatibility is maintained by the consumer accepting what earlier producers emitted.
Producers MUST target the current spec:

| Element                       | Status     |
|-------------------------------|------------|
| `true` coverage value         | current    |
| array-of-lines coverage value | deprecated |
| phases other than `run`       | never emit |

A change to this document that makes previously conforming output non-conforming requires a corresponding change in
the consumer first, and then in every plugin in this repository.
