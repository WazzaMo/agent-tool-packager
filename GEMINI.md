# GEMINI.md

This file provides foundational mandates and technical standards for Gemini CLI to operate within the Agent Tool Packager (ATP) repository.

## Project Overview

**Agent Tool Packager (ATP)** is a CLI for agentic software development workflows, standardising rules, skills, MCP servers, and commands.

- **Technology Stack:** TypeScript (Node.js v24.14.0).
- **Configuration:** Station at `~/.atp_station/` (override with `STATION_PATH`), Safehouse at `./.atp_safehouse/`.
- **Primary Tooling:** `npm install`, `npm run build`, `npm run dev`.

## Engineering Mandates

### Coding Standards
- **File Size:** Prefer many small files (100–300 lines).
- **Functions:** Keep under 50 lines; break into named functions.
- **Architecture:** Prioritize single responsibility, composition, and dependency injection.
- **Interfaces:** Use interfaces over inheritance; Liskov substitutability is required.
- **TypeScript:** 
  - Add a blank line after multi-line imports.
  - Build types/interfaces from smaller re-usable types.
  - Use JSDoc (`/** ... */`) for parameters, returns, and annotations.

### Testing Standards
- **File Size:** Prefer many smaller test files (~400 lines).
- **Splitting:** Split test files when they exceed ~800 lines.
- **Approach:** Focus on clear `describe()` blocks to manage complexity.

### Naming Conventions
- **Directories:** Use underscores (`_`), e.g., `.atp_safehouse`.
- **Config Files:** Use dashes (`-`) with `atp-` prefix, e.g., `atp-config.yaml`.
- **Note Files:** `docs/notes/YYYY-MM-DD-{kind}-{name}.md`.
- **Release Notes:** `docs/release-notes/{semver}-Release-YYYY-MM-DD.md`.

## Documentation Standards

### Markdown Formatting
- **Headings:** Use levels 1 to 4 (`#` to `####`). Use level 1 for new sections.
- **Spacing:** Always place an empty line after headings and around paragraphs.
- **Emphasis:** Prefer headings over **bold** for sectioning.
- **Tables:** Row length should be under 60 characters for readability. Use headings for long-form content.
- **Visuals:** Use Mermaid for diagrams where value is added.

### Documentation Structure
- **Notes Kind:** `plan`, `coding`, `bug`, `todo`, `concern`, `test`, `other`.
- **Features:** Located in `docs/features/`.
- **Stories:** Located in `docs/stories/`.

## Key Commands

| Command | Action |
|---------|--------|
| `atp station init` | Create station config and catalog |
| `atp safehouse init` | Create safehouse in project |
| `atp agent <name>` | Configure safehouse for specific agent |
| `atp install <pkg>` | Install package from catalog |
| `atp station list` | List station-installed packages |
| `atp safehouse list` | List project-installed packages |
