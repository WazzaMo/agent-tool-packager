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
> - file assets
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
> - file assets
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
>  - list of assets
> 
> For a rule, a list of markdown files would be normal.

Then we add the markdown assets using one line...

```bash
ahq package asset add docs/doc-guide.md docs/coding-standard.md
```

or, separately...

```bash
ahq package asset add docs/doc-guide.md
ahq package asset add docs/coding-standard.md
```

The path for `asset add` subcommand can be up to system path length, which is at least 256 characters
in many modern operating systems.

AHQ will stage these by taking the files from the given path
and adding them to `stage.tar` in the same directory, the current directory,
and listing the filenames in the assets list in the ahq-package.yaml file.

Layout of `stage.tar` will be simple, just the files without any subdirectory.
Markdown assets do not require a directory structure and the installation
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
> assets:
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
with its corresponding `ahq-package.yaml` file under the `user-pages/clean-docs-and-code/`
directory.

Exit code 0 returned, indicating success.

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

## Property set commands

These include:
- `ahq package type rule`
- `ahq package name clean-docs-and-code`
- `ahq package developer "Warwick Molloy"`
- `ahq package copyright "Warwick Molloy 2026" "All rights reserved"`
- `ahq package add copyright "third line value"`
- `ahq package license "Apache License 2.0"`
- `ahq package version 0.1.0`

These commands all populate fields in the package file.
The only special one is the copyright subcommand where copyright
is a list of strings.

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

## ahq validate package

Used to validate the properties in the package file.
The logic, or class, that implements the logic will be used in other commands.

The Validate algorithm confirms that the mandatory fields are populated.
It should also confirm that there are assets in the package and that
the `stage.tar` file exists and has non-zero length.

### Acceptance Criteria

It must list mandatory fields that are missing.
It should remind the user about optional fields.

Exit code:
0 = mandatory fields, assets and populated `stage.tar` file exists.
-1 = Missing `stage.tar` file or empty `stage.tar` file or empty assets property.
-2 = Missing mandatory fields and missing assets or `stage.tar` file.

## ahq package summary

Prints the content of the `ahq-package.yaml` file.
Lists the values of the properties that were set.
Then uses the validate function to determine what mandatory values
are missing and reports the missing elements.

### Acceptance Criteria

Must list all set items.
Mist indicate what mandatory fields are missing.

Exit code matches that from `ahq validate package`


## ahq package asset add {path}

Checks the given path as a valid file path.
Then tests to see if a file exists at that path location.
Takes the file and add it to the `stage.tar` file, creating the file if non-existent.

### Acceptance Criteria

Must check the path and it must confirm the file exists.
If the path is invalid, it should show an error message "Invalid path to asset given: {path}"
If the file does not exist, it should show an error message "Nominated path or file does not exist."
Asset paths must be under the package root.

If `stage.tar` cannot be created or appended this is an error.

Exit code:
0 = path OK; file exists and was added to `stage.tar`
-1 = Any failure condition with error message telling the user what failed.

## ahq package bundle add exec-base

Add a bundle to the package and stage file. More details below.
The bundle is different to an asset, where an asset is a single file,
a bundle represents a tree structure and is intended for executables
and dependency files.

### Acceptance Criteria

The bundle and all directories and files under the nominated base directory
should be added to `stage.tar` and the base directory should be listed as a bundle.
Bundles, like assets, in the YAML are a list entry.

Same error codes used for `ahq package asset add {path}`


-----

# Considerations

## ahq-package.yaml layout

The `ahq-package.yaml` has mandatory and optional fields

`Package` is the root structure.

| Field Name | Opt or Mand  |
|------------|--------------|
| Name       | mandatory    |
| Type       | mandatory    |
| Developer  | optional     |
| License    | optional     |
| Version    | mandatory    |
| Copyright  | optional     |
| assets     | mandatory    |
| bundles    | optional     |


An example:

```yaml
Package:
- Name: clean-docs-and-code
- Type: Mcp 
- Developer: Warwick Molloy
- License: Apache License 2.0
- Version: 0.1.0
- Copyright: Warwick Molloy 2026, All rights reserved.
- assets:
   - SKILL.md
- bundles:
   - mcp-exec
```


## Staging files

Package assembly is an incmental process that works in the current directory.
Most likely that current directory will be the project directory where the
package and assets are being developed.

Staging any files will result in creating or updating the `stage.tar` file
in the current directory.

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

The `bundle` instead of `asset` tells ahq to take a bundle and replicate this structure
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
- Copyright: Warwick Molloy 2026, All rights reserved.
- assets:
   - doc-guide.md
   - coding-standard.md
- bundles:
   - exec-base
```

