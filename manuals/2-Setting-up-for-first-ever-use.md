# Setting up for first ever use

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

# Goal

Before you author packages or install them into projects, you need a Station: the
directory where ATP keeps its configuration, the catalog, and published package files.

# Prerequisites

ATP is a Node.js CLI. Use a current Node.js (the repository pins a version in
`.node-version`; Node 24+ is a reasonable expectation). Install the published package
globally, or run from a clone after `npm install` and `npm run build`.

# Initialise the Station

From a shell:

```bash
atp station init
```

With no overrides, this creates `~/.atp_station` and the files ATP expects there,
including starter `atp-config.yaml` and `atp-catalog.yaml`, plus directory placeholders
for standard and user packages.

Exit code 0 means the layout was created or already complete enough that init had nothing
critical left to do. If the directory cannot be written, you will get a non-zero exit and
an error message.

# Using a non-default Station path

Set `STATION_PATH` to an absolute or home-relative path before running init (or any other
`atp` command that reads the Station):

```bash
STATION_PATH="$HOME/work/atp-test-station" atp station init
```

All later commands in that shell session should use the same `STATION_PATH` so catalog,
install, and list operations see the same data. Tests and automation often rely on this
override.

# What you have after init

You can confirm files exist under the Station root: configuration, catalog YAML, empty or
seeded package trees, and manifests for Station bookkeeping. You are now ready to either
author a package (see the authoring manual page) or point an existing project at this
Station and create a Safehouse.

# Optional: install from source for development

If you are working on the ATP repository itself, you can link a dev build into your path
via the project’s `npm run install-home` script (see the project README). That is separate
from `atp station init`, which you still run once per Station location you want to use.
