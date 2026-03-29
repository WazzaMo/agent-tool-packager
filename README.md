# WazzaMo Agent Tool Packager (ATP)

A utility for CLI agentic software development workflows.

Current Version: 0.2.3

Cursor summarised this project as:

> **Agent Tools is an early-stage project to standardize how
  you add prompts, MCP servers, and skills to agentic CLI workflows,
  with documentation and conventions in place**

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.
Created by Warwick Molloy Feb 2026.

# Why Agent Tools?

Ever wanted to install your standard prompt markdown files in a project
in a convenient way?

Ever wanted to install MCP servers, skills etc in a convenient manner?

Me too...

And that drove me to create the Agent Tools Packager **ATP**.

Welcome to "Q Branch" !!
We're going to build the next generation of agent tools together!


## Installation

```bash
npm install -g @wazzamo-agent-tools/packager
```

Once installed, you can use the `atp` command line (short for Agent Tools Packager).

```bash
atp --version
atp station init
atp safehouse init
atp agent cursor
atp catalog list
atp install <package> [--project|--station] [--user-bin|--project-bin] [--dependencies]
atp station list
atp safehouse list
atp remove station <pkg> [--exfiltrate]
atp remove safehouse <pkg>
```

## Project

GitHub: [https://github.com/WazzaMo/agent-tool-packager](https://github.com/WazzaMo/agent-tool-packager)

## Banner!

```
    AA      GGGGG    EEEEEEE  NN    NN  TTTTTTTT      TTTTTTTT     OOOO        OOOO     LL         SSSS
  AAAAAA   GG    GG  EE       NNN   NN  T  TT  T      T  TT  T   OOOOOOOO    OOOOOOOO   LL        SS  SS
 AA    AA  GG        EE       NNNN  NN     TT            TT     OO      OO  OO      OO  LL       SS    SS
 AA    AA  GG        EEEEE    NNNN  NN     TT            TT     OO      OO  OO      OO  LL       SS
 AA    AA  GG  GGGG  EEEEE    NN NN NN     TT            TT     OO      OO  OO      OO  LL        SSS
 AAAAAAAA  GG  G GG  EE       NN  NNNN     TT     ##     TT     OO      OO  OO      OO  LL         SSS
 AAAAAAAA  GG    GG  EE       NN  NNNN     TT     ##     TT     OO      OO  OO      OO  LL           SSS
 AA    AA   GG  GG   EE       NN    NN     TT            TT     OO      OO  OO      OO  LL             SS
 AA    AA    GGGG    EEEEEEE  NN    NN     TT            TT     OO      OO  OO      OO  LL       SS    SS
 AA    AA ==========================================     TT      OOOOOOOO    OOOOOOOO   LL        SS  SS
 AA    AA    By Warwick Molloy Melbourne, Australia      TT        OOOO        OOOO     LLLLLLLL   SSSS

```

## Build, test and run

### Prerequisites

I use Fast Node Manager and the `.node-version` file will set you up
with a node that works. Assuming you have FNM installed in your user
home directory.

[Fast Node Manager Github repo](https://github.com/Schniz/fnm)

```bash
fnm use
```

This command will refer to the `.node-version` file and prompt you
to install that version if your system doesn't have it. Say "yes"
and you're good to go.


Node.js 24+

```bash
npm install
npm run build
```

Test the build works

`npm run test:run`

### Development workflow

Run the CLI:
```bash
# Direct execution (after build)
npx atp --version
npx atp station init
npx atp safehouse init
npx atp agent cursor
npx atp catalog list
npx atp install <package> [--project|--station] [--user-bin|--project-bin] [--dependencies]
npx atp station list
npx atp safehouse list
npx atp remove station <pkg> [--exfiltrate]
npx atp remove safehouse <pkg>
```

Development (no build step):
```bash
npm run dev -- station init
```

### Development Install

To install a development version in your home directory for package build
and package install testing, there is a new NPM script to install ATP

1. create ~/.atp_dev
2. install distributable JS file
3. install Node wrapper
4. Sets up `~/.local/bin/atp` link to point to wrapper so atp will run

NPM command

`npm run install-home`
After this, you can run `atp station init` to setup your station.

### Development uninstall

After testing is completed, this development installation can be removed.

`npm run uninstall-home`



Override Station location:
```bash
STATION_PATH="/path/to/station" npx atp station init
```

## Configuration

### Station

Default location: `~/.atp_station` or overidden by environment variable `STATION_PATH`.
Holds:
 — config, catalog, manifests


### Safehouse

Default location: `./.atp_safehouse`

For per-project installs. `atp safehouse init` refuses to create a Safehouse under your
home directory when the resolved project root is `$HOME` (for example if `~/.vscode` exists).
To override, set `ATP_ALLOW_HOME_SAFEHOUSE=1` (not recommended).

### Catalog

One index at the Station: `atp-catalog.yaml` under `STATION_PATH` (default `~/.atp_station`).

Entries under `packages.user` override the same package name under `packages.standard`.
Installs use this catalog only; files go to the agent’s home-level config or the current
project’s agent config (`atp install --project` / `--station`, etc.).

Meaning that packages can be installed for the agent for all user work with that agent, held
at the user's home directory config for the agent.

Conversely, the user can install a package into one project, say to test that package.

See [docs/configuration.md](docs/configuration.md) for full configuration.

### Testing the catalog


## Other benefits

We are all citizen researchers when it comes to Agentic software dev because
**everyone** is learning how this should be done.

### Prompts

If you have a genius prompt you want to make standard (selfishly to make it easy)
and sharing is nice, too, then please raise a GH issue and I'll add it and attribute
your contribution.

