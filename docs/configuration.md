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

