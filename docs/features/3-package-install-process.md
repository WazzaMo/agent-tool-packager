# 3 Package Intall Process

Focusing on the details of the process for installing a package into a project
directory, into the Safehouse linked with a project.

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.
Created by Warwick Molloy Feb 2026.


# Start with example workflows and actions

## Assumptions

The project directory is called `sdl_c++_game` and we want to install the
user package called `clean-code-rule` to assist in the development of clean
C++ code using the Cursor agent. For the sake of argument, this will be the
agent visible in the Cursor editor which has more features and is better documented
than the CLI agent, even though I prefer working with a CLI agent.

The user package has been packaged up according to the workflow in [Feature 2](./2-package-developer-support.md)
and is registered as a user package.
The Safehouse has not yet been initialised.
The development environment is Linux using WSL in Windows.

## Workflow

Go to the project directory.

`cd sdl_c++_game`

Initialise the Safehouse.

`atp safehouse init`

Exit code 0

This creates an empty manifest.
It is empty because of the following conditions:

1.  The CWD=`sdl_c++_game`
2.  ${CWD}/.atp_safehouse/manifest.yaml packages list is empty.

The Safehouse manifest is only a YAML file and all metadata regarding installed
packages are kept in that one YAML file. This makes querying for current installed
packages simpler.

`atp safehouse list`

> `No packages installed in the Safehouse.`
Exit code 0.

`atp catalog list`

> clean-code-rule
Exit code 0.

Lists just the one user package.

Set the agent for the project.

`atp agent cursor`

Exit code 0.

`atp install clean-code-rule --project`

> Package clean-code-rule installed successfully.

Exit code 0.

Checking for installed packages...

`atp safehouse list`

> clean-code-rule

Exit 0

## Example manifest files

The manifest file located at `${CWD}/.atp_safehouse/manifest.yaml` looks like these
examples.

### Prompt matter only - file components without executables

For a package that only has file components, the manifest entry would look like this.

```yaml
Safehouse-Manifest:
    packages:
        - name: clean-code-rule
          version: 0.1.0
          source: local
          binary_scope: user-bin
```
### Package with file components and executables

For a package providing both file components and executables.

```yaml
Safehouse-Manifest:
    packages:
        - name: wonderful-mcp-server
          version: 0.1.0
          source: local
          binary_scope: project-bin
```

## Installation process that achieved the result

The process performed during package install, when the command
`atp install clean-code-rule --project`
was executed will be broken down here, so we can write unit tests, 
integration tests and implement the code fully.

First note the option `--project` is deemed optional because it is the default
behaviour - see
[feaure 1-package-defintion-and-installation](./1-package-definition-and-installation.md)
 for details.

The process steps are as follows, if any of these fail the process halts with an error
message indicating any as many of these steps that could not complete successfully
and why. Giving this level of detail allows the user to take corrective action.

Steps:

1.  Check the installation house scope - "station" or "safehouse" (default) and the
    executable scope "user" (default) or "project", known as "--user-bin" or "--project-bin"
    respectively.
    In this example, we expect "safehouse" house scope and user executable scope.

2.  Find the project's safehouse directory in `${PROJECT_DIR}/.atp_safehouse/` and 
    use the configfile to access the configured station.

3.  Check if the Station has the package in its catalog as either a standard
    or user package (we expect user in this example) and find the packages
    files - `atp-package.yaml` and `package.tar.gz`

4.  Each bundle directory in `package.tar.gz` is unpacked into the executable path
    where that path depends on the executable install scope user or project.

    a:  `package.tar.gz` is not UNIX conformant, use the `bin_files` field to copy
        the executables to the user bin directory.
    
    b:  `package.tar.gz` package file is UNIX conformant, the exec_base directory in the
        package file can be unpacked to ~/.local/ such that bin -> bin, share -> share etc.

UNIX conformant is defined in 
[1-package-definition-and-installation](./1-package-definition-and-installation.md)
see "#### UNIX conformant bundle dirs".

