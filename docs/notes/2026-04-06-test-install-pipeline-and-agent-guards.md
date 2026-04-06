# Test note: install pipeline DTOs and agent provider guards

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

# Context

kind: test

This note records automated tests added or materially changed while implementing staged part install inputs, provider `InstallContext`, home-path resolution, and CLI restrictions so only agents with an install provider can be assigned.

# New or updated test files

## `test/file-ops/part-install-input.test.ts`

- Legacy manifest (root `type` + flat `assets`) produces **one** synthetic `StagedPartInstallInput` at **partIndex 1**, correct `partKind`, relative `packagePaths`, and staging accessors.
- Multi-part manifest with `part_1_Skill/` and `part_2_Mcp/` asset paths yields **two** staged parts with matching kinds and path grouping.
- `resolveStagedPartToAbsolute` joins `stagingDir` with staged relative paths and returns a `ResolvedInstallInput` with `isResolvedAbsolutePaths` true and aligned `packagePaths` / `getAgentResolvedPaths()`.

## `test/integration/part-install-input-pipeline.test.ts`

- **YAML on disk** → `loadPackageManifest` → `buildStagedPartInstallInputs`: multi-part enriched fixture returns two parts (`Skill`, `Mcp`) with expected asset paths.
- **`prepareCatalogInstallPartInputs(ctx)`** matches **`buildStagedPartInstallInputs(manifest, pkgDir)`** using a small snapshot of `partIndex`, `partKind`, `packagePaths`, and `getStagingDir()`.

## `test/file-ops/install-context.test.ts`

- **`isProviderAgentId`**: true for supported ids case-insensitively; false for `kiro`, `OpenCode`, etc.
- **`normaliseAgentId`**: maps canonical spellings (e.g. `CoDeX` → `codex`).
- **`normaliseAgentId`** **throws** for unsupported agents, `OpenCode`, and empty string (message includes supported list).

## `test/config/agent-path.test.ts` (`resolveAgentHomePath`)

- Default **`cursor`** home with `null` Station config expands under the real home directory (normalised, no trailing separator).
- Station override of **`home_path`** is honoured for **`cursor`**.

## `test/install/provider-install-context.test.ts`

- **`buildProviderInstallContext`**: with mocked `loadStationConfig` / `loadSafehouseConfig`, **project** `promptScope` yields `layer` `project` and `layerRoot` equal to resolved `agentBase`.
- **Station** `promptScope` yields `layer` `user` and `layerRoot` equal to expanded agent home (e.g. **`.gemini`** under `$HOME`).
- **Unsupported** Safehouse agent (**`kiro`**) causes **`buildProviderInstallContext`** to throw (**Unsupported agent**), matching install-time behaviour.

Uses **`vi.hoisted`** + **`vi.mock`** on **`src/config/load.js`** with **`importOriginal`** so other exports stay real.

## `test/integration/install-rule-docs-multi-agent.test.ts`

- Agent matrix for Rule install from repo docs now uses **cursor, gemini, codex, claude** (replaces **kiro** so every loop uses a provider-supported agent).

## `test/integration/init.test.ts` (agent nomination)

- **`unknown-agent`**: **`atp agent`** and **`atp agent handover to`** exit non-zero with **Unsupported agent** and the supported list (provider check runs **before** Station `agent-paths`).
- **`gemini`** with Station config listing only **cursor** and **claude**: fails with **not configured in the Station** / **agent-paths** (provider passes, Station fails).
- **`kiro`** added explicitly to Station **`agent-paths`**: still fails with **Unsupported agent** (no `AgentProvider` for kiro).

# Pass rate and scope

- All of the above run under **`npm run test:run`**.
- Integration specs invoke the built CLI at **`dist/atp.js`**; **`npm run build`** should run before local integration runs if `dist` is stale. CI runs **build** then **test**.

# References

| Topic | Location |
|-------|----------|
| Part install DTOs | `src/file-ops/part-install-input.ts` |
| Provider install context | `src/file-ops/install-context.ts`, `src/install/install.ts` (`buildProviderInstallContext`) |
| Agent CLI guards | `src/commands/agent.ts` |
| Align plan | `docs/notes/2026-04-05-plan-align-staged-part-install-input.md` |
