# Package Developer support

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.
Created by Warwick Molloy Feb 2026.

----------------------------------------------------------------------------

## Support for package developers

There are different types of packages that people can build for AI agents.
Said another way, an agent never knows what weapons they will need in the
field, and it's great to have options.

Let's place our heart and empathy with package developers and make it easy
for them to define their package; to support them developing and testing
their package and later publishing their package for others to use.

The inspiration for new agent tools, and packages, may appear in any
project. When this inspiration strikes, it is a good idea that the developer
will create a new package project directory and copy the prompt material
and executables into that directory. It may even be part of a build
chain, in CI/CD, that this process of staging a package may be done.

However it is achieved by the developer, the developer will need
to stage their package, which means they need to have metadata that
defines the package and the files needed to be packaged for delivery
to an agent. This feature describes that staging and metadata
build-up process, using Agent Tool Packager.

## Trial publishing

This process describes creating a package for installation, locally,
by adding it to the set of user packages in the catalog.
User packages can be installed as a package testing process,
to validate against different types of agents before sharing with others
and requesting that the package be part of the standard catalog.

The developer can perform test installs into one or more projects
to validate that the process works for a good mix of Agent types.


### Explore the workflow for package devs

Use ATP to create a skeleton package definition.

`atp create package skeleton`

Produces atp-package.yaml

ATP can be used to perform various tasks, or operations, on the atp-package.yaml

Now that we have a package skeleton, we need to configure the properties
of the package to give it a complete definition.

First, set the package type. The type of package influences what component
files or executable bundles might be included in the package and it also
influences how those files and bundles will be installed into the work
environment for an agent.

Package types can be:
  1.  Rule - prompt material, usually markdown, that is installed as a rule
      or standard prompt.
  2.  Skill - markdown file describing for the agent, how to do achieve
      an outcome or a goal.
  3.  MCP servers which could vary in implementation
  4.  Commands, which can be shell scripts, or other executables, that automate different workflows
  5.  Experimental payloads to install into a project of a type the
      industry is yet to define.

A dev should be allowed to get this wrong and to fix it by
setting the package type again, overwriting the mistake.

`atp package type rule`

The atp-package.yaml file will now have `type` set to `rule`.

Early in the process, setting the package type will not influence much.
It's main purpose is to select a path for installation to a Station
or Safehouse.

Performing package validation should reveal that the package definition
is incomplete.

`atp validate package`

> Only package type is set and many properties remain to make the package
> viable to install, such as:
> - name
> - file components
> - usage (help) information.
> 
> Command exits with non-zero result.


If a package fails to validate, then it cannot be added to the package catalog.

`atp catalog add package`

This will examine the atp-package.yaml, run an internal validation and then
respond with:

> Package definition is not yet complete, so it does not pass validation.
> Please continue to define the package and run `atp validate package` for
> feedback. When validation passes, try adding the package to the catalog.
> 
> Validation indicates:
> Only package type is set and many properties remain to make the package
> viable to install, such as:
> - name
> - file components
> - usage (help) information.
> 
> Command exits with non-zero result.

Define the package's name, add a copyright message and choose a license.

```bash
atp package name clean-docs-and-code
atp package copyright "Warwick Molloy 2026" "All rights reserved"
atp package license "Apache License 2.0"
atp package version 0.1.0
```

Give information about how the package should be used.

```bash
atp package usage "The MCP can be invoked on most agents by saying 'use package'"
```

A skill or other prompt matter should tell the agent how to use the package.
In this case, the usage should give some idea how to get started.

The fields `name`, each line of the list `copyright` and the `license` field are
up to 80 characters long.

For long copyright messages, these can be set in multiple lines as so:

```bash
atp package copyright "Warwick Molloy 2026"
# This will overwrite any existing value

atp package add copyright "All rights reserved"
# The `add` keyword signals this is an additional list item, and not an overwrite.
```

ATP will set `name`, `copyright`, `version` and `license` fields in atp-package.yaml
accordingly and return with exit code 0 in all cases, even if it's
overwriting previous values.

