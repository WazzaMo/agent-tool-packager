# Agent Tool Packager (ATP) — summary for AI agents

This file summarises the project’s markdown documentation so agents can work effectively in this repo.

## Project overview

**Agent Tool Packager (ATP)** is a CLI for agentic software development workflows. It standardises how you add rules, skills, MCP servers, and commands to agentic CLI workflows. Built in **TypeScript** (Node.js v24.14.0); config at `~/.atp_station/atp-config.yaml`; one catalog at `~/.atp_station/atp-catalog.yaml` (index of available packages, standard + user). **`STATION_PATH`**: set this env var to override the Station location (e.g. for testing); when unset, `~/.atp_station` is used. The project safehouse (`./.atp_safehouse`) holds a manifest of installed packages and `atp-config.yaml` (agent, paths, station); it does not hold a catalog.

## Key commands and behaviour

- **`atp station init`**: create ~/.atp_station (or STATION_PATH) with config, catalog, manifests.
- **`atp safehouse init`**: create .atp_safehouse in the current project.
- **`atp agent <name>`**: assign agent (e.g. cursor) to project; configures safehouse for that agent.
- **`atp agent handover to <name>`**: switch to a new agent; re-installs skills for new agent.
- **`atp catalog list`**: list packages in the station catalog.
- **`atp validate package`**: authoring check (`atp-package.yaml` + `stage.tar` in cwd). **`atp validate catalog-package [dir]`**: same pre-install checks ATP runs before `atp install` on a catalog extract (default `dir` = cwd).
- **`atp install <name>`**: install package from catalog. Use `--project` (default) or `--station` for prompts; `--user-bin` (default) or `--project-bin` for binaries. `--dependencies` to install deps.
- **`atp station list`** / **`atp safehouse list`**: list installed packages. **`atp remove station <pkg>`** / **`atp remove safehouse <pkg>`**: remove the **entire** package (no per-part uninstall after install); use `--exfiltrate` with station remove to copy to Safehouses first.

## Build and test

- **Prerequisites:** Node.js v24.14.0 (the specific version required will change over time; always refer to `.node-version`). If your environment does not match, run `fnm use` to ensure the correct version is active.
- **Commands:** `npm install`, `npm run lint`, `npm run build`, `npm run dev` (development), `npm run test:run` (tests).



## Documentation and conventions

- **Markdown (doc-guide):** Use `#` for sections; empty line after headings; headings over bold; tables with rows under ~60 chars; Mermaid for diagrams. Notes in `docs/notes/` with date prefix `YYYY-MM-DD-topic.md`; release notes in `docs/release-notes` as `{semver}-Release-{date}.md`.
- **Code (clean-code):** Prefer many small files (about 100–300 lines). Single responsibility; composition and dependency injection; interfaces over inheritance; Liskov substitutability; polymorphism only when it helps clarity. Functions under ~50 lines—break into smaller named functions. Use JSDoc (`/** ... */`) for params, returns, and annotations. TypeScript: add a blank line after multi-line imports to aid readability. Build types and interfaces from smaller re-usable types. Tests: prefer many smaller test files (≈400 lines ok; split at ~800 lines).
- **Contributing:** Fork and pull request; no secrets or generated dirs in repo; run tests before PR. See [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/doc-guide.md](docs/doc-guide.md). Implementation plans and architecture notes go in `docs/notes/`; CONTRIBUTING also references `docs/goals.md` and `docs/requirements.md`.

## Naming convention

- **Directories:** Use underscores (_). Example: `~/.atp_station`, `.atp_safehouse`.
- **Config files:** Use dashes (-) with prefix `atp-`. Example: `atp-config.yaml`, `atp-catalog.yaml`, `atp-package.yaml`. Never use `atp_config.yaml` or similar.

## Concepts (from design notes)

- **Package:** Versioned unit with manifest (`atp-package.yaml`) containing name, version, type (Rule, Prompt, Skill, Hook, Mcp, Command, Experimental), components (e.g. markdown files), and optionally bundles (e.g. executables). Catalog entries point at paths or URLs; install copies from there into the project.
- **Catalog:** Single index at the Station (`atp-catalog.yaml`) listing available packages (standard + user). All installs source from this catalog.
- **Safehouse manifest:** Each project’s `.atp_safehouse` holds `manifest.yaml` listing installed packages for that project; it does not hold a catalog.
- **Config:** `~/.atp_station/atp-config.yaml` defines version, agent-paths (cursor, claude, etc.), and standard-catalog URL. See [configuration](docs/configuration.md).

## File references

| Topic                    | Location                                             |
|--------------------      |----------------                                      |
| CLI usage, catalog       | [README.md](README.md)                               |
| Configuration            | [docs/configuration.md](docs/configuration.md)       |
| Package definition & install | [docs/features/1-package-definition-and-installation.md](docs/features/1-package-definition-and-installation.md) |
| Package developer support    | [docs/features/2-package-developer-support.md](docs/features/2-package-developer-support.md) |
| Contributing & schema    | [CONTRIBUTING.md](CONTRIBUTING.md)                   |
| AgentProvider contributor guide | [docs/contributor-guide-agent-providers.md](docs/contributor-guide-agent-providers.md) |
| Doc formatting           | [docs/doc-guide.md](docs/doc-guide.md)               |
| Code style               | [docs/clean-code.md](docs/clean-code.md)             |
| Package & catalog        | [docs/notes/2026-02-25-plan-package-metadata-and-catalog.md](docs/notes/2026-02-25-plan-package-metadata-and-catalog.md) |

## Attribution

Contributor attribution: [ThanksTo.md](ThanksTo.md).
