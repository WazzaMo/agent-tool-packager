# Agent HQ — summary for AI agents

This file summarises the project’s markdown documentation so agents can work effectively in this repo.

## Project overview

**Agent HQ (AHQ)** is a CLI for agentic software development workflows. It standardises how you add prompts, MCP servers, and skills to agentic CLI workflows. Built in **TypeScript** (Node.js 20+); config at `~/.ahq_station/config.yaml` (and user catalog at `~/.ahq_station/ahq_catalog.yaml`). **`STATION_PATH`**: set this env var to override the Station location (e.g. for testing); when unset, `~/.ahq_station` is used. Package catalogs: **global** (bundled), **user** (from Station), **project** at `./.ahq-local/catalog.yaml`. Precedence: **project overrides user overrides global**.

## Key commands and behaviour

- **`ahq station init`**: create ~/.ahq_station (or STATION_PATH) with config, catalog, manifests.
- **`ahq safehouse init`**: create .ahq_safehouse in the current project.
- **`ahq agent <name>`**: assign agent (e.g. cursor) to project; configures safehouse for that agent.
- **`ahq agent handover to <name>`**: switch to a new agent; re-installs skills for new agent.
- **`ahq catalog list`**: list packages in the merged catalog (--global-only, --project-only, --user-only).
- **`ahq install <name>`**: install package from catalog. Use `--project` (default) or `--user`; `--dependencies` to install deps.
- **`ahq station list`** / **`ahq safehouse list`**: list installed packages. **`ahq remove station <pkg>`** / **`ahq remove safehouse <pkg>`**: remove packages; use `--exfiltrate` with station remove to copy to Safehouses first.

## Build and test

- **Prerequisites:** Node.js 20+
- **Commands:** `npm install`, `npm run build`, `npm run dev` (development)



## Documentation and conventions

- **Markdown (doc-guide):** Use `#` for sections; empty line after headings; headings over bold; tables with rows under ~60 chars; Mermaid for diagrams. Notes in `docs/notes/` with date prefix `YYYY-MM-DD-topic.md`; release notes in `docs/release-notes` as `{semver}-Release-{date}.md`.
- **Code (clean-code):** Prefer many small files (about 100–300 lines). Single responsibility; composition and dependency injection; interfaces over inheritance; Liskov substitutability; polymorphism only when it helps clarity.
- **Contributing:** Fork and pull request; no secrets or generated dirs in repo; run tests before PR. See [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/doc-guide.md](docs/doc-guide.md). Implementation plans and architecture notes go in `docs/notes/`; CONTRIBUTING also references `docs/goals.md` and `docs/requirements.md`.

## Concepts (from design notes)

- **Package:** Versioned unit of assets (e.g. markdown) plus a manifest (e.g. `ahq-package.yaml`) with name, version, description, and list of assets. Catalog entries point at paths or URLs; install copies from there into the project.
- **Catalog:** Index of packages (name, version, location). Global = read-only, ahq-defined. Local = user/project-defined; only local entries can be added, removed, or updated. Merged view: same name → local wins.
- **Config (prototype):** `~/.ahq_station/ahq_station.yaml` with `prompt_sources` (dirs or files) and optional `project_prompts_dir` (default e.g. `prompts`). Source dirs are copied one level (no recursion).

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
