# Plan: Clearer ambiguity errors for config merges

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

# Context

`atp install` merges packaged MCP and hook payloads into on-disk agent JSON. When an existing server or handler **matches by name / dedupe key** but **differs in configuration**, the merge layer throws unless **`--force-config`** is set (or **`--skip-config`** skips the merge entirely).

Earlier work labelled the **exact target file** in ambiguity errors via **`mergeTargetLabel`** / **`mergeConfigTargetLabel`**, and expanded **`atp install --help`** for **`--force-config`** / **`--skip-config`** (Cursor + Gemini paths).

This note records the **plan**, **implementation status** (below), and **deferred** items. Remaining doc tasks (Feature 5 / troubleshooting prose) are checklist items still open.

# Goals

- Users immediately see **what conflicted**, **where**, and **what to run next** without reading source.
- Messages stay **accurate per agent** (Cursor vs Gemini vs future Claude/Codex).
- Optional: support **automation** (stable error codes, parseable fields) without breaking the human-readable line.

# Current behaviour (after implementation)

| Piece                                                 | Role                                                                 |
|-------------------------------------------------------|----------------------------------------------------------------------|
| **`McpMergeAmbiguousError`**                          | Canonical one-line message + readonly **`mergeTargetLabel`**.        |
| **`HooksMergeAmbiguousError`**                        | Same pattern; hook event + dedupe key in the message — see (1).      |
| **`mergeConfigTargetLabel(layerRoot, relativePath)`** | Builds labels like **`.gemini/settings.json`**.                      |
| **`formatInstallUserFailureLines`**                   | Install stderr: ambiguity message, optional JSON, then hint — (2).   |
| **`mergeAmbiguityVerboseRequested`**                  | True when **`--verbose`** or **`DEBUG`** contains **`atp`** — (3).   |
| **`executeCatalogInstall`**                           | Rethrows merge ambiguity errors so they are not wrapped — (4).      |
| **CLI**                                               | **`atp install --verbose`**; **`--help`** also lists **`--verbose`**. |

 1. Same hook dedupe key (e.g. `id:…`), different handler body.

 2. Hint text: **`Hint: Packages only add or replace entries they own; other keys in the file are preserved.`** (constant **`MERGE_CONFIG_AMBIGUITY_HINT`**).

 3. **`DEBUG`** tokens are split on commas and whitespace (e.g. **`DEBUG=foo,atp`**).

 4. Other install failures still surface as **`Install copy or manifest update failed: …`** with the underlying message.

**Canonical MCP line (example):**

```text
MCP server "name" conflicts with existing entry in .cursor/mcp.json; use --force-config to replace it or --skip-config to skip this merge.
```

**Canonical hooks line (example):**

```text
Hook handler for event "beforeSubmit" (id:atp-force-hook) conflicts with existing entry in .cursor/hooks.json; use --force-config to replace it or --skip-config to skip this merge.
```

**Verbose JSON (one line on stderr between message and hint):** **`{ code, serverName, mergeTargetLabel }`** (MCP) or **`{ code, eventName, dedupeKey, mergeTargetLabel }`** (hooks).

# Implementation status (shipped)

- **§1** — **`McpMergeAmbiguousError`** and **`HooksMergeAmbiguousError`** messages follow the **what / where / action** sentence shape; both classes expose **`mergeTargetLabel`** for tests and verbose output.
- **§2** — **`src/install/format-install-user-failure.ts`**: **`formatInstallUserFailureLines`**, **`MERGE_CONFIG_AMBIGUITY_HINT`**; **`installPackage`** prints returned lines on failure.
- **§3** — **`atp install --verbose`**; equivalent when **`mergeAmbiguityVerboseRequested`** is true via **`DEBUG`** and **`atp`** token.
- **Install path** — **`executeCatalogInstall`** rethrows ambiguity errors so the hint and verbose lines apply; generic wrap only for other failures.
- **Tests** — Unit expectations on exact messages in **`test/file-ops/mcp-json-merge.test.ts`**, **`hooks-json-merge.test.ts`**, **`test/install/format-install-user-failure.test.ts`**, **`test/provider/gemini-agent-provider.test.ts`**; integration coverage in **`install-force-config-conflicts.test.ts`**, **`install-force-config-conflicts-gemini.test.ts`** (including **`--verbose`** JSON), **`install-cli-config-flags-help.test.ts`**.

# AgentProvider implementations

