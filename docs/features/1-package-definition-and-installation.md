# Catalog Definition

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.
Created by Warwick Molloy Feb 2026.

--------------------------------------------------------------------------

## Product definition and installation

This is the list of packages that can be installed into a system.
There is a standard list of packages that come from the source code repository or a central storage.

The user can define their own repository and use ATP to manage installation as they see fit.

# Use Cases

## 0. Initialisation

The ATP can be initialised in one or more Station locations.

### Default init

Init ATP for user directory configuration.

```bash
atp station init
```

This will create ~/.atp_station and all files it contains.

### Non-default init

For directories other than the user home directory, set the STATION_PATH first.

```bash
STATION_PATH="~/alternate/.atp_station" atp station init
```

### Safehouse init

When the current directory is a project base directory, run this command
to configure the ATP Safehouse in the project.

```bash
cd project_dir
atp safehouse init
```

## 1. Definition

Define packages containing one or more products.
The product types are:

| Package Type  | Description                               |
| ------------  | ------------                              |
| Rule          | Markdown as a prompt file.                |
| Skill         | SKILL.md file                             |
| MCP servers   | in any language, packed as a tar.gz file  |
| Command       | Shell scripts or programs as support tools |
| Experimental  | Payloads that are yet to be defined by industry |

A package may contain one or more of these product types that can
be installed at the user level or at the project level.

### Terminology (aligned with package-metadata)

- **Rules**: Product type for prompt markdown files. In
  [package-metadata](../notes/2026-02-25-package-metadata-and-catalog.md) and
  code, these are "assets" or "prompts."

- **Station**: Main config area at `~/.atp_station` (or `STATION_PATH`); see
  [configuration](../configuration.md).

## 2. Installation

Utility programs (executables) are installed to the user home directory by default to allow reuse across many projects. 
Prompt materials (skills, rules) are installed based on the selected scope (`--project` or `--station`).
The default for a package installation is the project space for skills and user home for programs (`--user-bin`).
This ensures the agent can use the skills immediately in the project while keeping the system clean.

Package installation involves:

1.  Making the tools available, where a program is needed (optional)

2.  Briefing the agent, via a skill or configuration to use an MCP, or though a softlink
    that makes the binary appear available in the project or in the user's home agent
    installation area `~/.cursor` for example.

### Program execution

Program Installation happens in two stages:

1.  Program installed in user bin directory so it can be executed from the PATH

2.  Program installed locally to the project only and its path is resolved
    through the skill.

### Agent tech briefing

This is the stage of package installation where the agent is enabled to use
the package program material, either at the user's home directory configuration
for the agent or at the project directory level.

### Precedence of Station or Safehouse

Where a package has been installed in a Station and version B is available, generally,
and an older version of the package, version A, has been installed completely within
a project's Safehouse the selection of A or B version in the heat of the moment, 
is up to the agent.

ATP cannot decide which tool is used by the agent when possibly two versions of the same
tool is available to the agent. Therefore, this is not a concern for ATP and not
something ATP can control, nor test.

That said, the install command assumes "project", which means Safehouse, by default.

So these commands are technically equivalent:

1.  `atp install vecfs-ts`

2.  `atp install vecfs-ts --project`

### Assumption of independence

Packages are assumed to include all components needed to get off at least
one shot. Our agent needs to be able to rely on that much, in the field.

If a package has dependencies, installation will either:

1.  include a parameter indicating dependencies must be installed; or

2.  the installation will fail with a meaningful error message saying a necessary
    dependency is missing, so the user knows what to do next.

The installation command with dependency will be given the parameter like this:

```bash
atp install vecfs-ts --project --dependencies
```

The dependencies flag acts as a pre-approval to installed dependencies.
Without this, lacking dependencies will cause installation to fail.

### Package metadata in general

Package metadata that is stored in the Station and the package as two
different levels. The station may need a URL to download the package
from a package source to the Station's manifest, ready to be installed.

The package will have details of its own that may change over time
that are part of the package, in a file called `atp-package.yaml`.

I am not being specific yet, because the details will come later
and this is part of a roadmap.

Fields to consider are:

1. Name - name of package

2. package : 
    - group: "standard" | "user"
    - source: path : {path} | url : {link}
    - version : semantic version assumed Major.Minor.Revision

3. Provider : 
    - author: name text
    - organisation: company, team or git project name, text.

4. List of package dependencies


### Installation Manifest

The user, central manifest of installed packages will be stored in:

    ${HOME}/.atp_station/manifest/${package}/atp-package.yaml

Through environment variable [see configuration](../configuration.md) the
station path can be overriden and this makes integration testing work.
It also allows people to have multiple, different station configurations.


### User home path

For execution and compatibility with other user installed programs ~/.local/ is assumed.

#### UNIX conformant bundle dirs

Executable Binary: ${HOME}/.local/bin
Supplementary files: ${HOME}/.local/share/${package}/
Configuration files: ${HOME}/.local/etc/${package}/

