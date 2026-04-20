# Todo: npm publish via GitHub Actions (manual)

## Goal

Publish `@wazzamo-agent-tools/packager` from CI using a **manually triggered** workflow (see `.github/workflows/publish-npm.yml`).

## Prerequisites (npm)

- The `@wazzamo-agent-tools` scope exists on [npmjs.com](https://www.npmjs.com) and the publishing account has **publish** rights for that scope (for initial package creation or non-OIDC fallbacks).
- For a **public** scoped package, publishes must use public access. The workflow runs `npm publish --access public`. Optionally add `publishConfig.access: "public"` in `package.json` so local `npm publish` matches CI.
- **Trusted publishing (OIDC)** is the path the workflow uses: on npmjs.com → package → **Settings** → **Trusted publishing**, add **GitHub Actions** with fields that match this repository exactly. The **workflow filename** must match the file in `.github/workflows/` (e.g. `publish-npm.yml`), including extension and casing; npm does not validate the form on save, so typos only show up at publish time.
- Trusted publishing needs a recent toolchain ([npm docs](https://docs.npmjs.com/trusted-publishers/)): **npm CLI ≥ 11.5.1** and **Node ≥ 22.14**. This repo’s `.node-version` satisfies that.
- **No long-lived `NPM_TOKEN` for publish**: the workflow does not set `NODE_AUTH_TOKEN` on the publish step; the npm CLI uses the job’s OIDC token when trusted publishing is configured.

## Prerequisites (GitHub)

- The workflow declares **`permissions: id-token: write`** (with `contents: read`) so GitHub Actions can mint an OIDC JWT for the job. That is required for OIDC-based flows ([GitHub OIDC](https://docs.github.com/en/actions/concepts/security/openid-connect#how-oidc-integrates-with-github-actions)).
- **Remove `NPM_TOKEN`** from repo secrets after OIDC publishes succeed, if it was added for the old token-based flow.
- **`package.json` `repository.url`**: for GitHub trusted publishing, npm expects this URL to match the GitHub repository; fix mismatches before relying on OIDC ([npm troubleshooting](https://docs.npmjs.com/trusted-publishers/#troubleshooting)).

## `workflow_dispatch` caveat

npm’s troubleshooting notes that with **`workflow_dispatch`** (and reusable workflows), which workflow identity npm checks against your trusted publisher config can differ from the file that contains `npm publish`. If publish fails with auth errors, confirm the **workflow filename** registered on npm matches what npm expects for that run.

## Release discipline

- Bump **`version`** in `package.json` (and lockfile if you version in lock) on the branch you publish **before** running the workflow, merge to the branch you publish from (e.g. `main`), then trigger the workflow so the tarball matches the intended semver.
- Optionally tag the commit in git for traceability; the workflow does not create tags or GitHub Releases.

## Running a publish

1. Merge the version bump to the default branch (or whichever branch this workflow is allowed to run on).
2. **Actions** → **Publish to npm** → **Run workflow**.

## Optional hardening

- On npm, after OIDC publishes are stable, consider **Publishing access** → restrict traditional token publishing and revoke unused automation tokens ([npm trusted publishers](https://docs.npmjs.com/trusted-publishers/)).
- Add a **GitHub Environment** (e.g. `npm`) on the publish job if you register an environment name in npm’s trusted publisher settings; that tightens the OIDC subject and allows approval rules in GitHub.
- For **private npm dependencies** during `npm ci`, trusted publishing still only covers `npm publish`; use a **read-only** granular token on install steps only, not for publish ([npm docs](https://docs.npmjs.com/trusted-publishers/#handling-private-dependencies)).
- Add **`npm run ci:test`** instead of separate build + test if you want a single gate aligned with `package.json` scripts (note interaction with **`prepublishOnly`** running **`build`** again on `npm publish`).
- Extend CI (`.github/workflows/ci.yml`) to run **lint** so PRs match the publish gate.

## Provenance

From **GitHub Actions** with trusted publishing, npm can attach **provenance** automatically when conditions are met (public repo, public package); you do not need `--provenance` on the command for that default path ([npm trusted publishers](https://docs.npmjs.com/trusted-publishers/#automatic-provenance-generation)).
