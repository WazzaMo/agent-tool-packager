# Agent Tool Packager (ATP)

A utility for CLI agentic software development workflows.

Current Version: 0.1.1

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

- **Station:** `~/.atp_station` (or `STATION_PATH`) — config, catalog, manifests
- **Safehouse:** `./.atp_safehouse` — per-project installs
- **Catalog:** global (bundled) + user (`~/.atp_station/atp-catalog.yaml`) + project (`./.atp-local/catalog.yaml`). Precedence: project > user > global

See [docs/configuration.md](docs/configuration.md) for full configuration.

### Testing the catalog


## Other benefits

We are all citizen researchers when it comes to Agentic software dev because
**everyone** is learning how this should be done.

### Prompts

If you have a genius prompt you want to make standard (selfishly to make it easy)
and sharing is nice, too, then please raise a GH issue and I'll add it and attribute
your contribution.