This plan applies uniformly to every **`AgentProvider`** only when structured MCP / hooks merges go through the shared path: **`applyPlan`** should delegate to **`applyProviderPlan`**, which always passes **`mergeConfigTargetLabel(layerRoot, action.relativeTargetPath)`** into the merge helpers. If a future provider implements **`applyPlan`** without that (or omits **`mergeTargetLabel`** when calling **`mergeMcpJsonDocument`** / **`mergeHooksJsonDocument`** directly), users see the generic fallback *“the merged configuration file”* and the improvements above do not fully apply. **Requirement for new providers:** use **`applyProviderPlan`** for **`mcp_json_merge`** and **`hooks_json_merge`**, or pass an equivalent **`mergeTargetLabel`** built from the same **`layerRoot`** and **`relativeTargetPath`** contract.

# Recommendations (best path)

## 1. Keep a single canonical sentence shape (highest ROI)

Standardise the **first line** of every merge ambiguity error to:

1. **What** — conflict type (MCP server name or hook event + id).
2. **Where** — **`mergeTargetLabel`** (already done for provider + legacy **`mcp.json`** path).
3. **Action** — **`--force-config`** / **`--skip-config`** (unchanged).

Example pattern:

```text
MCP server "x" conflicts with existing entry in .gemini/settings.json; use --force-config to replace it or --skip-config to skip this merge.
```

Apply the same pattern to **hooks** (event + dedupe key + file label). Avoid agent-specific prose in the **middle** of the sentence; the **path** already implies Cursor vs Gemini.

**Why:** One mental model for users and docs; minimal code churn; works in terminal and CI logs.

## 2. Add one short “hint” line on stderr (optional second line)

After the primary **`Error:`** message, emit a **single** non-redundant hint, e.g.:

```text
Hint: Packages only add or replace entries they own; other keys in the file are preserved.
```

Implement in **`install.ts`** (or a tiny **`formatInstallUserError(err)`** helper) so **all** merge failures get the hint **once**, not duplicated inside every `Error` subclass.

**Why:** Reduces “did ATP wipe my file?” anxiety without ballooning every exception constructor.

## 3. Surface structured fields in debug mode only

Add **`atp install --verbose`** (or **`DEBUG=atp`**) that logs a **JSON one-liner** of `{ code, serverName | eventName, mergeTargetLabel, … }` for **`McpMergeAmbiguousError`** / **`HooksMergeAmbiguousError`**.

**Why:** Keeps default output clean; helps support and script authors without committing to a stable CLI JSON schema for v1.

## 4. Defer: machine-readable errors on stdout

A **`--json`** or structured exit payload is valuable but touches **every** failure path and exit code policy. Treat as a **later** feature once ambiguity copy and **`--verbose`** prove sufficient.

## 5. Defer: “diff” snippets in the message

Showing even a **truncated** deep-equal diff risks **noise**, **secrets** (env in MCP tables), and **locale/size** issues. Prefer **`--verbose` JSON** with **hashes** or **key paths** changed if forensic detail is needed.

## 6. Same-file double merge (Gemini **`settings.json`**)

When **MCP** and **hooks** both target **`settings.json`**, failures are **per action**; the **`mergeTargetLabel`** is the same for both. If confusion appears in the field, add **merge kind** to the message: *“(MCP servers slice)”* vs *“(hooks slice)”* — only if user reports repeat mistakes.

# Implementation checklist (suggested order)

1. [x] Unify **MCP** and **hooks** ambiguity strings to the **sentence shape** in §1 (tweak wording for consistency).
2. [x] **AgentProvider** contributor guide: [contributor-guide-agent-providers.md](../contributor-guide-agent-providers.md) (w **`applyProviderPlan`** / **`mergeTargetLabel`**); Feature 5 links to it from the merge-policy section.
3. [x] Add **`formatInstallUserFailureLines`** + **hint** line via **`install.ts`** for merge ambiguity errors (§2); helper lives in **`format-install-user-failure.ts`**.
4. [x] Document merge policy in **Feature 5**, **`docs/configuration.md`**, and **README** (see **Merge policy and troubleshooting for atp install**; **Catalog install and merged agent JSON**).
5. [x] Add **`--verbose`** logging for structured merge errors (§3); **`DEBUG`** with **`atp`** supported.
6. [ ] Revisit **§6** only after UX feedback on Gemini multi-merge.

# References

| Topic | Location |
|-------|----------|
| Merge target label helper | `src/file-ops/merge-config-target-label.ts` |
| MCP ambiguity | `src/file-ops/mcp-merge/errors.ts`, `mcp-json-merge.ts` |
| Hooks ambiguity | `src/file-ops/hooks-merge/errors.ts`, `hooks-json-merge.ts` |
| Provider apply + labels | `src/provider/apply-provider-plan.ts` |
| Install stderr formatting + hint + verbose | `src/install/format-install-user-failure.ts` |
| Install orchestration (rethrow ambiguity) | `src/install/install.ts` |
| Install flags | `src/commands/install.ts` |
| Agent matrix | [Feature 5 — Installer providers](../features/5-installer-providers-for-known-agents.md) |