For point (4) above, this means that there is an installation mapping that when installed
to a project Safehouse, this structure is unpacked directly.
When installed to ~/.local/, the installer uses the exec-filter to pull
scripts into bin/ while placing the remaining hierarchy into share/.

5.  Depending on the package type, look up the station's configuration agent-paths object
    for the agent configured in the Safehouse to then find the agent's `home_path`
    and type relative path component by type, `rule` field for a rule type, `command` for command
    type and so on. The proper path for the file components (markdown prompt matter)
    can be copied into is composed using ${home_path}/{type_relative_path}.

6.  Any prompt markdown component files, especially SKILL.md skill file or markdown in rules,
    will require adjustment depending on the executable path used, depending
    on the exec scope at install time. Adjusting the path in the markdown makes
    it easier for the agent to call the executable correctly in a single attempt
    and this compensates for the different exec scope at install time.

7.  Assuming previous steps succeeded, add the package to the Safehouse's manifest
    of installed packages.

In these 6 points, we are assuming specific install scopes and have laid out the general
process for unpacking any executable files in their respective directories, unpacking
prompt matter such as rules and skills, adjusting prompt matter if the exec scope
installs to the project so the agent can find the executables and lastly add
the installed package to the Safehouse's manifest.

--------------------------------------------------------------------------

# Test Approach

Use the technique for interactively building a package described
in [feature 2](./2-package-developer-support.md) and create a test package.

Create a test station directory - "test-station"
Init the station in the "test-station" directory.

For this test, create a package called "test-package-1" that contains a single
rule type package with a markdown file with this content:

Test rule prompt `test-rule.md`

```markdown
# Rule Test Package

Being able to install this, means success.
```

Define the package with random strings for all mandatory field values.

Stage the test markdown file "test-rule.md" and add the package to the test station.

Add the package to the station's catalog.

Create a directoy as the supposed project directory.

Init a Safehouse in that new project.
Set the agent to "cursor"

Attempt installing the test package into the safehouse.

There are no executables, so all file components will be written to the safehouse.

Check that the rule appears in the .cursor directory in the test project directory.

--------------------------------------------------------------------------

# Markdown prompt matter format

The markdown files for rules and skills need to know where the executable
parts of the package will be installed but the actual location on disk
may vary.

## Keep the convention simple

Markdown needs to instruct an agent how to run a command, it needs a variable
that represents the executable's path. For bundle "text_util" that path
variable should be {text_util} so then upon package installation, the
variable will be replaced, using something like sed "s/var/value/g",
so that the installed markdown is exactly correct.

## Example 1

A package called "copyrighter" comes with a skill and a command
to patch copyright messages into text files.

SKILL.md for a copyright header tool that adds a head banner to source
code with a copyright message on demand, for the agent.

The bundle with the shell script, called "patch_tool" has
a shell script called "file-patch.sh" that takes
a filename to patch, a string to replace as the patch target within the file
and the message to insert.

SKILL.md text would read like this:

```markdown
---
name: copyrighter
description: Use this when the agent needs to patch a copyright message into a text file.
---
You need to know these parameters before starting:
1. {filepath} = the file path to patch
2. {target} = the patch target (string to replace)
3. {message} = the copyright message that will replace the target.
Run {patch_tool}/file-patch.sh {filepath} {target} {message}
```

Upon installation of this package, the {patch_tool} text in SKILL.md is replaced
with the path of the executable, wherever on disk it may be, and the skill
works.

--------------------------------------------------------------------------

# ATP Command Specifics

# atp agent {agent-name}

This command is specific to project work because it's here that
you will choose and agent to get things done.

If the Safehouse has not been created in that project, it must fail, but
when it is present, this command updates the `Agent` field 
in the `.atp_safehouse/atp-config.yaml` file to the agent value.

It will only accept agent names where the Station config has an `agent-paths` object with entries
for that agent.

## Acceptance Criteria

Examines the current directory and the parent to a dir radius of at least 2 directories,
to identify the base project directory, looking for dot files/dirs as evidence of project base,
such as `.git` directory or `.vscode` directory. If the project base cannot be found, it must inform the user.

Checks for the presence of the Safehouse directory and configuration files, if not found, it must inform the user.

