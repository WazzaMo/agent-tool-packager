# Agent HQ — summary for AI agents

This file summarises the project’s markdown documentation so agents can work effectively in this repo.

## Project overview

**Agent HQ (AHQ)** is a CLI for agentic software development workflows. It standardises how you add prompts, MCP servers, and skills to agentic CLI workflows. Built in Python; config at `~/.ahq/config.yaml` (and user catalog at `~/.ahq/catalog.yaml`). **`AHQ_CONFIG_HOME`**: set this env var to a directory path to override the config/catalog location (e.g. for testing); when unset, `~/.ahq` is used. Package catalogs: **global** (bundled), **user** (from config dir), **project** at `./.ahq-local/catalog.yaml`. Precedence: **project overrides user overrides global**.

## Key commands and behaviour

- **`ahq install`** (no args): uses config `prompt_sources`; copies prompt markdown into the project (default subdir e.g. `prompts/`).
- **`ahq install <name>`**: resolves `<name>` from the merged catalog and copies that package’s assets into the project.
- **`ahq list`**: shows packages (global + user + project). Use `--local-only`, `--global-only`, or `--project-only` to filter.
- **`ahq catalog add <name> <path|url>`**: add a local package to user (or project) catalog.
- **`ahq catalog remove <name>`**: remove a local package only; global packages cannot be removed.
- **`ahq catalog show <name>`**: show package manifest and origin (global vs local).

## Build and test

- **Prerequisites:** Python 3.12



## Documentation and conventions

- **Markdown (doc-guide):** Use `#` for sections; empty line after headings; headings over bold; tables with rows under ~60 chars; Mermaid for diagrams. Notes in `docs/notes/` with date prefix `YYYY-MM-DD-topic.md`; release notes in `docs/release-notes` as `{semver}-Release-{date}.md`.
- **Code (clean-code):** Prefer many small files (about 100–300 lines). Single responsibility; composition and dependency injection; interfaces over inheritance; Liskov substitutability; polymorphism only when it helps clarity.
- **Contributing:** Fork and pull request; no secrets or generated dirs in repo; run tests before PR. See [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/doc-guide.md](docs/doc-guide.md). Implementation plans and architecture notes go in `docs/notes/`; CONTRIBUTING also references `docs/goals.md` and `docs/requirements.md`.

## Concepts (from design notes)

- **Package:** Versioned unit of assets (e.g. markdown) plus a manifest (e.g. `ahq-package.yaml`) with name, version, description, and list of assets. Catalog entries point at paths or URLs; install copies from there into the project.
- **Catalog:** Index of packages (name, version, location). Global = read-only, ahq-defined. Local = user/project-defined; only local entries can be added, removed, or updated. Merged view: same name → local wins.
- **Config (prototype):** `~/.ahq/config.yaml` with `prompt_sources` (dirs or files) and optional `project_prompts_dir` (default e.g. `prompts`). Source dirs are copied one level (no recursion).

## File references

| Topic                    | Location                                             |
|--------------------      |----------------                                      |
| CLI usage, catalog       | [README.md](README.md)                               |
| Configuration            | [docs/configuration.md](docs/configuration.md)       |
| Contributing & schema    | [CONTRIBUTING.md](CONTRIBUTING.md)                   |
| Doc formatting           | [docs/doc-guide.md](docs/doc-guide.md)               |
| Code style               | [docs/clean-code.md](docs/clean-code.md)             |
| Package & catalog        | [docs/notes/2026-02-25-package-metadata-and-catalog.md](docs/notes/2026-02-25-package-metadata-and-catalog.md) |

## Attribution

Contributor attribution: [ThanksTo.md](ThanksTo.md).
