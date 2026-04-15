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

- **URL:** `https://registry.npmjs.org/@wazzamo-agent-tools%2Fpackager`
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
| **Optional future:** `atp-config.yaml` flag | Org-wide opt-out without env vars |

## Security and supply chain

- Use **HTTPS** only to **`registry.npmjs.org`** (hardcode host for this feature, or read
  **`npm_config_registry`** only if you explicitly decide to support mirrors—mirrors must
  still serve the same package name).
- No shell execution of **`npm view`** required; **`fetch`** (Node 18+) keeps the surface
  small and testable.
- Log nothing that includes full registry response bodies in normal operation.

## Implementation sketch (modules)

1. **`registry/npm-latest-version.ts`** — `getNpmDistTagVersion(name, tag, opts)` with
   timeout + AbortController.
2. **`cli/update-notice.ts`** — `maybePrintUpdateNotice()` reads `atp_version()`, throttle
   file, env, TTY; compares with `semver.lt(current, latest)`; updates throttle on success.
3. **`src/atp.ts`** — call `maybePrintUpdateNotice()` once at the right point in the
   Commander lifecycle (e.g. `preAction` hook on the root program, or immediately after
   `program.parse()` if using async parse—Commander v12+ supports async; verify current
   API in this repo).
4. **Tests** — mock global `fetch` or inject a test double; cover: newer available, up to
  date, offline (no throw), throttle skips second call, `ATP_SKIP_UPDATE_CHECK`, dev
  version skip.

## Open questions

- Should **`atp --version`** trigger a check? (Recommendation: **no**.)
- Whether to read **`npm_config_registry`** for corporate mirrors (adds complexity;
  default **no** for v1).
- Internationalisation: English-only message for v1 is acceptable.

## Success criteria

- Normal commands stay usable offline (no errors from the check).
- Users on an old global install see an occasional stderr hint with correct semver gap.
- CI and scripting remain clean via **`ATP_SKIP_UPDATE_CHECK`** and non-TTY behaviour.
