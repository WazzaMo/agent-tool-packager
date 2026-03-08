# Package developer support — review and open questions

Review of [2-package-developer-support.md](../features/2-package-developer-support.md) from multiple perspectives (orchestrator, product-manager, software-engineer, test-runner, security-auditor). This note records what information is needed and what questions remain before implementation.

## Summary

The feature describes a clear workflow: create skeleton → set type → validate → set name/copyright/license → add assets (with staging) → validate → add to manifest. To implement it we need decisions on manifest filename, catalog vs manifest terminology, stage.tar behaviour, and validation schema; and we need acceptance criteria and test cases for each command.

---

## 1. Manifest filename: package.yaml vs ahq-package.yaml

The feature says `ahq create package skeleton` **produces package.yaml**. Elsewhere in the project:

- [AGENTS.md](../../AGENTS.md) and [2026-02-25-package-metadata-and-catalog.md](2026-02-25-package-metadata-and-catalog.md) refer to **ahq-package.yaml** (or both).
- [resolve.ts](../../src/install/resolve.ts) accepts **both** `ahq-package.yaml` and `package.yaml` via `MANIFEST_NAMES`.

**Question:** Should the skeleton command create `package.yaml` (as in the feature) or `ahq-package.yaml` for consistency with existing docs and install behaviour? If we keep `package.yaml`, should we state explicitly that install will accept either name?

---

## 2. “User package manifest” vs catalog

The feature says: “Adding the package to the **user package manifest** should succeed” and “added to **user package manifest**”.

Configuration and catalog docs use:

- **Catalog** (e.g. `~/.ahq_station/ahq_catalog.yaml`) as the index of packages the user can install.
- **Manifest** (e.g. `ahq-package.yaml`) as the file inside a package that describes that package.

**Question:** Does “user package manifest” mean “user catalog” (i.e. add an entry to the user’s catalog so the package can be installed from this machine)? If so, aligning the feature wording to “user catalog” would avoid confusion with the in-package manifest.

---

## 3. stage.tar: location, format, and lifecycle

The feature says assets are staged by “adding them to **stage.tar** and listing the filenames in the assets list in the package.yaml file”.

**Information needed:**

- **Where** does `stage.tar` live? Package root (e.g. next to `package.yaml`)? A build/output directory? Is it in `.gitignore` by default?
- **Format:** Plain tar? Gzip? Who consumes it (only `ahq manifest add package` / install, or also other commands)?
- **Lifecycle:** Is stage.tar the source of truth for “what gets published”, or is it regenerated from the assets list when needed? Can the developer edit the assets list by hand and then “sync” to stage.tar, or is `ahq package asset add/remove` the only way?

---

## 4. Validation schema and “missing” fields

Validation is used to decide “can this package be added to the manifest” and to drive the output of `ahq package summary`. The feature lists what’s missing (e.g. name, file assets, usage/help) but not the full set of mandatory vs optional fields.

**Information needed:**

- **Mandatory minimal set** for “package appears complete”: name, type, assets (non-empty?). Anything else (e.g. version, description)?
- **Optional fields** shown in summary: license, copyright. Are “usage (help) information” and “Developer” mandatory or optional? The feature says “usage” is in the missing list for an incomplete package but doesn’t show it in the final summary example.
- **Schema:** Will validation be driven by a single shared schema (e.g. for both `ahq validate package` and `ahq manifest add package`)? Where will that schema live (types, JSON Schema, or inline in code)?

---

## 5. Package types and installation paths

Package types (rule, skill, MCP, shell/executable, experimental) are listed; the feature says type “selects a path for installation to a Station or Safehouse”. Existing code has `ASSET_TYPES_TO_AGENT_SUBDIR` and config has agent paths (e.g. rule, skills, commands).

**Question:** For “Shell scripts, or other executables”, does the feature intend these to map to the existing `commands` (or similar) path in agent config, and should the type name in the CLI match the config key (e.g. `program` vs `commands`)? A one-line mapping in the feature or in configuration docs would help.

---

## 6. Acceptance criteria and test cases

From a test-runner perspective, each command needs clear pass/fail and output expectations.

**Information needed:**

- **ahq create package skeleton:** Exit code; exact filename created; default content of package.yaml (e.g. only type placeholder or more).
- **ahq package type &lt;type>:** Exit code; behaviour when overwriting; allowed type values (rule, skill, mcp?, shell?, experimental?).
- **ahq validate package:** Exit 0 vs non-zero; exact message when incomplete vs complete; whether stderr vs stdout is specified.
- **ahq manifest add package:** Exit code on validation failure vs success; message when “added to user package manifest” (or catalog).
- **ahq package name / copyright / license:** Exit code; overwrite behaviour; format of copyright (single string vs two strings as in the example).
- **ahq package summary:** Exit code; format of “Missing” list and “Package summary” (machine-parseable or human-only).
- **ahq package asset add:** Exit code; one file vs multiple; behaviour when path is missing or outside package root (path traversal); whether paths in assets are stored relative to package root and normalised.

A short “Acceptance criteria” subsection in the feature (or a linked story) listing these would make test design and implementation unambiguous.

---

## 7. Security and input handling

- **Copyright / license / name:** User-supplied strings written into package.yaml. Do we need length limits or sanitization (e.g. newlines, control characters) to avoid broken YAML or misuse?
- **Asset paths:** `ahq package asset add path/to/file.md` — validate that the path is under the package root (or current dir) to avoid path traversal. Is that in scope for this feature?

---

## 8. Wording and consistency

- **“summarise” vs “summary”:** Feature uses both (`ahq package summary`, “summarise feature”, “validate logic”). Prefer one term for the command and one for the capability.
- **“Developer” in summary output:** Example shows “Developer: Warwick Molloy” but the set command is “copyright”; clarify whether “Developer” is derived from copyright or a separate field.

---

## 9. Orchestrator / breakdown

For implementation planning, the feature breaks naturally into stories, for example:

1. **Skeleton:** `ahq create package skeleton` → create package.yaml (or ahq-package.yaml) with minimal content.
2. **Type:** `ahq package type <type>` → set/overwrite type in manifest.
3. **Validate:** `ahq validate package` → run validation rules, exit 0 only when complete, output missing fields.
4. **Name/copyright/license:** `ahq package name/copyright/license` → set fields, exit 0.
5. **Summary:** `ahq package summary` → use validation logic, print summary and missing list.
6. **Asset add:** `ahq package asset add <paths>` → copy into stage.tar, append to assets list.
7. **Manifest add (catalog):** `ahq manifest add package` → validate then add package to user catalog.

Stories 3 and 5 depend on a shared validation definition (see section 4). Story 6 depends on stage.tar decisions (section 3).

---

## Next steps

- Resolve manifest filename (1) and catalog vs manifest wording (2).
- Define stage.tar location, format, and lifecycle (3).
- Define validation schema and mandatory/optional fields (4).
- Clarify type → path mapping for all types (5).
- Add or link acceptance criteria and test expectations (6).
- Confirm security scope for user input and asset paths (7).
- Align terminology and “Developer” field (8).

Once these are decided, the breakdown in section 9 can be turned into concrete stories in `docs/stories/` for implementation.
