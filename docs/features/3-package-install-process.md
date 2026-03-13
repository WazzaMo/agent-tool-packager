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
