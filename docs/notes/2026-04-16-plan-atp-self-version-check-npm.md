# Plan: ATP self-version check against npm registry at runtime

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

## Purpose

Describe how the CLI can compare **the version ATP already knows at runtime** to the
**latest published version** on the public npm registry, and **tell the user** when a
newer release exists—without blocking normal commands and without requiring npm
credentials for the public package `@wazzamo-agent-tools/packager`.

## Goal

- **Input:** current version string from existing runtime source (see below).
- **Query:** public npm registry for latest stable tag (default `latest`).
- **Output:** when `latest > current` (semver), emit a short, actionable notice (e.g. to
  stderr) once per sensible interval, not on every sub-invocation in a tight loop.

## Current state (baseline)

- **`atp_version()`** in `src/version.ts` returns `process.env.ATP_VERSION` or
  `0.0.0-dev`. Release builds set **`ATP_VERSION`** at compile time from
  `project-version` via `vite.config.ts` (see `vite.config.ts` and `scripts/sync-version.js`).
- **`package.json`** name is **`@wazzamo-agent-tools/packager`**; that is the registry
  package identity to query.
- **`program.version(atp_version())`** in `src/atp.ts` already exposes the same string to
  Commander for **`atp --version`**.

No registry calls exist today; all installs are local catalog / `file://` flows.

## Registry contract (public package)

- **URL:** `{registry_base}/@wazzamo-agent-tools%2Fpackager` where **`registry_base`** is
  read from **Station config** (see Configuration surface); default **`registry_base`** is
  **`https://registry.npmjs.org`** (npm registry API shape unchanged).
