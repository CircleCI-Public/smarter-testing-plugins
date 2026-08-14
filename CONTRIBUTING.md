# Contributing Guidelines

Contributions are always welcome; however, please read this document in its entirety before submitting a Pull Request or
Reporting a bug.

### Table of Contents

- [Reporting a bug](#reporting-a-bug)
    - [Security disclosure](#security-disclosure)
- [Creating an issue](#creating-an-issue)
- [Opening a pull request](#opening-a-pull-request)
    - [One plugin per pull request](#one-plugin-per-pull-request)
    - [Commit messages](#commit-messages)
- [Hall of Fame](#hall-of-fame)
- [Code of Conduct](#code-of-conduct)
- [License](#license)

---------------

# Reporting a Bug

Think you've found a bug? Let us know!

### Security disclosure

Security is a top priority for us. If you have encountered a security issue please responsibly disclose it by following
our [security disclosure](https://circleci.com/security/) document.

# Creating an Issue

Your issue must follow these guidelines for it to be considered:

#### Before submitting

- Check you're on the latest version of the plugin, we may have already fixed your bug!
- [Search our issue tracker](https://github.com/CircleCI-Public/smarter-testing-plugins/issues)
  for your problem, someone may have already reported it
- Tell us which plugin you're using, along with the version of the plugin and the version of the test runner it's
  plugged into

# Opening a Pull Request

To contribute, [fork](https://help.github.com/articles/fork-a-repo/) this repository, commit your changes,
and [open a pull request](https://help.github.com/articles/using-pull-requests/).

Your request will be reviewed as soon as possible. You may be asked to make changes to your submission during the review
process.

### One plugin per pull request

Each plugin in this repository is developed, tested, and published independently, and CI selects a single plugin's
config based on the paths you changed. A pull request that touches more than one plugin directory **will fail the
build**. Split cross-plugin work into separate pull requests.

Changes to `v8-coverage-collector` are a special case: the JavaScript plugins depend on a published version of it, so
collector changes land and publish first, then a follow-up pull request bumps the dependency in each consumer.

#### Before submitting

- Test your change thoroughly. See the plugin's own `README.md` for how to install dependencies and run its tests.
- If you changed how coverage is collected or formatted, the `coverage.json`
  checked in at the plugin root will be out of date. CI regenerates it and fails if the result differs from what's
  committed. Regenerate it yourself with:

  ```sh
  pnpm generate
  ```

  for the JavaScript plugins, or the `circleci testsuite` command documented in the plugin's `README.md` for
  `pytest-circleci-coverage` and
  `rspec-circleci-coverage`. Both need the [CircleCI CLI](https://cli.circleci.com/) and `jq` installed. Review the diff
  before committing it, and don't hand-edit the file.
- Run the plugin's lint and format checks (`pnpm lint` and `pnpm format` for the JavaScript plugins).

### Commit messages

Write one commit per unit of work — usually a single commit per pull request. Squash review fixups before requesting a
merge.

Subject lines are imperative sentences describing what the commit does, for example
`Prevent coverage file collisions for same-basename test files`. Capitalise the first word, leave off the trailing
period, and keep it under about 72 characters. Please **don't** use conventional commit prefixes such as
`feat:`, `fix:`, or `chore(jest):` — name the plugin in the sentence instead if it adds useful context.

Use the commit body to explain why the change is needed when the subject alone doesn't carry it.

# Hall of Fame

Have you reported a bug that was fixed or even sent a patch that fixed one?

First of all, you rock! Thank you so much for your help!

Please send us a pull request and add yourself to the [CONTRIBUTORS.md](./CONTRIBUTORS.md) hall of fame.

# Code of Conduct

All community members are expected to adhere to our [code of conduct](./CODE_OF_CONDUCT.md).

# License

Each plugin in this repository is released under the MIT License. See the `LICENSE` file in the plugin's directory.
