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

## Trial publishing

This process describes creating a package for installation, locally,
by adding it to the set of user packages in the catalog.
User packages can be installed as a package testing process,
to validate against different types of agents before sharing with others
and requesting that the package be part of the standard catalog.

The developer can perform test installs into one or more projects
to validate that the process works for a good mix of Agent types.


### Explore the workflow for package devs

Use AHQ to create a skeleton package definition.

`ahq create package skeleton`

Produces ahq-package.yaml

AHQ can be used to perform various tasks, or operations, on the ahq-package.yaml

Set the package type.
Package types can be:
  1.  Rule - prompt material, usually markdown, that is installed as a rule
      or standard prompt.
  2.  Skill - markdown file describing for the agent, how to do achieve
      an outcome or a goal.
  3.  MCP servers which could vary in implementation
  4.  Shell scripts, or other executables, that automate different workflows
  5.  Experimental payloads to install into a project of a type the
      industry is yet to define.

A dev should be allowed to get this wrong and to fix it by
setting the package type again, overwriting the mistake.

`ahq package type rule`

The ahq-package.yaml file will now have `type` set to `rule`.

Early in the process, setting the package type will not influence much.
It's main purpose is to select a path for installation to a Station
or Safehouse.

Performing package validation should reveal that the package definition
is incomplete.

`ahq validate package`

> Only package type is set and many properties remain to make the package
> viable to install, such as:
> - name
> - file components
> - usage (help) information.
> 
> Command exits with non-zero result.


If a package fails to validate, then it cannot be added to the package catalog.

`ahq catalog add package`

This will examine the ahq-package.yaml, run an internal validation and then
respond with:

> Package definition is not yet complete, so it does not pass validation.
> Please continue to define the package and run `ahq validate package` for
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
ahq package name clean-docs-and-code
ahq package copyright "Warwick Molloy 2026" "All rights reserved"
ahq package license "Apache License 2.0"
ahq package version 0.1.0
```

The fields `name`, each line of the list `copyright` and the `license` field are
up to 80 characters long.

For long copyright messages, these can be set in multiple lines as so:

```bash
ahq package copyright "Warwick Molloy 2026"
# This will overwrite any existing value

ahq package add copyright "All rights reserved"
# The `add` keyword signals this is an additional list item, and not an overwrite.
```

AHQ will set `name`, `copyright`, `version` and `license` fields in ahq-package.yaml
accordingly and return with exit code 0 in all cases, even if it's
overwriting previous values.

AHQ can show a summary the package, so the developer knows what's defined
and what is still missing. To determine what's missing, the **summary**
feature will use the **validate** logic.

`ahq package summary`

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
ahq package component add docs/doc-guide.md docs/coding-standard.md
```

or, separately...

```bash
ahq package component add docs/doc-guide.md
ahq package component add docs/coding-standard.md
```

The path for `component add` subcommand can be up to system path length, which is at least 256 characters
in many modern operating systems.

AHQ will stage these by taking the files from the given path
and adding them to `stage.tar` in the same directory, the current directory,
and listing the filenames in the components list in the ahq-package.yaml file.

Layout of `stage.tar` will be simple, just the files without any subdirectory.
Markdown components do not require a directory structure and the installation
into the agent will decide the directories later. 

`tar -tf stage.tar` will output:
> doc-guide.md
> coding-standard.md

Validating the package now should confirm that it is complete.

`ahq validate package`

> Package appears complete. Mandatory minimal values are set.
> Some optional values are also set.
> This package can be added to the catalog.

We should get encourage from the package summary as well.

`ahq package summary`

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

`ahq catalog add package`

> Package clean-docs-and-code added to user package catalog.
> It can now be installed at either the Station or into a project's Safehouse.

The ahq-package.yaml would be added to the `user-packages` directory in the station
see [configuration](../configuration.md) for details of the station directory layout.
The stage file will be gziped and the output called package.tar.gz and it will be placed
with its corresponding `ahq-package.yaml` file under 
the `user-packages/clean-docs-and-code/` directory.

Exit code 0 returned, indicating success.

--------------------------------------------------------------------------

# AHQ Command Specifics

## ahq create package skeleton

Begins the work of incremental package building.
Should exit with:
- 0 if all operations succeed
- -1 or error code when files could not be deleted or created.

### Acceptance Criteria

Deletes any previous work files:
1.  ahq-package.yaml
2.  stage.tar

Creates new, empty `ahq-package.yaml` file.

----

## Property set commands

These include:
- `ahq package type rule`
- `ahq package name clean-docs-and-code`
- `ahq package usage "For prompts that ask for clean markdown docs."`
- `ahq package add usage "Simple prompt text that seeks clearer text output."`
- `ahq package developer "Warwick Molloy"`
- `ahq package copyright "Warwick Molloy 2026" "All rights reserved"`
- `ahq package add copyright "third line value"`
- `ahq package license "Apache License 2.0"`
- `ahq package version 0.1.0`

These commands all populate fields in the package file.
The only special one is the copyright subcommand where copyright
is a list of strings.

The `ahq package developer` subcommand is adding the author's name to the package.

### Acceptance Criteria

Sets the correct field value. For type, it should match the keyword
with one of the known types:
    1.  rule -> Rule
    2.  skill -> Skill
    3.  mcp -> Mcp
    4.  shell -> Command
    5.  other -> Experimental

For other subcommands, the value given within the text length limits will be taken
and used in the package file, `ahq-package.yaml`.

Exits code:
0 = File could be opened for write and value updates completed.
-1 = File cannot be found nor opened for write.

User-supplied fields must be sanitised for YAML

----