ATP can show a summary the package, so the developer knows what's defined
and what is still missing. To determine what's missing, the **summary**
feature will use the **validate** logic.

`atp package summary`

> Package summary:
> Name: clean-docs-and-code
> Type: Rule 
> Developer: Warwick Molloy
> License: Apache License 2.0
> Version: 0.1.0
> Copyright: Warwick Molloy 2026, All rights reserved.
> 
> Missing:
>  - list of components
> 
> For a rule, a list of markdown files would be normal.

Then we add the markdown components using one line...

```bash
atp package component add docs/doc-guide.md docs/coding-standard.md
```

or, separately...

```bash
atp package component add docs/doc-guide.md
atp package component add docs/coding-standard.md
```

The path for `component add` subcommand can be up to system path length, which is at least 256 characters
in many modern operating systems.

ATP will stage these by taking the files from the given path
and adding them to `stage.tar` in the same directory, the current directory,
and listing the filenames in the components list in the atp-package.yaml file.

Layout of `stage.tar` will be simple, just the files without any subdirectory.
Markdown components do not require a directory structure and the installation
into the agent will decide the directories later. 

`tar -tf stage.tar` will output:
> doc-guide.md
> coding-standard.md

Validating the package now should confirm that it is complete.

`atp validate package`

> Package appears complete. Mandatory minimal values are set.
> Some optional values are also set.
> This package can be added to the catalog.

We should get encourage from the package summary as well.

`atp package summary`

> Package summary:
> name: clean-docs-and-code
> components:
>   - doc-guide.md
>   - coding-standard.md
> license (opt) : Apache License 2.0
> Version: 0.1.0
> copyright (opt): Warwick Molloy 2026, All rights reserved
> This package can be added to the catalog.

Adding the package to the user package catalog should succeed.

`atp catalog add package`

> Package clean-docs-and-code added to user package catalog.
> It can now be installed at either the Station or into a project's Safehouse.

The atp-package.yaml would be added to the `user_packages` directory in the station
see [configuration](../configuration.md) for details of the station directory layout.
The stage file will be gziped and the output called package.tar.gz and it will be placed
with its corresponding `atp-package.yaml` file under 
the `user_packages/clean-docs-and-code/` directory.

Exit code 0 returned, indicating success.

--------------------------------------------------------------------------

# ATP Command Specifics

## atp create package skeleton

Begins the work of incremental package building.
Should exit with:
- 0 if all operations succeed
- 1 or error code when files could not be deleted or created.

### Acceptance Criteria

Deletes any previous work files:
1.  atp-package.yaml
2.  stage.tar

Creates new, empty `atp-package.yaml` file.

----

## Property set commands

These include:
- `atp package type rule`
- `atp package name clean-docs-and-code`
- `atp package usage "For prompts that ask for clean markdown docs."`
- `atp package add usage "Simple prompt text that seeks clearer text output."`
- `atp package developer "Warwick Molloy"`
- `atp package copyright "Warwick Molloy 2026" "All rights reserved"`
- `atp package add copyright "third line value"`
- `atp package license "Apache License 2.0"`
- `atp package version 0.1.0`

These commands all populate fields in the package file.
The only special one is the copyright subcommand where copyright
is a list of strings.

The `atp package developer` subcommand is adding the author's name to the package.

### Acceptance Criteria

#### Validating `atp package name {a-name}`

The tool should check the Station catalog to see if this name exists
in the user package list and return an error message if it does
except when:
-   the version being proposed is greater, because we support a developer
    making new versions; Ask the developer to set the version first,
    if not yet set.
-   the name exists in the standard packages list, in which case we
    should give a warning because they might be making the next version.
    Also, user packages override standard ones.

#### Validating `atp package version {version-string}`

The version string is preferred to be semantic version but it's
really up to the developer. We expect `[dev ]{major}.{minor}[.{revision}]`
where major is one or more digits; minor is one or more digits
and the second period followed by the revision and the revision
is one or more digits.