Where ${package} might be `vecfs-mcp-ts` as an example.

This only works where the bundle for the staged executable had
subdirectories:
- `bin` for executable files
- `share` for supplementary files
- `etc` for general configuration.

That a UNIX-like match can be performed.

#### Non-UNIX conformant directory structure

When a UNIX directory mapping to the bundle directory cannot
be performed, the files will be placed in this manner.

Executable files forced to go to this directory:
`${HOME}/.local/bin/`

All other files in the bundle forced to go this directory:
`${HOME}/.local/share/{package}/`
In the directories that were used in the bundle.

Let's give an example, of a non-UNIX type dir structure:

```
base-dir/
    scripts/
        command.sh
        cleanup.sh
    docs/
        how-to-use.md
        configuration.md
    config.toml
```

Whilst being staged, let's say that the executable path
filter is set to `base-dir/scripts/*.sh` so ATP can find
the executables, and this filter is stored in the bundle's `exec-filter` field in 
`atp-package.yaml`. Then the package when installed will have
this structure:

Executable Binary:

    ${HOME}/.local/bin/command.sh

    ${HOME}/.local/bin/cleanup.sh

Supplementary files:

    ${HOME}/.local/share/${package}/docs/how-to-use.md
    ${HOME}/.local/share/${package}/docs/configuration.md
    ${HOME}/.local/share/${package}/config.toml

It is possible the executables will conflict with existing scripts
or files of the same name. This will be resolved in a later feature.

### Project path

For isolated installation or testing, binary files and supplementary materials can be kept within the project.

Utility Binary: ${PROJECT}/.atp_safehouse/{package}-exec/bin
Supplementary files: ${PROJECT}/.atp_safehouse/${package}-exec/share

Basically, the package.tar.gz is unpacked at the base directory
of `${PROJECT}/.atp_safehouse/${package}-exec/` and this keeps installation
simple and consistent regardless of the structure of the bundle.


Where ${PROJECT} is the path of the local project.
The project's Safehouse holds configuration and local binaries when using the --project-bin flag.

The project's Safehouse holds configuration.

The `.atp_safehouse/atp-config.yaml` file should record:
1.  Project agent for handover
2.  Path to project agent's files.
3.  Path to the Station used, in case multiple stations exist.
4.  ATP version used.

Example:

```yaml
SafehouseConfig:
 - AtpVersion: 0.1.0
 - StationPath: ~/.atp_station
 - PathToAgentFiles: ../.cursor
 - Agent: cursor
```


### Skills updates

For local skills files to work, they should have the location of the utilities in the skill file,
so the agent knows how to call on the skill.

This means SKILL.md files that are installed require some dependency metadata assuming the
tool to be used and letting the installer resolve the path when the tool is installed.

## Questions about feature

### 1. Whether atp install should auto-install utility packages when a skill depends on them.

The user should be in control. If the user has requested a skill and
it has dependencies, then as a package manager, those dependencies
should be satisfied, therefore the utilities should be installed
to enable the skill.

### 2. MCP server tar.gz layout and extraction rules.

ATP can define the tar.gz packaging AND extraction rules.

When extracting, ATP should unpack to a temporary path in /tmp/{YYYY-MM-DD-package-name-version}
and then pick out the binary files from the package to install into
the right places (see above) so they would resolve in the user's PATH or be found by the patched path in the skill.md file.

Packaging paths in the tar.gz bundle should support installation:
- `bin` directory with executables, especially MCP servers.
- `share` for supplementary files
- `config` for configuration
- `skill` for the skill
- `rule` for any rule files 

### Text material patching

When patching a SKILL.md file for project agent and Safehouse installation,
e.g. SKILL.md, only the installed copy in the project's agent directory
is patched. The Safehouse copy should remain with the original, package
template, to support re-installation or handover to another agent.


## Removing packages

The proper word for the opposite of installing, is removing, not uninstall.

