# Package developer support — follow-up review

Follow-up to [2026-03-08-package-developer-support-review.md](2026-03-08-package-developer-support-review.md). This note checks whether recent changes to [configuration.md](../configuration.md) and [2-package-developer-support.md](../features/2-package-developer-support.md) have addressed the issues and open questions raised there.

## Summary

Several review items are **addressed** (manifest filename, catalog vs manifest wording, stage.tar location/format, mandatory/optional schema). Others are **partially addressed** (stage.tar lifecycle, validation/usage, type→path mapping, acceptance criteria, terminology). **Security** and one **configuration consistency** (config filename) are still open.

---

## 1. Manifest filename: package.yaml vs ahq-package.yaml

**Review asked:** Skeleton should create `package.yaml` or `ahq-package.yaml`? If `package.yaml`, state that install accepts either?

**Current docs:** The feature doc now states that `ahq create package skeleton` **produces ahq-package.yaml** (line 26) and uses `ahq-package.yaml` throughout.

**Verdict:** Addressed. Filename is consistently **ahq-package.yaml**.

---

## 2. "User package manifest" vs catalog

**Review asked:** Does "user package manifest" mean "user catalog"? Align wording to avoid confusion with in-package manifest.

**Current docs:** The feature doc uses **"user package catalog"** and the command **`ahq catalog add package`** (e.g. lines 67, 153–168). The phrase "user package manifest" no longer appears in this context.

**Verdict:** Addressed. Wording is aligned to **catalog** for the user index.

---

## 3. stage.tar: location, format, and lifecycle

**Review asked:** Where does stage.tar live? Format (plain tar / gzip)? Who consumes it? Is it source of truth or regenerated? Can developer edit assets list by hand and sync?

**Current docs:**

- **Location:** "adding them to stage.tar in the same directory, the current directory" — i.e. package root (feature doc, lines 128–129).
- **Format:** Plain tar for staging; "The stage file will be gziped and the output called package.tar.gz" when adding to catalog (lines 161–162). Layout is "just the files without any subdirectory" for assets; bundles keep directory structure (lines 130–131, 212–216).
- **Lifecycle:** Still not stated explicitly: whether stage.tar is the only source of truth or can be regenerated from the assets list, or whether hand-editing the manifest and syncing is supported.

**Verdict:** Partially addressed. Location and format are clear. Lifecycle (and .gitignore) not defined.

---

## 4. Validation schema and mandatory/optional fields

**Review asked:** Mandatory minimal set; optional fields; whether "usage" is mandatory/optional; single shared schema and where it lives.

**Current docs:** The feature doc has a new **"ahq-package.yaml layout"** section with a table: **Name, Type, assets** = mandatory; **Developer, License, Version, Copyright, bundles** = optional (lines 168–179). "Usage (help) information" remains in the validation missing list (lines 59, 79) but is not a separate field in the schema table — so it is implied as required for "complete" but not a manifest key. No statement yet on where the schema lives (types, JSON Schema, or code).

**Verdict:** Partially addressed. Mandatory vs optional is explicit. "Usage" and shared schema location still to be decided.

---

## 5. Package types and installation paths

**Review asked:** Map type (e.g. shell/executable) to config path (e.g. commands); one-line mapping in feature or configuration docs.

**Current docs:** [configuration.md](../configuration.md) shows `agent-paths` with keys such as `rule`, `commands`, `skills` (lines 68–74). The feature doc lists types: Rule, Skill, MCP, Shell/executables, Experimental (lines 31–39). There is no explicit sentence mapping type → config key (e.g. rule → rule, skill → skills, shell → commands).

**Verdict:** Not addressed. A one-line mapping (in the feature doc or configuration) would still help.

---

## 6. Acceptance criteria and test cases

**Review asked:** For each command: exit codes, exact messages, pass/fail expectations; a short "Acceptance criteria" subsection or linked story.

**Current docs:** The feature doc gives richer behaviour and messages (e.g. "Command exits with non-zero result", "Exit code 0 returned", concrete validation and summary output). There is no dedicated **"Acceptance criteria"** subsection listing these in one place for test design.

**Verdict:** Partially addressed. Behaviour is clearer; formal acceptance criteria subsection still missing.

---

## 7. Security and input handling

**Review asked:** Length limits or sanitization for name/copyright/license; path traversal validation for asset paths.

**Current docs:** Not mentioned in configuration or feature docs.

**Verdict:** Not addressed. Still open for implementation.

---

## 8. Wording and consistency

**Review asked:** Prefer one term for the command ("summary") and one for the capability ("summarise"); clarify whether "Developer" is derived from copyright or a separate field.

**Current docs:** Command is `ahq package summary`; the doc still says "AHQ can **summarise** the package" (line 99) — mixed use remains. The **"ahq-package.yaml layout"** table lists **Developer** and **Copyright** as separate optional fields (lines 172–176), so "Developer" is its own field, not derived from copyright.

**Verdict:** Partially addressed. Developer vs copyright is clear. "Summarise"/"summary" could be standardised (e.g. "summary" for both command and capability).

---

## 9. Configuration doc consistency (additional)

**Current docs:** In [configuration.md](../configuration.md), the station directory structure (lines 34–36, 41–42) names **ahq_station.yaml** and **ahq_catalog.yaml**, but the "Station Configuration" section (lines 56–58) refers to **config.yaml** for the config file path. This inconsistency predates the package-developer review but is worth resolving (e.g. config file named consistently as either `config.yaml` or `ahq_station.yaml`).

---

## Next steps

- **Done or largely done:** Manifest filename (1), catalog wording (2), stage.tar location/format (3), mandatory/optional schema (4), Developer field (8).
- **Still to clarify:** stage.tar lifecycle and .gitignore (3); "usage" and schema location (4); type→path mapping (5); acceptance criteria subsection (6); security scope (7); summarise/summary (8); config filename in configuration.md (9).

Once (3)–(9) are decided, the story breakdown in the original review (section 9) can be turned into concrete stories for implementation.