A major of `0` is considered an alpha or beta level version.

A prefix of `dev ` may be used for development versions, example `dev 0.1.0`.
The dev prefix allows the package list to be quickly scanned with `grep`
for their presence.

#### All other cases

Sets the correct field value. For type, it should match the keyword
with one of the known types:
    1.  rule -> Rule
    2.  skill -> Skill
    3.  mcp -> Mcp
    4.  shell -> Command
    5.  other -> Experimental

For other subcommands, the value given within the text length limits will be taken
and used in the package file, `atp-package.yaml`.

Exits code:
0 = File could be opened for write and value updates completed.
1 = File cannot be found nor opened for write.

User-supplied fields must be sanitised for YAML

----

## atp validate package

Used to validate the properties in the package file.
The logic, or class, that implements the logic will be used in other commands.

The Validate algorithm confirms that the mandatory fields are populated.
It should also confirm that there are components in the package and that
the `stage.tar` file exists and has non-zero length.

### Acceptance Criteria

It must list mandatory fields that are missing.
It should remind the user about optional fields.

Exit code:
0 = mandatory fields, components and populated `stage.tar` file exists.
1 = Missing `stage.tar` file or empty `stage.tar` file or empty components property.
2 = Missing mandatory fields and missing components or `stage.tar` file.

----

## atp package summary

Prints the content of the `atp-package.yaml` file.
Lists the values of the properties that were set.
Then uses the validate function to determine what mandatory values
are missing and reports the missing elements.

### Acceptance Criteria

Must list all set items.
Must indicate what mandatory fields are missing.

Exit code matches that from `atp validate package`

----

## atp package component add {path}

Checks the given path as a valid file path.
Then tests to see if a file exists at that path location.
Takes the file and add it to the `stage.tar` file, creating the file if non-existent.

### Acceptance Criteria

Must check the path and it must confirm the file exists.
If the path is invalid, it should show an error message
"Invalid path to component given: {path}"

If the file does not exist, it should show an error message "Nominated path 
or file does not exist."

Component paths must be under the package root, which should be the current
directory where `atp` has been invoked.

If `stage.tar` cannot be created or appended this is an error.

Exit code:
0 = path OK; file exists and was added to `stage.tar`
1 = Any failure condition with error message telling the user what failed.

----

## atp package component remove {path}

Checks the given path as a valid file path.
Then tests to see if a file exists at that path location and if the file is listed
in the `atp-package.yaml` as well as included the `stage.tar` file.

It then removes the file from `stage.tar` and removes it from the component list
in `atp-package.yaml`.

### Acceptance Criteria

It must remove the file from both the `atp-package.yaml` and `stage.tar` or leave
the file in both. At minimum, it must remove the file from `stage.tar` to save
space. During install, the file being listed will cause an error to be found.

If the file is not listed as a component and not staged in `stage.tar` then this
is a fatal error. Either, or both, error conditions should be met with an error
message, informing the user why it failed.

Exit code:
0 = file removed from stage.tar and from the component list in atp-package.yaml
1 = Failed for one of the reasons given above, and an error message was shown.

----

## atp package bundle add exec-base

Add a bundle to the package and stage file. More details below.
The bundle is different to a `component`, where a `component` is a single file,
a bundle represents a tree structure and is intended for executables
and dependency files.

When packaging a bundle, we need to identify the executables and distinguish
them from the non-executables, such as configuration, schema or other
supplementary file.

If the bundle has a UNIX-like directory structure, then this can be determined
from the directories in the bundle base directory {exec-base} from the command.

If the bundle is not UNIX conformant in convention then an executable
filter needs to be set using a switch `--exec-filter {path-glob}`



"UNIX conformant" is defined in 
[1-package-definition-and-installation](./1-package-definition-and-installation.md)
see "#### UNIX conformant bundle dirs".

Let's say the bundle has a directory structure like this:

```
my-utility/
    util1.sh
    util2.sh
    util.js

    config/
        agent.json
        test.json
```

