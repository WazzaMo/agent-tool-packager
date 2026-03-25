# Multi-type packages: doc and configuration gaps

2026-03-25 · kind: todo

Deferred questions and follow-ups after reading [doc-guide.md](../doc-guide.md), [configuration.md](../configuration.md), and [features/4-multi-type-packages.md](../features/4-multi-type-packages.md).

# Cross-document gaps

| Topic | Note |
|-------|------|
| configuration.md | Describes only the pre–multi-type `atp-package.yaml` layout. No mention of `type: multi`, `parts`, or how station/install behaviour differs. Readers using configuration.md alone will not see the 0.2.3+ model. |
| Single source of truth | Feature 4 duplicates the legacy field table and example from configuration.md. Risk of drift if one file updates without the other. |
| Link from feature doc | The link `[configuration.md](docs/configuration.md)` is relative to `docs/features/`; it likely resolves to `docs/features/docs/configuration.md` (broken). Prefer `../configuration.md` or a root-absolute path consistent with other docs. |

# Feature 4 content issues (fix or track)

| Item | Detail |
|------|--------|
| Typo | Line 41: "versionn" → "version". |
| Example YAML | Under `parts`, `components` / `bundles` list indentation looks wrong (`- SKILL.md` and the `bundles` entry should nest under the mapping). Confirm valid YAML and match intended schema. |
| Heading depth | Doc mixes `##` and `#` after the title; doc-guide prefers consistent spacing and heading use—minor cleanup if aligning all feature docs. |

# Schema and behaviour questions

| Question | Why it matters |
|----------|----------------|
| Root `components` / `bundles` when `type: multi` | Table marks them optional at root while `parts` is mandatory. Can a multi package use only root-level components/bundles, only `parts`, or both? Rules for merge vs reject should be explicit for implementers and validators. |
| Allowed `part.type` values | Same vocabulary as legacy root `Type` (Rule, Skill, Mcp, Command, Experimental)? Any restriction on duplicate types across parts? |
| Root `usage` optional | Legacy layout required root `usage`; multi layout makes root `usage` optional. Document migration: is old root usage split across parts or dropped? |
| ATP vs package version | Feature speaks of "Version 0.2.3" / "0.3.0" for ATP and migration; configuration shows `configuration.version` in `atp-config.yaml`. Clarify relationship between ATP release, config schema version, and `atp-package.yaml` format—avoid readers conflating them. |
| 0.3.0 "by default" | "Create multi-type packages by default" reads like CLI/template default; spell out what artefacts (e.g. `atp init`, samples) change vs runtime still accepting legacy manifests. |

# Smaller consistency notes

| Note | Detail |
|------|--------|
| Type spelling | Examples use `Mcp` and `Skill`; ensure CONTRIBUTING/schema and code use one canonical casing. |
| `version => 0.2.3` | Prefer consistent comparator wording (e.g. "≥ 0.2.3") for readability in rendered docs. |

# Suggested follow-ups (not done in this note)

1. Fix relative link and YAML example in feature 4; fix typo.
2. Extend configuration.md with a short subsection pointing at feature 4 and summarising multi-type, or fold the authoritative table into one place with the other doc linking to it.
3. Add a short "migration" subsection: single file from 0.2.2 → 0.2.3 layout (field mapping).
4. Resolve open schema questions in a plan or concern note before locking implementation.
