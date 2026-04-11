# Installing, listing, and removing packages

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

# Goal

This page covers installing catalog packages into a project Safehouse (or Station-wide
where supported), listing what is installed, and removing packages. Removal is always for
the entire catalog package, not individual parts.

# Preconditions

- Station initialised (`atp station init`).

- Project has `.atp_safehouse` from `atp safehouse init`.

- Agent selected (`atp agent <name>`).

- Package appears in `atp catalog list` (user or standard entry).

# Install

```bash
atp install <package-name>
```

Common flags:

- `--project` — prompt-like material goes into the project agent tree (typical default).

- `--station` — prompt-like material goes toward the user or Station agent area per
  `agent-paths`.

- `--user-bin` — bundle executables use the user binary layout (common default).

- `--project-bin` — executables go under the Safehouse project bin layout.

- `--dependencies` — install declared dependencies in the same run; otherwise missing
  deps fail fast.

- `--force-config` — on MCP or hooks JSON conflict, replace the conflicting entry with the
  package version.

- `--skip-config` — skip MCP and hooks merges for this run; still copies tree assets where
  allowed. Mutually exclusive with `--force-config`.

- `--verbose` — merge ambiguity errors may print an extra JSON line on stderr (same detail
  when `DEBUG` contains `atp`).

If validation of the catalog extract fails, install stops before mutating the project.

# List installed packages

Project scope:

```bash
atp safehouse list
```

Extended type summary (where implemented):

```bash
atp safehouse list --extended
```

Station scope (packages installed at Station level in your setup):

```bash
atp station list
```

Catalog contents (names from `atp-catalog.yaml`, not necessarily installed anywhere):

```bash
atp catalog list
atp catalog list --verbose
```

Verbose catalog listing may read each package’s `atp-package.yaml` for type display; YAML
errors on that path can yield a non-zero exit.

# Remove from a project Safehouse

```bash
atp remove safehouse <package-name>
```

This tears down everything ATP recorded for that package in the manifest for this
project. It does not remove the package from the Station catalog.

# Remove from the Station

```bash
atp remove station <package-name>
```

Optional `--exfiltrate` copies package material into registered Safehouses before removal
from the Station, supporting migration-style workflows.

# MCP and hooks merges

Packages with Mcp or Hook parts merge into agent-specific configuration files (for
example Cursor `.cursor/mcp.json` and `.cursor/hooks.json`, Gemini `.gemini/settings.json`,
Codex `.codex/config.toml` and `.codex/hooks.json`). If a server name or hook identity
already exists with different content, install fails until you choose `--force-config` or
`--skip-config`. Error text should name the file and the flags.

# Practical tips

- Run `atp validate catalog-package` on a Station package directory if an install fails
  and you want the same checks the installer uses.

- After changing agents, reinstall or handover per the Safehouse manual page so paths line
  up with the new agent.

- Keep `STATION_PATH` consistent across every command when you are not using the default
  `~/.atp_station`.