In this situation the bundle staging command should be given as this:

`atp package bundle add my-utility --exec-filter my-utility/util*`

This will ensure that the utility executable files will be packed in the same location,
where the BASH Shell script invokes `util.js` using NodeJS.

The installed package will have the following structure on install:

```
bin/
    util1.sh
    util2.sh
    util.js

share/
    config/
        agent.json
        test.json
```

### Acceptance Criteria

The bundle and all directories and files under the nominated base directory
should be added to `stage.tar` and the base directory should be listed as a bundle.
Bundles, like components, in the YAML are a list entry of objects.

Each bundle entry contains:
- `path`: The relative path to the bundle directory.
- `exec-filter`: A glob pattern for finding executables.

The bundle command determines the path-glob to use or is given one. If no `--exec-filter`
is given, it defaults to `{path}/bin/*`.

If the bundle does not follow UNIX conventions with a `bin` directory for the executables
and there is no `--exec-filter` switch given, an error message should be given
to inform the user
"Bundle does not have bin/ directory. Either provide --exec-filter option so 
installation can setup the executables correctly, or place them in a bin/ directory
in the bundle."

Same error codes used for `atp package component add {path}`

----

## atp package bundle remove exec-base

Remove a bundle from the package and stage file. This undoes and is opposite
to the `atp package bundle add exec-base` command.

### Acceptance Criteria

It must check that the bundle was listed in the `atp-package.yaml` file
and that the bundle's directory structure was in the stage file `stage.tar`.
When either of these checks fail to find the bundle, an error message should
be displayed informing the user that the bundle had not been included in the package.

The bundle entry should be removed from the bundle list in the package file.
And the bundle tree should be removed from the stage file. Any other staged files
should remain in `stage.tar`.

Exit codes:
0 = success - found the bundle in stage and package file and removed it from both
1 = the bundle was not in the package and/or the staging file; or the bundle could
not be removed from the package and staging file.


## atp catalog add package

Adds the package to the user section of the Station's catalog.
This will add to the station directory layout, see 
[configuration](../configuration.md) for Station Directory Structure.

This command, like all the others, should be executed from the base
directory of the package development, the same directory where the
`atp-package.yaml` and the `stage.tar` files will be found.

## Acceptance Criteria

It must:
1. creating a package directory with the name of the package
2. copying the atp-package.yaml into the directory
3. Performing gzip on the stage.tar and naming the output file package.tar.gz
4. Adding the package name to the user section of the `atp-catalog.yaml`

If any of the processes above cannot be completed, an error message
should report the failing step.

Exit code:
0 = all completed successfully
1 = one of the 4 steps failed.

-----

# Considerations

## Naming convention

Config files use dashes with prefix `atp-` (e.g. `atp-package.yaml`, `atp-config.yaml`, `atp-catalog.yaml`). Directories use underscores (e.g. `~/.atp_station`). See [configuration](../configuration.md).

## atp-package.yaml layout

See [configuration](../configuration.md) for "atp-package.yaml layout" information.

An example MCP package:

```yaml
name: doc-reader-mcp
type: Mcp 
developer: Warwick Molloy
license: Apache License 2.0
version: 0.1.0
usage:
    - Prompt the agent to use the MCP server.
copyright:
    - Warwick Molloy 2026
    - All rights reserved.
components:
   - SKILL.md
bundles:
   - path: mcp-exec
     exec-filter: mcp-exec/bin/*
```

## Package Types

Different types of packages are expected to have different
components, some are expected to have bundles but they may not
for various reasons. It's possible that a single executable is all
that's needed and that could be provided as a single component.


### Rule type

Rules should usually have one or more markdown component.
They provide prompt material that should be used consistently
and would typically provide background on things like conventions
or standards that a team choose to use. This is the backbone
of context engineering.

Given the above, a rule is not expected to include any bundles,
just a number of markdown component files.

### Command type

