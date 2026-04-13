# Test note: install pipeline DTOs and agent provider guards

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

# Context

**Kind:** test

This note records automated tests added or materially changed while implementing staged part install inputs, provider `InstallContext`, home-path resolution, and CLI restrictions so only agents with an install provider can be assigned.

# New or updated test files

## `test/file-ops/part-install-input.test.ts`

### Legacy single-type manifest

Root **`type`** plus flat **`assets`** produces **one** synthetic **`StagedPartInstallInput`** at **partIndex 1**, with correct **`partKind`**, relative **`packagePaths`**, and staging accessors.

### Multi-part manifest

**`part_1_Skill/`** and **`part_2_Mcp/`** asset paths yield **two** staged parts with matching kinds and path grouping.

### Resolve to absolute paths

**`resolveStagedPartToAbsolute`** joins **`stagingDir`** with staged relative paths and returns a **`ResolvedInstallInput`** with **`isResolvedAbsolutePaths`** true and aligned **`packagePaths`** / **`getAgentResolvedPaths()`**.

## `test/integration/part-install-input-pipeline.test.ts`

### YAML through staging builders

**YAML on disk** → **`loadPackageManifest`** → **`buildStagedPartInstallInputs`**: the multi-part enriched fixture returns two parts (**`Skill`**, **`Mcp`**) with expected asset paths.

### Install helper parity

**`prepareCatalogInstallPartInputs(ctx)`** matches **`buildStagedPartInstallInputs(manifest, pkgDir)`** on a small snapshot of **`partIndex`**, **`partKind`**, **`packagePaths`**, and **`getStagingDir()`**.

## `test/file-ops/install-context.test.ts`

### Provider agent membership

**`isProviderAgentId`** is true for supported ids case-insensitively and false for **`kiro`**, **`OpenCode`**, and similar unsupported values.

### Canonical agent id

**`normaliseAgentId`** maps odd casing (for example **`CoDeX`** → **`codex`**).

### Rejected agent ids

**`normaliseAgentId`** throws for unsupported agents, **`OpenCode`**, and empty string; the message includes the supported list.

## `test/config/agent-path.test.ts` (`resolveAgentHomePath`)

### Default cursor home

With **`null`** Station config, the default **`cursor`** home expands under the real home directory (normalised, no trailing separator).

### Station override

A Station override of **`home_path`** is honoured for **`cursor`**.

## `test/install/provider-install-context.test.ts`

### Project prompt scope

With mocked **`loadStationConfig`** / **`loadSafehouseConfig`**, **project** **`promptScope`** yields **`layer`** **`project`** and **`layerRoot`** equal to resolved **`agentBase`**.

### Station prompt scope

**Station** **`promptScope`** yields **`layer`** **`user`** and **`layerRoot`** equal to the expanded agent home (for example **`.gemini`** under **`$HOME`**).

### Unsupported safehouse agent

An unsupported Safehouse agent (**`kiro`**) makes **`buildProviderInstallContext`** throw (**Unsupported agent**), matching install-time behaviour.

Uses **`vi.hoisted`** and **`vi.mock`** on **`src/config/load.js`** with **`importOriginal`** so other exports stay real.

## `test/integration/install-rule-docs-multi-agent.test.ts`

### Agent matrix for rule installs

The matrix for Rule install from repo docs now uses **cursor**, **gemini**, **codex**, and **claude** (replacing **kiro** so every loop uses a provider-supported agent).

## `test/integration/init.test.ts` (agent nomination)

### Unknown agent name

**`unknown-agent`**: **`atp agent`** and **`atp agent handover to`** exit non-zero with **Unsupported agent** and the supported list (provider check runs **before** Station **`agent-paths`**).

### Provider passes but Station blocks

**`gemini`** with Station config listing only **cursor** and **claude** fails with **not configured in the Station** / **`agent-paths`** (provider passes, Station fails).

### Kiro in Station paths only

**`kiro`** added explicitly to Station **`agent-paths`** still fails with **Unsupported agent** (no **`AgentProvider`** for kiro).

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