Checks the current value of `selected-agent`, if the same as the given {agent-name} then inform the user and stop successfully. Check if the {agent-name} is one registered in the Station's 

# atp package bundle add {bundle_name} [exec-filter {filter-path}]

`atp package bundle add {bundle_name} [exec-filter {filter-path}]`

Where exec-filter is needed for non-UNIX conformant bundles, thus optional.
The value {bundle_name} was called {exec_base} before but it is MUCH BETTER
to think of it as a "bundle name" because that allows multiple bundles
to be added to a package and clearly assumes the bundle name is unique.

It makes giving instructions to developers easier and more consistent
for their workflow to say "Create a directory for your bundle, using that name
of that bundle for the directory."

The Non-UNIX compliant versus UNIX style staged bundle directory structure is detected
using two criteria for compliant or proper, non-compliant.

"proper" means the exec-filter was given and the packager can resolve the executables
within the non-compliant bundle.

If the bundle is NOT PROPER, this triggers failure of the bundle add command.
We cannot add a bundle where the executable files cannot be resolved.

Bundles are not intended to be a collection of text files because
multiple file components can be added, that's how that problem is solved.
So the defining thing about bundles is that they contain ONE OR MORE EXECUTABLES
that the packager knows how to find and can associate with the name
of the bundle.

## UNIX compliance bundle criteria

Relative to the bundle base directory {exec-base} the following pattern of directories satisfies UNIX compliance.

- bin/{executables} - ideally with the executable filesystem flag set as confirmed by fstat.
- etc/{text-files} - optional
- share/{text-files} - optional

The minimal criteria is the presence of the bin/ directory with executable files.
The path criteria that detects UNIX compliance is this:
  `stage.tar: {exec-bin}/bin/{files}`


A UNIX compliant stage.tar and its corresponding package.tar.gz that results:

| script.tar path             | package.tar.gz path          |
|-------------------          |----------------------------  |
| base_dir/bin/run-mcp.sh     | base_dir/bin/run-mcp.sh      |
| base_dir/bin/check-status.sh| base_dir/bin/check-status.sh |
| base_dir/etc/config.json    | base_dir/etc/config.json     |

Meaning the variable {exec_base} has the value `base_dir`.

We can see the point that UNIX compliant set up makes the whole thing easier
and more predictable.

## Usable Non-UNIX compliant bundle criteria

The minimum criteria is that the bundle exec-base directory contains executable files somewhere
in its structure and that the exec-filter value has a path glob pattern that can isolate the
executables.

An example would be:

1. the {exec-base} flag has the value `scripts`
2. the {exec-filter} flag has the value scripts/*.sh

stage.tar:
    /scripts/run-mcp.sh
    /scripts/check-status.sh

This allows the packaging solution to convert this staged file into a UNIX compliant package
when adding it to the Station catalog by mapping.

| script.tar path           | package.tar.gz path             |
|-------------------        |----------------------------     |
| scripts/run-mcp.sh        | bundle_base/bin/run-mcp.sh      |
| scripts/check-status.sh   | bundle_base/bin/check-status.sh |

Meaning the variable {exec_base} has the value `bundle_base` in the final package.

Having made that conversion once creating the final package.tar.gz, the file is much easier
to install in the user's ~/.local directory.

## Note

The package.tar.gz file is not created when adding the bundle, it is created
and the layout produced, when the package is added to the Station's catalog.
The tables above show `package.tar.gz` to indicate the ultimae packaging
goal or target.

## Return codes and error handling.

The command should print messages to reassure that the bundle has been
processed correctly.

```text
 Bundle {exec_base} found
 Bundle executable files filtered with string "scripts/*.sh"
 Executables packed to:
   - scripts/run-mcp.sh
   - scripts/check-status.sh
```

Exit code:

0 = when either UNIX-compliance is found or usable Non-UNIX compliance is found and the
`exec-filter` option locates the executables.

1 = when bundle's exec-filter does not find executable files meaning that the exec-filter
is blank or globbing finds no files, or no files are present in the bundle.
