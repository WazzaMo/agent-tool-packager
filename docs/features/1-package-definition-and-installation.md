# Catalog Definition

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.
Created by Warwick Molloy Feb 2026.

--------------------------------------------------------------------------

## Product definition and installation

This is the list of packages that can be installed into a system.
There is a standard list of packages that come from the source code repository or a central storage.

The user can define their own repository and use AHQ to manage installation as they see fit.

# Use Cases

## 1. Definition

Define packages containing one or more products.
The product types are:
    1.  Rules - markdown as a standard prompt file.
    2.  Skills - markdown
    3.  MCP Servers in any language, packaged as a tar.gz file
    4.  Shell scripts to support tools
    5.  Other utilities that skills provide instruction.

A package may contain one or more of these product types that can
be installed at the user level or at the project level.

### Terminology (aligned with package-metadata)

- **Rules**: Product type for prompt markdown files. In
  [package-metadata](../notes/2026-02-25-package-metadata-and-catalog.md) and
  code, these are "assets" or "prompts."
- **Station**: Main config area at `~/.ahq_station` (or `STATION_PATH`); see
  [configuration](../configuration.md).

## 2. Installation

Utility programs can be installed to the user home directory or the local project.
The default is the user home directory for easiest reuse.

### Installation Manifest

The user, central manifest of installed packages will be stored in:

    ${HOME}/.ahq_station/manifest/${package}.yaml

Through environment variable [see configuration](../configuration.md) the
station path can be overriden and this makes integration testing work.
It also allows people to have multiple, different station configurations.

### User home path

For execution and compatibility with other user installed programs ~/.local/ is assumed.

Utility Binary: ${HOME}/.local/bin

Supplementary files: ${HOME}/.local/share/${utility}/
Configuration files: ${HOME}/.local/etc/${utility}/

Where ${utility} might be `vecfs-mcp-ts` as an example.

### Project path

Utility Binary: ${PROJECT}/.ahq_safehouse/bin

Supplementary files: ${PROJECT}/.ahq_safehouse/share/${utility}/

Where ${PROJECT} is the path of the local project.


### Skills updates

For local skills files to work, they should have the location of the utilities in the skill file,
so the agent knows how to call on the skill.

This means SKILL.md files that are installed require some dependency metadata assuming the
tool to be used and letting the installer resolve the path when the tool is installed.

## Questions about feature

### 1. Whether ahq install should auto-install utility packages when a skill depends on them.

The user should be in control. If the user has requested a skill and
it has dependencies, then as a package manager, those dependencies
should be satisfied, therefore the utilities should be installed
to enable the skill.

### 2. MCP server tar.gz layout and extraction rules.

AHQ can define the tar.gz packaging AND extraction rules.

When extracting, AHQ should unpack to a temporary path in /tmp/{YYYY-MM-DD-package-name}
and then pick out the binary files from the package to install into
the right places (see above) so they would resolve in the user's PATH or be found by the patched path in the skill.md file.

Packaging paths in the tar.gz bundle should support installation:
- `bin` directory with executables, especially MCP servers.
- `share` for supplementary files
- `config` for configuration
- `skill` for the skill
- `rule` for any rule files 

### 3. Whether to add uninstall support.

We will need uninstall support and this will help with test cases
for installation.


# Acceptance Criteria

## Catalog list

User must be able to list the catalog to select a package to install.
Criteria is that known package names from the catalog
appear in list output.

`ahq catalog list` must show the known packages.
To list packages in the catalog that can be installed.

## Agent nomination

AHQ needs to know which agent requires the weapons (the package) 
because every agent is different. It is to be assumed that there
will be no safehouse path in the project file until one is created.

The `ahq agent` command creates the safehouse path in the project.
When the agent name is given, it configures the safehouse
for that agent so that weapons can be installed into the proper place
for that agent.

```bash
cd test_project
ahq agent cursor
```

This will inform ahq to use the `.cursor` directory in the project
directory for SKILL.md files.

The skill files should install to the appropriate path for the
current agent which is given by the `agent` command and is only
needed once, unless the agent is changed by the user.

Running the `agent` command a second time should not change the
configuration unless a new agent is nominated, say going from cursor
to claude. If the user runs `ahq agent cursor` a second time,
ahq should respond with a message telling them that it was 
unnecessary, "Q Branch already knows cursor was assigned to this project"

## Installation

When user installs a package to default locations where the package
has executables like an MCP server, then the executables must install
in the default user home area. The skills and other prompt materials
must install into the project area, assumed to be the current directory.

```bash
cd test_project
ahq agent cursor
ahq install vecfs-ts
```

Must install vecfs executables for the vecfs-embed-ts and vecfs-ts
to the user bin directory. Any supplementary files to the share
directory - according to "### User home path" above.

## List installed packages

### Available for many projects

List installed packages from the user cross-project space.

`ahq station list`

Lists the packages installed into the Station.


### Installed for use in a project

Listing installed packages that are in the project's safehouse

`ahq safehouse list`


## Uninstallation


# Gaps

  Gaps / follow-ups

  2. Uninstall – No concrete acceptance criteria (e.g. ahq uninstall <name>), only the
     decision that it is needed.
  3. `ahq list packages` – This differs from the earlier ahq list described in AGENTS.md;
     docs need to be aligned.
