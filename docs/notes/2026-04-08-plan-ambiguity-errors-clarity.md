# Plan: Clearer ambiguity errors for config merges

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

# Context

`atp install` merges packaged MCP and hook payloads into on-disk agent JSON. When an existing server or handler **matches by name / dedupe key** but **differs in configuration**, the merge layer throws unless **`--force-config`** is set (or **`--skip-config`** skips the merge entirely).

Recent work improved user-facing text by:

- Labelling the **exact target file** in ambiguity errors (e.g. **`.gemini/settings.json`**, **`.cursor/mcp.json`**, **`.cursor/hooks.json`**) via **`mergeTargetLabel`** / **`mergeConfigTargetLabel`**.
- Expanding **`atp install --help`** for **`--force-config`** and **`--skip-config`** to mention Cursor and Gemini paths.

This note recommends **next steps** if we want ambiguity errors to be even clearer for operators and tooling.

# Goals

- Users immediately see **what conflicted**, **where**, and **what to run next** without reading source.
- Messages stay **accurate per agent** (Cursor vs Gemini vs future Claude/Codex).
- Optional: support **automation** (stable error codes, parseable fields) without breaking the human-readable line.

# Current behaviour (baseline)

| Piece                                                 | Role                                            |
|-------------------------------------------------------|-------------------------------------------------|
| **`McpMergeAmbiguousError`**                          | Same MCP server name, different config.         |
| **`HooksMergeAmbiguousError`**                        | Same hook dedupe key - see (1)                  |
| **`mergeConfigTargetLabel(layerRoot, relativePath)`** | Builds labels like **`.gemini/settings.json`**. |
| **CLI**                                               | Error message on install failure; see (2)       |

 1. Same hook dedupe key (e.g. `id:…`), different handler body.

 2. **`console.error(String(err))`** on install failure; Commander **`--help`** documents flags.

Structured fields already exist on errors (**`code`**, **`serverName`**, **`eventName`**, **`dedupeKey`**, etc.) but are **not** printed as JSON to the user today.

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

1. [ ] Unify **MCP** and **hooks** ambiguity strings to the **sentence shape** in §1 (tweak wording for consistency).
2. [ ] Add **`formatInstallUserError`** + optional **hint** line in **`install.ts`** for known merge error types (§2).
3. [ ] Document the **sentence shape** in **Feature 5** or **configuration** doc under “Merge policy / troubleshooting”.
4. [ ] Add **`--verbose`** logging for structured merge errors (§3).
5. [ ] Revisit **§6** only after UX feedback on Gemini multi-merge.

# References

| Topic | Location |
|-------|----------|
| Merge target label helper | `src/file-ops/merge-config-target-label.ts` |
| MCP ambiguity | `src/file-ops/mcp-merge/errors.ts`, `mcp-json-merge.ts` |
| Hooks ambiguity | `src/file-ops/hooks-merge/errors.ts`, `cursor-hooks-json-merge.ts` |
| Provider apply + labels | `src/provider/apply-provider-plan.ts` |
| Install error surface | `src/install/install.ts` |
| Install flags | `src/commands/install.ts` |
| Agent matrix | [Feature 5 — Installer providers](../features/5-installer-providers-for-known-agents.md) |