## ahq validate package

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
-1 = Missing `stage.tar` file or empty `stage.tar` file or empty components property.
-2 = Missing mandatory fields and missing components or `stage.tar` file.

----

## ahq package summary

Prints the content of the `ahq-package.yaml` file.
Lists the values of the properties that were set.
Then uses the validate function to determine what mandatory values
are missing and reports the missing elements.

### Acceptance Criteria

Must list all set items.
Mist indicate what mandatory fields are missing.

Exit code matches that from `ahq validate package`

----

## ahq package component add {path}

Checks the given path as a valid file path.
Then tests to see if a file exists at that path location.
Takes the file and add it to the `stage.tar` file, creating the file if non-existent.

### Acceptance Criteria

Must check the path and it must confirm the file exists.
If the path is invalid, it should show an error message
"Invalid path to component given: {path}"

If the file does not exist, it should show an error message "Nominated path or file 
does not exist."

Component paths must be under the package root.

If `stage.tar` cannot be created or appended this is an error.

Exit code:
0 = path OK; file exists and was added to `stage.tar`
-1 = Any failure condition with error message telling the user what failed.

----

## ahq package component remove {path}

Checks the given path as a valid file path.
Then tests to see if a file exists at that path location and if the file is listed
in the `ahq-package.yaml` as well as included the `stage.tar` file.

It then removes the file from `stage.tar` and removes it from the component list
in `ahq-package.yaml`.

### Acceptance Criteria

It must remove the file from both the `ahq-package.yaml` and `stage.tar` or leave
the file in both. At minimum, it must remove the file from `stage.tar` to save
space. During install, the file being listed will cause an error to be found.

If the file is not listed as a component and not staged in `stage.tar` then this
is a fatal error. Either, or both, error conditions should be met with an error
message, informing the user why it failed.

Exit code:
0 = file removed from stage.tar and from the component list in ahq-package.yaml
-1 = Failed for one of the reasons given above, and an error message was shown.

----

## ahq package bundle add exec-base

Add a bundle to the package and stage file. More details below.
The bundle is different to an component, where an component is a single file,
a bundle represents a tree structure and is intended for executables
and dependency files.

### Acceptance Criteria

The bundle and all directories and files under the nominated base directory
should be added to `stage.tar` and the base directory should be listed as a bundle.
Bundles, like components, in the YAML are a list entry.

Same error codes used for `ahq package component add {path}`

----

## ahq package bundle remove exec-base

Remove a bundle from the package and stage file. This undoes and is opposite
to the `ahq package bundle add exec-base` command.

### Acceptance Criteria

It must check that the bundle was listed in the `ahq-package.yaml` file
and that the bundle's directory structure was in the stage file `stage.tar`.
When either of these checks fail to find the bundle, an error message should
be displayed informing the user that the bundle had not been included in the package.

The bundle base directory should be removed from the bundle list in the package file.
And the bundle tree should be removed from the stage file. Any other staged files
should remain in `stage.tar`.

Exit codes:
0 = success - found the bundle in stage and package file and removed it from both
-1 = the bundle was not in the package and/or the staging file; or the bundle could
not be removed from the package and staging file.


## ahq catalog add package

Adds the package to the user section of the Station's catalog.
This will add to the station directory layout, see [configuration](../configuration.md)
for Station Directory Structure.

## Acceptance Criteria

It must:
1. creating a package directory with the name of the package
2. copying the ahq-package.yaml into the directory
3. Performing gzip on the stage.tar and naming the output file package.tar.gz
4. Adding the package name to the user section of the `ahq-catalog.yaml`

If any of the processes above cannot be completed, an error message
should report the failing step.

Exit code:
0 = all completed successfully
-1 = one of the 4 steps failed.

-----

# Considerations

## Naming convention

Config files use dashes with prefix `ahq-` (e.g. `ahq-package.yaml`, `ahq-config.yaml`, `ahq-catalog.yaml`). Directories use underscores (e.g. `~/.ahq_station`). See [configuration](../configuration.md).

## ahq-package.yaml layout

See [configuration](../configuration.md) for "ahq-package.yaml layout" information.

An example:

```yaml
Package:
- Name: clean-docs-and-code
- Type: Mcp 
- Developer: Warwick Molloy
- License: Apache License 2.0
- Version: 0.1.0
- Usage:
    - Prompt the agent to use the MCP server.
- Copyright:
    - Warwick Molloy 2026
    - All rights reserved.
- components:
   - SKILL.md
- bundles:
   - mcp-exec
```


## Staging files

Package assembly is an incmental process that works in the current directory.
Most likely that current directory will be the project directory where the
package and components are being developed.

Staging any files will result in creating or updating the `stage.tar` file
in the current directory.

The `stage.tar` file is temporary and should be in `.gitignore` ideally.
The staging file is created in the incremental packaging process and deleted
when the package is added to the catalog.

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

`ahq package bundle add exec-base`

The `bundle` instead of `component` tells ahq to take a bundle and replicate this structure
in the staging tar file.

The `stage.tar` file will have the same bundle directory structure.

`tar -tf stage.tar` would list:
> exec-base/share/schema/schema.schm
> exec-base/bin/parser

The ahq-package.yaml would list the `exec-base` directory as a bundle.
So, if this bundle were added to the package above, the YAML should look like this:

ahq-package.yaml

```yaml
Package:
- Name: clean-docs-and-code
- Type: Rule 
- Developer: Warwick Molloy
- License: Apache License 2.0
- Version: 0.1.0
- Copyright:
    - Warwick Molloy 2026
    - All rights reserved.
- components:
   - doc-guide.md
   - coding-standard.md
- bundles:
   - exec-base
```

