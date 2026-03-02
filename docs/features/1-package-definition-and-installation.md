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

A package may contain one or more of thesse product types that can be installed
at the user level or at the project level.

## 2. Installation

Utility programs can be installed to the user home directory or the local project.
The default is the user home directory for easiest reuse.

### Installation Manifest

The user, central manifest of installed packages will be stored in:

    ${HOME}/.ahq_station/manifest/${package}.yaml

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


# Acceptance Criteria

The 

