# 3 Package Intall Process

Focusing on the details of the process for installing a package into a project
directory, into the Safehouse linked with a project.

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
    packages-installed:
        - clean-code-rule:
            - version: 0.1.0
            - developer: Warwick Molloy
            - type: rule
            - provided_executables: 0
            - install_scope:
              - prompt_matter: --project-bin
              - executables: --user-bin
            - location:
              - prompt_matter: .cursor/rules/clean-code-rule
#              - executables: # field should be omitted when no execs included.
```
### Package with file components and executables

For a package providing both file components and executables.

```yaml
Safehouse-Manifest:
    packages-installed:
        - wonderful-mcp-server:
            - version: 0.1.0
            - developer: Warwick Molloy
            - type: rule
            - provided_executables: 0
            - install_scope:
              - prompt_matter: --project-bin
              - executables: --user-bin
            - location:
              - prompt_matter: .cursor/rules/clean-code-rule
              - executables:
                - bin_files: .atp_safehouse/bin
                - share_files: .atp_safehouse/share
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