Packages can be removed from the Station (user's central location) or from 
the project's Safehouse. Removing a package from a Station can be done with
the --exfiltrate option to trigger migrating the binaries and Station package
assets from the Station to all Safehouses, in all projects, that refer to the
Station assets.

This supports a migration use-case and avoids leaving projects that used the
Station binaries from being compromised by the package's removal from the Station.
It works for a migration because a new version can be installed at the Station
and tested in a project before migrating all Safehouses to the new version.

This implies that Station versions of a package may differ from any Safehouse
version as long as the Safehouse is project-only installed, so it has no
reference or association with the Station.

# Other information

## Safehouse discovery for exfiltrate

See [configuration](../configuration.md) for the safehouse list. This is the
registry of safehouses trusted by the Station.

## Exfiltrate semantics 

(copy vs move): When running atp remove station <pkg> --exfiltrate, should binaries/config be copied to each Safehouse (then Station removed). There will be copies at each Safehouse, as a result so they are independent.

## Manifest richness

For Station/Safehouse manifests, the manifest will store the fields per-package
as defined earlier in "### Package metadata in general"

## Agent mapping configuration

This is configured when ATP is initialised.
It is mapped in the configuration file so that agent software changes can
be adapted and tested.

## Agent handover behavior

On atp agent handover to <new-agent-name>, ATP must proactively re-install and re-patch skills for the new agent using Safehouse templates.

## Dependency auto-install UX

Dependencies are assumed to be not needed. They can be pre-approved using `--dependencies` see above.

## Tarball concurrency
It is acceptable to use /tmp/{YYYY-MM-DD-package-name} with a unique suffix (PID/UUID) for concurrent tarball extractions. 

# Acceptance Criteria

## Catalog list

User must be able to list the catalog to select a package to install.
Criteria is that known package names from the catalog
appear in list output.

`atp catalog list` must show the known packages.
To list packages in the catalog that can be installed.

## Agent nomination

ATP needs to know which agent requires the weapons (the package) 
because every agent is different. It is to be assumed that there
will be no safehouse path in the project file until one is created.

The `atp agent` command creates the safehouse path in the project.
When the agent name is given, it configures the safehouse
for that agent so that weapons can be installed into the proper place
for that agent.

```bash
cd test_project
atp agent cursor
```

This will inform atp to use the `.cursor` directory in the project
directory for SKILL.md files.

The skill files should install to the appropriate path for the
current agent which is given by the `agent` command and is only
needed once, unless the agent is changed by the user.

Running the `agent` command a second time should not change the
configuration unless a new agent is nominated, say going from cursor
to claude. If the user runs `atp agent cursor` a second time,
atp should respond with a message telling them that it was 
unnecessary, "Q Branch already knows cursor was assigned to this project"

## Agent handover

When a project is under one particular agent and swaps it for a new
agent, this is a handover.

Where a package is installed in a project's Safehouse, a handover
can be affected like this:

```bash
atp agent handover to claude
```

The Safehouse would have known the past agent in its configuration
and so it is possible to convert a project to a new agent this way.


## Installation

When user installs a package to default locations where the package
has executables like an MCP server, then the executables must install
in the default user home area. The skills and other prompt materials
must install into the project area, assumed to be the current directory.

```bash
cd test_project
atp agent cursor
atp install vecfs-ts --{scope}
```

Where {scope} can be:

1. station - Install skills and rules into the user's Station area (~/.atp_station).

2. project (default) - Install skills and rules into the project's agent directory.

3. user-bin (default) - Install binaries into the user's home area for reuse across projects.

4. project-bin - Install binaries into the project's Safehouse bin directory for testing or avoiding version conflicts.

If no prompt scope is indicated, project scope is assumed.
If no binary scope is indicated, user-bin is assumed.


Must install vecfs executables for the vecfs-embed-ts and vecfs-ts
to the user bin directory. Any supplementary files to the share
directory - according to "### User home path" above.

## List installed packages

### Available for many projects

List installed packages from the user cross-project space.

`atp station list`

Lists the packages installed into the Station.


### Installed for use in a project

Listing installed packages that are in the project's safehouse

`atp safehouse list`


## Removing packages

### Removing from user's Station

Removing a package from the Station makes the package unavailable in
all safehouses (projects) where the Station's binaries were leveraged.
In some cases, station installed binaries may need to be installed
in the Safehouses, so those packages keep working. This could be used
as a migration strategy from version to version.

```bash
atp remove station vecfs --{scope}
```

Where {scope} can be:

1. station

2. project (default)


```bash
atp remove station vecfs --exfiltrate
```

The exfiltrate option means to move the binaries. Exfiltrate
requires, and therefore signifies, that user scoped agent installation
is undone and converted to work in the project.

Exfiltration should result in all aspects of the package migrating from
the Station to each qualifying project's Safehouse.

#### Exfiltration qualifying Safehouses

Safehouses that qualify for exfiltration are those that have a package
installed in the project's agent, where skills and other materials installed
in the Safehouse and project's agent, refer to binaries and dependencies
located in the Station.

Projects that have packages installed only into their Safehouse and local
agent do not qualify for exfiltration because they have no dependency
on the Station.

### Removing package from project safehouse

```bash
atp remove safehouse vecfs
```

Removing a package from the project safehouse should remove the markdown 
prompt matter from the package from the project's Safehouse and it should
consider removing the executables that were installed. The install manifest
needs to indicate the scope of installation for executables that captures
whether the flag at install time was `--project-bin` or `--user-bin` and when
the executable scope was --user-bin, the Station needs to be consulted
about other Safehouses that might use the same package and then check
whether any of those rely on the --user-bin install of the executable.
If none of them rely on the --user-bin executable, then the executable
can be removed.

If the executable scope were --project-bin, the executables can be removed
with extreme prejudice.
