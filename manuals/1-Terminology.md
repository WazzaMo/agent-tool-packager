# Terminology

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

# What ATP is

Agent Tool Packager (ATP) is a command-line tool (`atp`) for building small distributable
units of agent material (rules, prompts, skills, hooks, MCP servers, commands, and similar)
and installing them into projects or user-level agent directories. The vocabulary below
matches how the rest of this manual and the project configuration speak about storage and
workflows.

# Station

The Station is your local “supply depot” for ATP. It normally lives at `~/.atp_station`
and holds:

- Station configuration (`atp-config.yaml`), including where each supported agent expects
  files on disk (`agent-paths`).

- The package catalog (`atp-catalog.yaml`), which lists standard and user packages.

- Package payloads under `standard_packages/` and `user_packages/` (each package folder
  holds `atp-package.yaml` and a prepared `package.tar.gz`).

You can point ATP at a different Station directory by setting the environment variable
`STATION_PATH`. That is useful for tests or multiple isolated catalogs on one machine.

The Station also records which project Safehouses have registered with it
(`atp-safehouse-list.yaml`), so ATP can relate projects back to the catalog they use.

# Safehouse

A Safehouse is the per-project ATP area. It is a directory named `.atp_safehouse` at the
project root (the directory ATP treats as the project base, usually where `.git` or
`.vscode` lives, or a path you override).

Inside it you will find:

- A manifest (`manifest.yaml`) listing which catalog packages are installed for that
  project, with versions, install source, and binary scope metadata.

- Local Safehouse configuration used when resolving installs for that project.

Think of the Station as shared infrastructure and the Safehouse as “what this repo has
installed right now.”

# Catalog

The catalog is the single index of installable packages stored at the Station in
`atp-catalog.yaml`. It has two lists: standard packages (often from a curated source) and
user packages (things you add yourself). If the same package name appears in both, the
user entry wins for listing and install resolution.

Each catalog entry points at package material on disk (for example a `file://` path) or
relies on Station layout conventions. There is no separate per-project catalog file; the
project always installs from the Station catalog.

# Package

A package is a versioned unit described by `atp-package.yaml` in the author’s working
directory, and later copied or built into the Station’s package folders. It has a name,
version, optional developer metadata, and typed content.

Modern packages use root `type: Multi` and a `parts` array: each part has its own type
(Rule, Prompt, Skill, Hook, Mcp, Command, Experimental), usage lines, and optional
components (files) and bundles (executable trees). Older “legacy” packages use a single
root `type` and root-level `usage`, `components`, and optional `bundles`, with a flat
`stage.tar`. ATP validates and installs both shapes.

Staging collects files into `stage.tar`; publishing to the catalog gzips that archive to
`package.tar.gz` next to the manifest copy the installer reads.

# Install scopes

When you install, you choose where prompt-like material goes and where binaries go:

- Project versus Station (or “user layer”) scope for agent-facing files, controlled by
  flags such as `--project` and `--station`.

- User bin versus project bin for executables from bundles (`--user-bin` versus
  `--project-bin`), with defaults documented in the install manual page.

# Agent

An agent here means a product id ATP recognises (for example `cursor`, `claude`,
`gemini`, `codex`, `kiro`). The Safehouse stores which agent is selected for the project so
install can place files under the correct paths from `agent-paths`.

# Whole-package lifecycle

ATP installs and removes by whole catalog package name. After a package is in the catalog
or installed in a Safehouse, there is no command to uninstall only one part of a multi-part
package; you remove the entire package and reinstall if needed.
