# Todo: npm publish via GitHub Actions (manual)

## Goal

Publish `@wazzamo-agent-tools/packager` from CI using a **manually triggered** workflow (see `.github/workflows/publish-npm.yml`).

## Prerequisites (npm)

- The `@wazzamo-agent-tools` scope exists on [npmjs.com](https://www.npmjs.com) and the publishing account has **publish** rights for that scope.
- For a **public** scoped package, publishes must use public access. The workflow runs `npm publish --access public`. Optionally add `publishConfig.access: "public"` in `package.json` so local `npm publish` matches CI.
- Create an npm **automation** (or granular publish) token and add it to the GitHub repo as secret **`NPM_TOKEN`**.

## Prerequisites (GitHub)

- Repository → **Settings** → **Secrets and variables** → **Actions** → create **`NPM_TOKEN`** with the npm token value.
- Alternative to a long-lived token: later migrate to **Trusted publishing (OIDC)** on the npm package and drop `NPM_TOKEN`; that is not configured in the current workflow.

## Release discipline

- Bump **`version`** in `package.json` (and lockfile if you version in lock) on the branch you publish **before** running the workflow, merge to the branch you publish from (e.g. `main`), then trigger the workflow so the tarball matches the intended semver.
- Optionally tag the commit in git for traceability; the workflow does not create tags or GitHub Releases.

## Running a publish

1. Merge the version bump to the default branch (or whichever branch this workflow is allowed to run on).
2. **Actions** → **Publish to npm** → **Run workflow**.

## Optional hardening

- Add **`npm run ci:test`** instead of separate build + test if you want a single gate aligned with `package.json` scripts (note interaction with **`prepublishOnly`** running **`build`** again on `npm publish`).
- Add **`permissions: id-token: write`** and **`npm publish --provenance`** after configuring npm **Trusted publishers** for this repo.
- Extend CI (`.github/workflows/ci.yml`) to run **lint** so PRs match the publish gate.
