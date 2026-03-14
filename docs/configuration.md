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

It will contain at minimum:

```yaml
configuration:
    - version: 0.1.0
    - agent-paths:
        - cursor:
            - home_path: ~/.cursor/
            - project_path: .cursor/
            - rule: rules/
            - commands: commands/
            - skills: skills/
        - codex:
            - home_path: ~/.codex
        - claude:
            - home_path: ~/.claude
        - gemini:
            - home_path: ~/.gemini
    - standard-catalog:
        url: https://agent-tool-packager.example.com/packages/0.1.0/
```

#### Station Catalog `atp-catalog.yaml`

```yaml
catalog:
    - standard_packages-path: ./standard_packages/
    - user_packages-path: ./user_packages/
    - packages:
        - standard:
            - vecfs
        - user:
            - special-prompt-set
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

# Standard and Custom Packages

Standard packages were source from the global home office.

Custom packages are configured into the catalog as personal favourites
that the user wishes ATP to manage installation.

## atp-package.yaml layout

The `atp-package.yaml` has mandatory and optional fields

`Package` is the root structure.

| Field Name | Opt or Mand  | Type        | max len |
|------------|--------------|-------------|---------|
| Name       | mandatory    | string      |     80  |
| Type       | mandatory    | string      |     20  |
| Developer  | optional     | string      |     80  |
| License    | optional     | string      |     80  |
| Version    | mandatory    | string      |     80  |
| Copyright  | optional     | string list |     80  |
| Usage      | mandatory    | string list |     80  |
| components | mandatory    | string list |    256  |
| bundles    | optional     | bundle list |    256  |

A **bundle list** is a list of objects, where each object contains:
- `path`: The relative path to the bundle directory.
- `exec-filter`: A glob pattern (relative to the package root) identifying executable files.

An example:

```yaml
name: clean-docs-and-code
type: Mcp 
developer: Warwick Molloy
license: Apache License 2.0
version: 0.1.0
copyright:
    - Warwick Molloy 2026
    - All rights reserved.
usage:
    - Use this for cleaning docs.
components:
   - SKILL.md
bundles:
   - path: mcp-exec
     exec-filter: mcp-exec/bin/*
```
