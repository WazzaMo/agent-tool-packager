# Note: Coding — ATP npm update notice and `--latest`

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

## Purpose

Record how the self-version check is wired in code and under which runtime conditions
the user sees the **background** “newer ATP” message, separate from the explicit
**`atp --latest`** path.

## Modules

| Module | Role |
|--------|------|
| `src/atp.ts` | `parseAsync`; root **`preAction`** calls **`maybePrintUpdateNotice`**. Early exit for standalone **`atp --latest`** before parse. Registers **`--latest`** on the root program for help text. |
| `src/cli/update-notice.ts` | **`maybePrintUpdateNotice`**, **`printLatestVersusCurrent`**; throttle file; env and TTY gates; semver compare; **`resetBackgroundUpdateNoticeForTests`**. |
| `src/cli/standalone-latest-argv.ts` | **`isStandaloneLatestArgv`** — detects **`atp --latest`** without a subcommand. |
| `src/registry/npm-registry-base-url.ts` | **`resolveNpmRegistryBaseUrl`** — Station **`npm-registry-base-url`** or default **`https://registry.npmjs.org`**; HTTPS origin only. |
| `src/registry/npm-latest-version.ts` | **`getNpmDistTagVersion`** — `fetch` + JSON **`dist-tags[tag]`**; timeout via **`AbortController`**. |
| `src/config/station-config.ts` | Optional **`configuration.npm-registry-base-url`** on **`StationConfig`**. |

Dependency: **`semver`** (runtime) for **`semver.valid`** / **`semver.lt`**.

## When the background stderr notice appears

All must hold:

1. Commander **`preAction`** runs for a normal subcommand (argv has no **`--help`** /
   **`-h`** / **`--version`** / **`-V`**).

2. **`ATP_SKIP_UPDATE_CHECK`** is not **`1`** or **`true`** (case-insensitive).

3. **`atp_version()`** is not a dev build: not **`0.0.0-dev`** and does not end with
   **`-dev`**.

4. **Station directory exists** (`stationExists()`), so throttle path is defined.

5. **`process.stdout.isTTY`** is true, **or** **`ATP_UPDATE_CHECK=verbose`**.

6. Throttle file **`${STATION_PATH}/.atp_last_registry_check`** is missing or older than
   **24 hours** since last successful check.

7. Registry base URL resolves (default or valid HTTPS **`npm-registry-base-url`** in
   Station **`atp-config.yaml`**).

8. **`getNpmDistTagVersion`** returns a non-null **`latest`** for
   **`@wazzamo-agent-tools/packager`** within **3s**.

9. **`isPublishedNewerThanCurrent(current, latest)`** is true (both valid semver,
   **`latest`** strictly greater).

10. First and only background attempt in the process (**`ranBackgroundUpdateNotice`**).

Message is written to **stderr** once when (9) is true after a successful fetch; throttle
is updated on any successful fetch even when not newer.

## `atp --latest`

Handled **before** **`program.parseAsync`** when **`isStandaloneLatestArgv`** is true.
Prints **Current** / **Latest** on **stdout** when the registry read succeeds; stderr for
skip, bad config, or fetch failure; always exit **0**. Still honours
**`ATP_SKIP_UPDATE_CHECK`**.

## Related plan and tests

- Plan: [2026-04-16-plan-atp-self-version-check-npm.md](2026-04-16-plan-atp-self-version-check-npm.md).
- Tests: [2026-04-17-note-atp-update-notice-tests.md](2026-04-17-note-atp-update-notice-tests.md).
