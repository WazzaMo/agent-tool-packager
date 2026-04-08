# WazzaMo Agent Tool Packager (ATP)

A utility for CLI agentic software development workflows.

Current Version: 0.2.3

Cursor summarised this project as:

> **Agent Tools is an early-stage project to standardize how
  you add prompts, hooks, MCP servers, and skills to agentic CLI workflows,
  with documentation and conventions in place**

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.
Created by Warwick Molloy Feb 2026.

## Project

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

GitHub: [https://github.com/WazzaMo/agent-tool-packager](https://github.com/WazzaMo/agent-tool-packager)


# Why Agent Tools - Packager (ATP) ?

Ever wanted to install your standard prompt markdown files in a project
in a convenient way? I use Cursor at home and OpenAI's Codex at work
and I want to write my packages for Agentic tools once. How do I do that?

Each AI Agent company having their own marketplace does not solve this problem.
It doesn't even solve the problem of how do I make a package and do test installs
project directories....

But ATP does!

Welcome to "Q Branch" !!
We're going to build the next generation of agent tools together!

## What can ATP do?

Right now ATP is good for AI agent extensions that can be developed and packaged.
The extensions generally are:

- rule
- standard prompt material as markdown
- hooks (agent loop scripts and `hooks.json`; see [Cursor Hooks](https://cursor.com/docs/hooks))
- commands that agents can use as tools
- skills as defined in the standard originally by Anthropic for SKILL.md
- MCP servers

The package can be installed at the user level or in a project. Because we are dealing with agents,
we use words from the world of spies. So the Station is the country headquarters away from HQ and here
is the user home directory configuration and storage for ATP.

The project is the field of battle (or espionage?) and so the Safehouse is the safe place the agent
has for storing their tools of the trade.

So ATP, right now, lets you define and stage a package of tools for agentic work,
add that package to the Station's catalog and then install that package, or other packages you create,
to any project's Safehouse, or to an agent's user-central installation in the Station.

------------------------------------------------------------------------

# A Quickstart Guide

I am assuming a UNIX-like (Linux, BSD, MacOS) environment in these examples.
Not yet tested in Windows or windows-like environments Reactos.org.
You will need a modern Nodejs in your environment, say version 24+.


## Creating and using a package for agents

This guide will show you how to author a package from material you might be using
in a project that you find useful with your Agents. This guide will show you how
to validate the package is ready and to add the package to a catalog. It will also
show you how to install the package into a new, or existing project, so that you
may see the same benefits, so that the agents you use for your work have the tools
they need.

## Before you start.

You need a Station for your agents to get their packages.
This is where the catalog of packages lives.

`atp station init`

That will create the station at ${HOME}/.atp_station where configuration and the
catalog of packages will reside. The station is the in-country base for your agents.

## Creating your own package

### 1. Create a skeleton and give it a description

Create the skeleton of a package as a starting point.

`atp create package skeleton`

Then define its name, copyright, license, version for the package as base metadata.
The "developer" is the author of the package. This is the metadata that helps people
select a package to use from a list of packages.

```bash
atp package name clean-docs-and-code
atp package developer Warwick_M
atp package license "Apache License 2.0"
atp package version 0.1.0
```

### 2. Add one or more packages

Add some file assets with hints on how to use them in one or more parts.
A part needs type, which is given when you declare a new part (with `newpart`) that
indicates if the part holds a rule, prompt, hook, command, MCP server etc.
It needs some usage information. Finally, it needs a component that is the markdown file
or it needs a bundle containing executable code, configuration etc to perform a task,
such as an mcp or command.

```bash
atp package newpart rule
atp package part 1 usage "Tell the agent to read the documents and summarise into AGENTS.md"
atp package part 1 component docs/doc-guide.md
atp package part 1 component docs/coding-standard.md # -- add another markdown file
```

### 3. Check the package has enough parts and information to be useful in the field

Then check if the package definition is complete enough. An integrity check, basically...

`atp validate package`

Get a summary of the definition and contents... and an indication if the package
is complete enough, by running...

```bash
atp package summary`

Package summary:
  Name: clean-docs-and-code
  Type: Multi
  Developer: Warwick_M
  License: Apache License 2.0
  Version: 0.1.0
  Parts (1):
    Part 1: type Rule
      Usage: Always ready to keep code clean and markdown mean.
      Components: doc-guide.md, clean-code.md

This package can be added to the catalog.
```

### 4. Add the package to the catalog in the Station

This is a complete package and it can be added to the Station's catalog, like this:

```bash
atp catalog add package

atp catalog list
clean-docs-and-code

```

### 5. Use the package in a new project

You might have other projects where your agent will need your new package.
Here, we will create a new project to explain and demonstrate ATP.

#### 5.1 Create the demo/test project workspace

Then I create a new development project directory and initialise git because ATP
checks for signs that the directory is a project directory and git is a great sign!

```bash
$ mkdir -p src/test
$ git init -b main
```

#### 5.2 Create a safehouse in the field for your agent

Now have ATP initialise a safehouse in the project field of operation
and nominate an agent. ATP won't allow a package to be installed without
a nominated agent. A good quartermaster wants to know what agent
is responsible for their tech :-)

```bash
$ atp safehouse init
Safehouse created at /home/warwick/src/test/.atp_safehouse
  - atp-config.yaml
  - manifest.yaml
```

Assign an agent to the safehouse.

```bash
$ atp agent cursor # to tell ATP which agent to configure and install into.
Assigned cursor to this project (.cursor/)
```

You can use this command to re-assign a new agent to the safehouse, so you can switch
from cursor to claude if you want.

#### 5.3 Install the package into the Safehouse in the project

And now we can install the package and see the files are installed in the
correct directory for cursor, as current agent, to use.

```bash
$ atp install clean-docs-and-code
Installed clean-docs-and-code 0.1.0 (prompts:project, bin:user-bin)

$ ls -la .cursor/rules
-rw-r--r-- 1 warwick warwick 3979 Mar 30 05:08 clean-code.md
-rw-r--r-- 1 warwick warwick 5631 Mar 30 05:08 doc-guide.md
```

The Station configuration has the agent-relative paths for installing files for different agents.

#### MCP and hooks merges (conflicts)

Packages with **Mcp** or **Hook** parts merge into agent JSON (for **Cursor**:
`.cursor/mcp.json` and `.cursor/hooks.json`; for **Gemini**: `.gemini/settings.json`).
If your file already defines the same server name or hook id with different
content, **`atp install`** fails until you add **`--force-config`** (overwrite the
conflicting entry) or **`--skip-config`** (skip those merges). Use **`--verbose`**
(or set **`DEBUG`** to include **`atp`**) to print an extra JSON line for that
error. See [Feature 5 — merge policy](docs/features/5-installer-providers-for-known-agents.md#merge-policy-and-troubleshooting-for-atp-install)
and [Configuration — merged JSON](docs/configuration.md#catalog-install-and-merged-agent-json).

-------------------------------------------------------------------------------------------------


# How to install ATP on your computer

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
atp install <package> [--project|--station] [--user-bin|--project-bin] [--dependencies] [--force-config|--skip-config] [--verbose]
atp station list
atp safehouse list
atp remove station <pkg> [--exfiltrate]
atp remove safehouse <pkg>
```

Removal from Safehouse or Station is always for the **whole** package (no per-part uninstall after install).


# Working with this project's code

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
npx atp install <package> [--project|--station] [--user-bin|--project-bin] [--dependencies] [--force-config|--skip-config] [--verbose]
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

