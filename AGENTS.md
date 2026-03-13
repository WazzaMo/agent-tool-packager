# Agent Tool Packager (ATP) — summary for AI agents

This file summarises the project’s markdown documentation so agents can work effectively in this repo.

## Project overview

**Agent Tool Packager (ATP)** is a CLI for agentic software development workflows. It standardises how you add prompts, MCP servers, and skills to agentic CLI workflows. Built in **TypeScript** (Node.js 20+); config at `~/.atp_station/atp-config.yaml`; one catalog at `~/.atp_station/atp-catalog.yaml` (index of available packages, standard + user). **`STATION_PATH`**: set this env var to override the Station location (e.g. for testing); when unset, `~/.atp_station` is used. The project safehouse (`./.atp_safehouse`) holds only a manifest of installed packages, not a catalog.

## Key commands and behaviour

- **`atp station init`**: create ~/.atp_station (or STATION_PATH) with config, catalog, manifests.
- **`atp safehouse init`**: create .atp_safehouse in the current project.
- **`atp agent <name>`**: assign agent (e.g. cursor) to project; configures safehouse for that agent.
- **`atp agent handover to <name>`**: switch to a new agent; re-installs skills for new agent.
- **`atp catalog list`**: list packages in the station catalog.
- **`atp install <name>`**: install package from catalog. Use `--project` (default) or `--station` for prompts; `--user-bin` (default) or `--project-bin` for binaries. `--dependencies` to install deps.
- **`atp station list`** / **`atp safehouse list`**: list installed packages. **`atp remove station <pkg>`** / **`atp remove safehouse <pkg>`**: remove packages; use `--exfiltrate` with station remove to copy to Safehouses first.

## Build and test

- **Prerequisites:** Node.js 20+
- **Commands:** `npm install`, `npm run build`, `npm run dev` (development)



## Documentation and conventions

- **Markdown (doc-guide):** Use `#` for sections; empty line after headings; headings over bold; tables with rows under ~60 chars; Mermaid for diagrams. Notes in `docs/notes/` with date prefix `YYYY-MM-DD-topic.md`; release notes in `docs/release-notes` as `{semver}-Release-{date}.md`.
- **Code (clean-code):** Prefer many small files (about 100–300 lines). Single responsibility; composition and dependency injection; interfaces over inheritance; Liskov substitutability; polymorphism only when it helps clarity.
- **Contributing:** Fork and pull request; no secrets or generated dirs in repo; run tests before PR. See [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/doc-guide.md](docs/doc-guide.md). Implementation plans and architecture notes go in `docs/notes/`; CONTRIBUTING also references `docs/goals.md` and `docs/requirements.md`.

## Naming convention

- **Directories:** Use underscores (_). Example: `~/.atp_station`, `.atp_safehouse`.
- **Config files:** Use dashes (-) with prefix `atp-`. Example: `atp-config.yaml`, `atp-catalog.yaml`, `atp-package.yaml`. Never use `atp_config.yaml` or similar.

## Concepts (from design notes)

- **Package:** Versioned unit of assets (e.g. markdown) plus a manifest (e.g. `atp-package.yaml`) with name, version, description, and list of assets. Catalog entries point at paths or URLs; install copies from there into the project.
- **Catalog:** Single index at the Station (`atp-catalog.yaml`) listing available packages (standard + user). All installs source from this catalog.
- **Safehouse manifest:** Each project’s `.atp_safehouse` holds `manifest.yaml` listing installed packages for that project; it does not hold a catalog.
- **Config (prototype):** `~/.atp_station/atp-config.yaml` with `prompt_sources` (dirs or files) and optional `project_prompts_dir` (default e.g. `prompts`). Source dirs are copied one level (no recursion).

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
