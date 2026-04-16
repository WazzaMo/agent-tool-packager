# ATP configuration

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.
Created by Warwick Molloy Feb 2026.

---------------------------------------------------------------------------

## Naming convention

- **Directories:** Use underscores (_). Example: `~/.atp_station`, `.atp_safehouse`.
- **Config files:** Use dashes (-) with prefix `atp-`. Example: `atp-config.yaml`, `atp-catalog.yaml`, `atp-package.yaml`.

## Overview

Agent Tool Packager has different storage and operations areas:
    A.  The Home Office
    B.  The station - the main area in the field of operation
    C.  A safehouse where the agent stores the tools of the trade.


### The Home Office

In Agent Tool Packager, the "Home Office" is the GitHub repository.

### The Station

Most of the time, there will only be one "station" and it will be in the user's
home directory. In a *nix platform that is `${HOME}/.atp_station` and this holds
the main configuration and catalog information locally.

The "Station" is a central multi-agent work office which is a directory on the
developer's computer. There may be more than one station on a computer where
there is a need to work with different catalogs. The station location may be overridden
using an environment variable `STATION_PATH`.

The station will have two files:

    1.  Configuration scope - atp-config.yaml

    2.  Catalog scope - atp-catalog.yaml

#### Station Directory Structure

~/.atp_station/
    atp-config.yaml
    atp-catalog.yaml
    standard_packages/
        vecfs/
            atp-package.yaml
            package.tar.gz
    user_packages/
        special-prompt-set/
            atp-package.yaml
            package.tar.gz

#### Station Configuration `atp-config.yaml`

The station directory found either at:

1.  ${STATION_PATH}/atp-config.yaml
2.  ~/.atp_station/atp-config.yaml

Will hold information about the Agent Tool Packager (ATP) Station.

The Station configuration will contain at minimum:

```yaml
# ATP Station Configuration
# Version: 0.1.0

configuration:
  # The version of the configuration schema
  version: "0.1.0"

  # Path configurations for different AI agents supported by ATP.
  # These define where the agents expect their rules, prompts, hooks, commands, and skills.
  agent-paths:
    cursor:
      home_path: "~/.cursor/"
      project_path: ".cursor/"
      rule: "rules/"
      prompts: "prompts/"
      hooks: "hooks/"
      commands: "commands/"
      skills: "skills/"
    
    codex:
      home_path: "~/.codex"
      
    claude:
      home_path: "~/.claude"
      
    gemini:
      home_path: "~/.gemini"
      project_path: ".gemini/"
      rule: "rules/"
      prompts: "prompts/"
      hooks: "hooks/"
      skills: "skills/"

    kiro:
      home_path: "~/.kiro/"
      project_path: ".kiro/"
      rule: "rules/"
      prompts: "prompts/"
      hooks: "hooks/"
      commands: "commands/"
      skills: "skills/"

  # Optional HTTPS origin for the npm registry API when the CLI checks for newer ATP
  # releases (`atp --latest` and the background notice). Omit to use the public npm
  # registry (https://registry.npmjs.org). Must be https:.
  # npm-registry-base-url: "https://registry.npmjs.org"

  # The standard catalog URL provides the default source for package updates.
  standard-catalog:
    url: "https://agent-tool-packager.example.com/packages/0.1.0/"
```


#### Station Catalog `atp-catalog.yaml`

`packages` must be a mapping with **both** `standard` and `user` keys, each a **YAML list** (use `[]` when empty). Each list item must be a **mapping** (object), not a bare package name string: at minimum `name`, plus optional `version`, `description`, and `location` (e.g. a `file://` path). `location` may be omitted when not applicable. The same name in `user` overrides `standard` for installs and for `atp catalog list`. A flat `packages: [ ... ]` list or string entries are invalid and are treated as no packages.

There is only this Station catalog (no separate global or per-project catalog file). The file may omit the outer `catalog:` key and list `packages` at the top level.

```yaml
catalog:
  standard_packages-path: ./standard_packages/
  user_packages-path: ./user_packages/
  packages:
    standard:
      - name: vecfs
        version: "0.2.0"
        description: Vector filesystem helpers
        location: file:///path/to/vecfs-package
    user:
      - name: special-prompt-set
        version: "1.0.0"
        description: Personal prompt collection
```

#### The Station's Safehouse list

The Station will have a safehouse list to identify all safehouses that have been
used by the Station.

`${STATION_PATH}/atp-safehouse-list.yaml`

The contents are:

```yaml
safehouse_paths:
    - ~/src/woohoo/.atp_safehouse
    - ~/src/oh_yeah/.atp_safehouse
```

### The Safehouse

Every time an Agent is deployed
in a project, where the project is the field of operations, there will
be a "Safehouse."

If you have a project called "my-react-todo-list" then in that directory,
there could a safehouse.

The hierarchy would be like this:

```
    my-react-todo-list
        > .atp_safehouse
```

The safehouse holds a manifest of installed agent packages, called `manifest.yaml`
and it will identify the packages that are in-use in that project and the `STATION_PATH`
from which they were installed.

