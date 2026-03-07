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

produces package.yaml

AHQ can be used to perform various tasks, or operations, on the package.yaml

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

The package.yaml file will now have `type` set to `rule`.

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


If a package fails to validate, then it cannot be added to the package
manifest.

`ahq manifest add package`

This will examine the package.yaml, run an internal validation and then
respond with:

> Package definition is not yet complete, so it does not pass validation.
> Please continue to define the package and run `ahq validate package` for
> feedback. When validation passes, try adding the package to the manifest.
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
```

AHQ will set `name`, `copyright` and `license` fields in package.yaml
accordingly and return with exit code 0 in all cases, even if it's
overwriting previous values.

AHQ can summarise the package, so the developer knows what's defined
and what is still missing. To determine what's missing, the **summarise**
feature will use the **validate** logic.

`ahq package summary`

> Package summary:
> Name: clean-docs-and-code
> Type: Rule 
> Developer: Warwick Molloy
> License: Apache License 2.0
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

AHQ will stage these by taking the files from the given path
and adding them to stage.tar and listing the filenames
in the assets list in the package.yaml file.