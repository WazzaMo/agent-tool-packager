# Note: Tests for ATP npm update notice and `--latest`

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

## Purpose

Record where update-check behaviour is covered in automated tests and what each area
asserts, so future changes do not drop coverage silently.

## Unit tests

### `test/cli/standalone-latest-argv.test.ts`

- **`isStandaloneLatestArgv`**: true only for argv shapes like `atp --latest` without
  subcommands; false when a command token appears or when combined with `--help` /
  `--version`.

### `test/registry/npm-registry-base-url.test.ts`

- **`resolveNpmRegistryBaseUrl`**: default public npm when config is null or key missing
  or blank; HTTPS **origin** from a valid URL; `null` for `http:` or garbage.

### `test/registry/npm-latest-version.test.ts`

- **`getNpmDistTagVersion`**: mocked `fetch` returns `dist-tags.latest`; encodes scoped
  package path; `null` on non-OK response, throw path, or missing tag.

### `test/cli/update-notice.test.ts`

- **`shouldSkipUpdateCheckForDevVersion`** and **`isPublishedNewerThanCurrent`** (semver
  rules).
- **`maybePrintUpdateNotice`** with injected deps: no fetch when skip env, non-TTY
  (without verbose), dev version, missing Station, argv contains `--help`; fetch +
  stderr line + throttle file when newer exists; second call with
  **`resetBackgroundUpdateNoticeForTests`** and warm throttle skips second fetch.
- **`printLatestVersusCurrent`**: skip message when `ATP_SKIP_UPDATE_CHECK`; success
  path mocks stdout; invalid `npm-registry-base-url` yields stderr message and exit 0.

Uses **`resetBackgroundUpdateNoticeForTests`** (exported for Vitest) to reset the
once-per-process guard between cases.

## Integration tests

### `test/integration/cli-update-check.test.ts`

- Runs built **`dist/atp.js`** via **`runAtpSpawn`** (see `test/integration/test-helpers.ts`).
- **`atp --latest`** with **`ATP_SKIP_UPDATE_CHECK=1`**: exit 0, stderr mentions skip.
- **`atp --version`**: exit 0, output contains semver-like text.
- **`atp --help`**: documents **`--latest`**.

CI and local **`npm run test:run`** must have run **`npm run build`** first so
integration tests see a current bundle.

## Related plan

See [2026-04-16-plan-atp-self-version-check-npm.md](2026-04-16-plan-atp-self-version-check-npm.md).
