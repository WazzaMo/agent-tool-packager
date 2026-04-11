# Creating a Safehouse and configuring the agent

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

# Goal

A project that should receive ATP installs needs a Safehouse (`.atp_safehouse`) and a
chosen agent id so ATP knows which directory layout (`agent-paths` in the Station) to
write into. This page covers init, agent selection, and common path pitfalls.

# Find the project root

ATP walks upward from the current working directory looking for markers such as `.git` or
`.vscode` within a limited depth to decide the project base. Commands like
`atp safehouse init`, `atp install`, and `atp agent` use that resolution.

If you need an explicit project root (for example in CI or a layout without markers), set:

```bash
export SAFEHOUSE_PROJECT_PATH=/absolute/path/to/project
```

# Initialise the Safehouse

From inside the project (or with `SAFEHOUSE_PROJECT_PATH` set):

```bash
atp safehouse init
```

This creates `.atp_safehouse` with an empty `manifest.yaml` and local config. On success,
the Station may append this Safehouse path to `atp-safehouse-list.yaml` when the Station
exists.

# Home directory safety

ATP refuses to create a Safehouse when the resolved project root is your user home
directory, because that pattern is almost always accidental. To override (only if you
truly intend it), set `ATP_ALLOW_HOME_SAFEHOUSE` to exactly `1`.

# Assign an agent to the project

Install requires a nominated agent. Only agent names that appear in Station
`agent-paths` are accepted:

```bash
atp agent cursor
```

Use the lowercase id that matches your Station configuration (`cursor`, `claude`,
`gemini`, `codex`, `kiro`, and so on, as configured).

To switch agents later:

```bash
atp agent handover to claude
```

Handover re-applies installs for the new agent where the CLI supports that workflow; you
should verify project files after switching.

# Order of operations

Typical first-time sequence for a repo:

1. `atp station init` (once per machine or per `STATION_PATH`).

2. `cd` your git project.

3. `atp safehouse init`.

4. `atp agent <name>`.

5. `atp install <package>` (see the install manual page).

You cannot install into a project Safehouse before the Safehouse exists and an agent is
set; the CLI should tell you clearly if those steps are missing.

# What is stored

`manifest.yaml` lists installed packages with enough metadata to remove them later and to
know whether binaries were installed for the user or the project. It is the single source
of truth for “what is installed here,” not a second catalog.
