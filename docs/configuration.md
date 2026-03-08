# AHQ configuration

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.
Created by Warwick Molloy Feb 2026.

---------------------------------------------------------------------------

## Overview

Agent HQ has different storage and operations areas:
    A.  The Home Office
    B.  The station - the main area in the field of operation
    C.  A safehouse where the agent stores the tools of the trade.


### The Home Office

In Agent HQ, the "Home Office" is the GitHub repository.

### The Station

Most of the time, there will only be one "station" and it will be in the user's
home directory. In a *nix platform that is `${HOME}/.ahq_station` and this holds
the main configuration and catalog information locally.

The "Station" is a central multi-agent work office which is a directory on the
developer's computer. There may be more than one station on a computer where
there is a need to work with different catalogs. The station location may be overridden
using an environment variable `STATION_PATH`.

The station will have two files:

    1.  Configuration scope - ahq_station.yaml

    2.  Catalog scope - ahq_catalog.yaml

#### Station Directory Structure

~/.ahq_station/
    ahq_station.yaml
    ahq_catalog.yaml
    standard-packages/
        vecfs/
            ahq-package.yaml
            package.tar.gz
    user-packages/
        special-prompt-set/
            ahq-package.yaml
            package.tar.gz

#### Station Configuration

The station directory found either at:

1.  ${STATION_PATH}/ahq_config.yaml
2.  ~/.ahq_station/ahq_config.yaml

Will hold information about the AgentHQ (AHQ) Station.

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
```

#### The Station's Safehouse list

The Station will have a safehouse list to identify all safehouses that have been
used by the Station.

`${STATION_PATH}/safehouse_list.yaml`

The contents are:

```yaml
safehouse_paths:
    - ~/src/woohoo/.aqh_safehouse
    - ~/src/oh_yeah/.aqh_safehouse
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
        > .ahq_safehouse
```

The safehouse holds a manifest of installed agent packages, called `manifest.yaml`
and it will identify the packages that are in-use in that project and the `STATION_PATH`
from which they were installed.

# Standard and Custom Packages

Standard packages were source from the global home office.

Custom packages are configured into the catalog as personal favourites
that the user wishes AHQ to manage installation.