Commands may have a bundle or a number of simple components.
A command on its own is probably not very useful and might
be a dependency for a skill, where the skill would tell the
agent how to use the command as extra agency - a utility
that "Q branch" placed at the disposal of the agent.

Note that "Q branch" is an spy language term meaning a developer
of tools for (spy) Agents.

### Skill type

Skills will have at least one markdown component - the SKILL.md.
It may rely on or depend on a Command to provide the utility
tool that the skill informs the agent on effective use.

If a skill provides a bundle, it should be seen as a standalone
Skill and Command package that has no dependencies on other
packages.

### Mcp server type

MCP servers will have a bundle typically for the MCP executable
which might be implemented in one of many languages and frameworks.

An Mcp may include markdown components, such as a SKILL.md
to inform the agent on usage and triggers for using the MCP.

### Experimental type

AI is a developing space, so it is likely that other packages
may be developed as an experiment before the type is properly
recognised.

An `Experimental` type of package is a catch-all and the developer
of an experimental package may need to alter the Station's configuration
to update the installation path mappings to fit the needs of their
experiment.

By default, an Experimental package type will be treated
as an MCP server because it has the most elaborate structure.

-----

## Staging files

Package assembly is an incremental process that works in the current directory.
Most likely that current directory will be the project directory where the
package and components are being developed.

Staging any files will result in creating or updating the `stage.tar` file
in the current directory where the package files are found. In other words,
the package project directory, where the `atp` commands will be executed.

The `stage.tar` file is temporary and should be in `.gitignore` ideally.

The lifecycle of `stage.tar` the staging file is generally brief.
1.  the staging file should be created when components or bundles are added
    to the package being built - this is the staging process.
2.  when a new skeleton package is created, any lingering staging files
    are deleted because they must have been for a previous package.
3.  when the package is added to the Station's catalog, the staging
    file is deleted as a clean-up function.

The staging file is created in the incremental packaging process and the
when the package is added to the Station's catalog because it will no longer
be needed because it's content has been copied to the Station's package
directory.

### Staging executables

Executables may require a directory structure.
Let us pretend we had an executable that followed a UNIX style install, like this:

/usr/local/share
    - schema/
        - schema.schm
    - misc
/usr/local/bin
    - parser

The original bundle for this may have had this structure:

exec-base/
    share/
        schema/
            schema.schm
    bin/
        parser

`atp package bundle add exec-base`

The `bundle` instead of `component` tells atp to take a bundle and replicate this structure
in the staging tar file.

The `stage.tar` file will have the same bundle directory structure.

`tar -tf stage.tar` would list:
> exec-base/share/schema/schema.schm
> exec-base/bin/parser

The atp-package.yaml would list the `exec-base` directory as a bundle.
So, if this bundle were added to the package above, the YAML should look like this:

atp-package.yaml

```yaml
name: clean-docs-and-code
type: Rule 
developer: Warwick Molloy
license: Apache License 2.0
version: 0.1.0
copyright:
    - Warwick Molloy 2026
    - All rights reserved.
components:
   - doc-guide.md
   - coding-standard.md
bundles:
   - path: exec-base
     exec-filter: exec-base/bin/*
```

# Test Approach

The objective is to use the technique for interactively building a package described above
and create a test package.

## Steps

1. Create a test station directory - "test-station"
Init the station in the "test-station" directory using STATION_PATH to override the default.

2. Create a temporary package building directory "pkg-dir"

3. cd to pkg-dir and create a sekeleton package file.

4. Set the name to "test-package-1" that contains a single
rule type package with a markdown file with this content

Test rule prompt `test-rule.md` - create this file in the directory "pkg-dir"

```markdown
# Rule Test Package

Being able to install this, means success.
```

3. Define the package with random strings for all other mandatory field values.

4. Stage the test markdown file "test-rule.md" and add the package to the test station.

5. Add the package to the station's catalog as a user package.


Assertion:

Check that the package appears in the user_package part of the catalog in the
test station with both the `atp-package.yaml` and the `package.tar.gz` file.