`atp safehouse init` will not create `.atp_safehouse` under the user’s home directory when
the resolved project root is `$HOME` (for example when `~/.git` or `~/.vscode` is found there,
or when `SAFEHOUSE_PROJECT_PATH` points at `$HOME`). To force that layout anyway, set
`ATP_ALLOW_HOME_SAFEHOUSE` to exactly `1`; any other value leaves the restriction in place.

# Standard and Custom Packages

Standard packages were source from the global home office.

Custom packages are configured into the catalog as personal favourites
that the user wishes ATP to manage installation.

## Extended atp-package.yaml layout (version 0.2.3+)

THE NEW LAYOUT allows for multiple parts, each with their type.
The parts entry is mandatory because there should be at least one part
to package and install. It is compatible with the old layout but some
root-level fields are now optional, as responsibilities changed.

The old usage, components and bundles fields, at the root level, are now
optional because we want to move those values to parts, but having the fields
remain defined and optional, allows old packages to still work.

The `atp-package.yaml` has mandatory and optional fields

`Package` is the root structure.

`Part` will be the new type, usage, component and bundle structure that supports
multi-type packages.

| Field Name | Opt or Mand  | Type        | max len |
|------------|--------------|-------------|---------|
| Name       | mandatory    | string      |     80  |
| Type       | mandatory    | string      |     20  |
| Developer  | optional     | string      |     80  |
| License    | optional     | string      |     80  |
| Version    | mandatory    | string      |     80  |
| Copyright  | optional     | string list |     80  |
| Usage      | optional     | string list |     80  |
| components | optional     | string list |    256  |
| bundles    | optional     | bundle list |    256  |
| parts      | optional     | part list   |    256  |

Root-level Type will default to `Multi` meaning the file supports multiple
types but could be set to `Rule` in a legacy package.

Type = `Multi`

`parts` is actually required and an error message should be issued to the user
and this is a fatal error with a non-zero exit code.

Root-level `components`, `bundles` and `Usage` do not need to be present because
they will appear in the one-or-more part(s).

Type != `Multi`

When Type is one of the valid type values in 
[Feature 2](./features/2-package-developer-support.md) then the effective
rules become the legacy package layout.

The root-level `components`, `bundles` and `Usage` fields are expected
and an error message must be issued because the single-type format is incomplete
and invalid. Validation should fail and the exit code should be non-zero.

The Part layout:

| Field Name | Opt or Mand  | Type        | max len |
|------------|--------------|-------------|---------|
| type       | mandatory    | string      |     20  |
| Usage      | mandatory    | string list |     80  |
| components | optional     | string list |    256  |
| bundles    | optional     | bundle list |    256  |

Types are defined in the section **Package Types** from 
[Feature 2](./features/2-package-developer-support.md) and the text type names
are all valid values for `type` in the Part object. Different parts should normally
have different types because a rule can have many markdown components, so all those
files can be packaged in a single part. If types are repeated, a warning should be
printed for the user to see but it is not a fatal error.

Editing **parts** (including removing a part or a part’s component or bundle) is an **authoring-time**
workflow in the package directory via `atp package …` commands. Once a package is catalogued and
installed, removal is **whole-package** only (`atp remove safehouse` / `atp remove station`); ATP does
not remove a subset of parts from an installation.

A **bundle list** is a list of objects, where each object contains:
- `path`: The relative path to the bundle directory.
- `exec-filter`: A glob pattern (relative to the package root) identifying executable files.

An example for layout for versions 0.2.3 and beyond.

```yaml
name: clean-docs-and-code
type: multi
developer: Warwick Molloy
license: Apache License 2.0
version: 0.1.0
copyright:
 - Warwick Molloy 2026
 - All rights reserved.
parts:
- type: Skill
  usage:
  - Use this for cleaning docs.
  components:
  - SKILL.md
- type: Mcp
  usage:
  - Identifies the docs to clean.
  bundles:
  - path: mcp-exec
    exec-filter: mcp-exec/bin/*
```

## Catalog install and merged agent JSON

When you run **`atp install`** with **`--project`** (default) or **`--station`**,
packages that include **Mcp** or **Hook** parts may **merge** into the active
agent’s JSON files. Paths depend on the Safehouse agent and Station
**`agent-paths`** (for example **`.cursor/mcp.json`**, **`.cursor/hooks.json`**,
**Gemini** **`.gemini/settings.json`** for both MCP and hooks, or **Codex**
**`.codex/config.toml`** (MCP) and **`.codex/hooks.json`**).

If an existing MCP server or hook handler **matches by name or dedupe key** but
**differs** from the package, install **fails** until you pass either
**`--force-config`** (accept the package version) or **`--skip-config`** (skip
those JSON merges for this run). Optional **`--verbose`**, or **`DEBUG`**
containing **`atp`**, adds a one-line JSON payload on stderr for that failure.

Full tables, message shape, contributor rules for new agents, and links to design
notes are in [Feature 5 — Installer providers for known agents](./features/5-installer-providers-for-known-agents.md#merge-policy-and-troubleshooting-for-atp-install).