- **Response:** JSON document; read **`dist-tags.latest`** as the published version
  string to compare (npm docs: [registry API](https://github.com/npm/registry/blob/master/docs/REGISTRY-API.md)).
- **Auth:** not required for this public scoped package.
- **Errors:** treat network failure, timeout, non-200, or malformed JSON as **silent skip**
  (or a single debug line if a verbose flag exists later)—never fail the user’s command
  because an update check failed.

## Semver comparison

- Parse **`atp_version()`** and **`dist-tags.latest`** with the same rules npm uses for
  ordering; prefer the existing **`semver`** package as a direct dependency if not
  already present, or a tiny validated subset if you want zero new deps (higher risk).
- **Prerelease handling:** if the running build is a prerelease (e.g. `-dev`, `-rc.1`),
  decide policy explicitly: either compare to `latest` only, or also consider
  `dist-tags.next` when the running version is prerelease—document the choice in code
  comments.
- **`0.0.0-dev`:** never nag for “update” when the running version is clearly a dev build,
  unless you intentionally support comparing dev to `latest` (usually noisy); simplest
  rule: **skip check** when version ends with `-dev` or equals `0.0.0-dev`.

## When and where to run the check

| Option | Pros | Cons |
|--------|------|------|
| **After successful parse, before subcommand** | User sees notice on real use | Adds latency unless cached |
| **Fire-and-forget (don’t await)** | No added wall time | Harder to test; message may race exit |
| **Dedicated `atp update-check`** | Explicit, scriptable | Users may never run it |

**Recommendation:** run **once per process** at startup **after** argv parse, **await**
with a **short timeout** (e.g. 2–3s), but **only if** the throttle file allows (next
section). Do not run for **`atp --version`** / **`atp -V`** / **`atp help`** if you want
those to stay instant and machine-parsable.

## Throttling and cache (avoid spam and rate limits)

- Persist “last successful check” under the Station, e.g.
  **`${STATION_PATH}/.atp_last_registry_check`** (or a small JSON file next to other
  station metadata), storing **UTC timestamp** and optionally **last seen latest** version.
- Default policy: at most **one network check per 24 hours** per machine (tunable).
- Respect **`NO_UPDATE_CHECK`**-style env (common convention); use a prefixed name such as
  **`ATP_SKIP_UPDATE_CHECK=1`** to disable all registry contact for CI/air-gapped users.

## User messaging

- One or two lines on **stderr**, e.g. “A newer ATP is available: 0.2.3 → 0.3.0. Run
  `npm i -g @wazzamo-agent-tools/packager` (or your installer) to upgrade.”
- If **stdout is not a TTY** (`!process.stdout.isTTY`), default to **no message** (or only
  with **`ATP_UPDATE_CHECK=verbose`**) so scripts are not polluted.
- Never print on **`--json`** output paths if those are added later for machine consumers.

## Configuration surface (minimal)

| Mechanism | Role |
|-----------|------|
| **`ATP_SKIP_UPDATE_CHECK`** | Disable check entirely |
| **Throttle file in Station** | Limit frequency; survives restarts |
| **`atp-config.yaml` in the Station** | HTTPS registry **base URL**; default public npm when omitted; mirrors via Station only (no env-based registry URL) |

## Security and supply chain

- Use **HTTPS** only; the registry **host** comes from **Station** `atp-config.yaml` (with
  a safe default to the public npm registry). Reject non-HTTPS bases; mirrors must still
  serve the same package name.
- No shell execution of **`npm view`** required; **`fetch`** (Node 18+) keeps the surface
  small and testable.
- Log nothing that includes full registry response bodies in normal operation.

## Implementation sketch (modules)

1. **Dependency: `semver`** — add as a runtime dependency; use it for ordering and
   comparisons between `atp_version()` and the registry tag string (same rules as npm
   ordering; keep prerelease / dev-skip policy next to the call sites).

2. **`registry/npm-latest-version.ts`** — `getNpmDistTagVersion(name, tag, opts)` with
   timeout + AbortController. Resolve the registry **base URL** from **Station**
   **`atp-config.yaml`** (loaded from **`STATION_PATH`** / default Station location); if
   the key is absent, use the **default public npm registry** URL. Require **HTTPS**,
   normalize trailing slash, then append the encoded package path (e.g. `/@scope%2Fname`);
   if the configured base is missing or not usable, **silent skip** for the background
   notice path and a **non-throwing** error path for **`--latest`**.

3. **`cli/update-notice.ts`** — shared logic: read throttle file under Station, honour
   **`ATP_SKIP_UPDATE_CHECK`**, TTY / stderr rules, dev-version skip; compare with **`semver`**
   (e.g. `semver.lt(current, latest)` when both parse); update throttle on a successful
   registry read. Expose at least:
   - **`maybePrintUpdateNotice()`** — background path: no-op for **`atp --version`** /
     **`atp -V`** / **`atp help`**; otherwise run once per process when throttle allows.
   - **`printLatestVersusCurrent()`** (or similar) — **`atp --latest`**: always perform a
     check (subject to skip env and Station registry URL validity), print latest vs current
     for the user, and do not rely on “silent skip” for a bad response (still must not
     throw out of the CLI).

4. **`src/atp.ts`** — register a root **`--latest`** flag (or equivalent) that runs the
   explicit path and exits without running a normal subcommand. Wire **`maybePrintUpdateNotice()`**
   at the right point in the Commander lifecycle for all other invocations (e.g.
   `preAction` on the root program, or **`parseAsync`** after parse—Commander v12+; verify
   in this repo). Ensure **`program.version()`** handling never triggers the background
   check.

5. **Tests** — mock global **`fetch`** or inject a test double; point **Station**
   **`atp-config.yaml`** (or the in-memory config loader used in tests) at a fixed HTTPS
   registry base. Cover: newer available, up to date, offline (no throw),
   throttle skips second background call, **`ATP_SKIP_UPDATE_CHECK`**, dev version skip,
   **`--version` / `-V` / `help`** do not hit the network, **`--latest`** forces a check and
   prints expected output (and still no throw on failure—document expected stderr/exit).

## Considerations

- Using the `semver` javascript package as a dependency is a good idea for version comparison.
- Performing **`atp --version`** will not trigger a check and merely reports current version.
- New command `atp --latest` will trigger a check and report the latest versus current.

- Registry **base URL** for the check comes from **Station** **`atp-config.yaml`** only;
  default to the public npm registry when unset (no env-based registry URL).
- Internationalisation: English-only message for v1 is acceptable.

## Success criteria

- Normal commands stay usable offline (no errors from the check).
- Users on an old global install see an occasional stderr hint with correct semver gap.
- CI and scripting remain clean via **`ATP_SKIP_UPDATE_CHECK`** and non-TTY behaviour.
