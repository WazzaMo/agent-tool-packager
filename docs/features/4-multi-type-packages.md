# Feature 4 - Multi-type Packages

In Cursor, an MCP may work better with a Rule or a Skill to inform the agent how
to use and when the MCP, to get the best effect.

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.
Created by Warwick Molloy Feb 2026.

# Inspiration

VecFS which is an MCP, vector embedder and Skill combination requires multi-type
packaging. It probably isn't the only package. I considered using dependencies
and thus spread it across multiple packages, each of the needed type but this
is clumsy.

## Backwards compatibility, versions and migration

Version 0.2.2 has been published and we don't know if people are using it, so
we must assume they are, and that asks us to provide a migration step.

### Version 0.2.3

Will be the end of the 0.2.x versions as the final revision and will provide
a migration path to version 0.3.0 which means this cannot be a breaking change.

Version 0.2.3 will introduce the new atp-package.yaml layout and move new packages
to multi-type support while also handling install and remove operations of the
original format.

### Version 0.3.0

This will support any existing, single-type packages with installation and removal,
as should always be allowed, but will create multi-type packages by default.

# Extending atp-package.yaml ...

Some fields remain singular, because they describe the package, like the name,
versionn, developer, copyright and the things associated with the type, like
the components and bundles must be part of another object, within a list
of such objects.

## version <= 0.2.2 atp-package.yaml layout

See [configuration.md](docs/configuration.md) section **atp-package.yaml layout** for
the existing layout, which is below.

The `atp-package.yaml` has mandatory and optional fields

`Package` is the root structure.

| Field Name | Opt or Mand  | Type        | max len |
|------------|--------------|-------------|---------|
| Name       | mandatory    | string      |     80  |
| Type       | mandatory    | string      |     20  |
| Developer  | optional     | string      |     80  |
| License    | optional     | string      |     80  |
| Version    | mandatory    | string      |     80  |
| Copyright  | optional     | string list |     80  |
| Usage      | mandatory    | string list |     80  |
| components | mandatory    | string list |    256  |
| bundles    | optional     | bundle list |    256  |

A **bundle list** is a list of objects, where each object contains:
- `path`: The relative path to the bundle directory.
- `exec-filter`: A glob pattern (relative to the package root) identifying executable files.

An example:

```yaml
name: clean-docs-and-code
type: Mcp 
developer: Warwick Molloy
license: Apache License 2.0
version: 0.1.0
copyright:
    - Warwick Molloy 2026
    - All rights reserved.
usage:
    - Use this for cleaning docs.
components:
   - SKILL.md
bundles:
   - path: mcp-exec
     exec-filter: mcp-exec/bin/*
```

## version => 0.2.3 atp-package.yaml layout

THE NEW LAYOUT allows for multiple parts, each with their type.

The `atp-package.yaml` has mandatory and optional fields

`Package` is the root structure.

`Part` will be the new type, usage, component and bundle structure that supports
multi-type packages.

| Field Name | Opt or Mand  | Type        | max len |
|------------|--------------|-------------|---------|
| Name       | mandatory    | string      |     80  |
| Type       | mandatory    | str 'multi' |     20  |
| Developer  | optional     | string      |     80  |
| License    | optional     | string      |     80  |
| Version    | mandatory    | string      |     80  |
| Copyright  | optional     | string list |     80  |
| Usage      | optional     | string list |     80  |
| components | optional     | string list |    256  |
| bundles    | optional     | bundle list |    256  |
| parts      | mandatory    | part list   |    256  |


The Part layout:

| Field Name | Opt or Mand  | Type        | max len |
|------------|--------------|-------------|---------|
| type       | mandatory    | string      |     20  |
| Usage      | mandatory    | string list |     80  |
| components | optional     | string list |    256  |
| bundles    | optional     | bundle list |    256  |


A **bundle list** is a list of objects, where each object contains:
- `path`: The relative path to the bundle directory.
- `exec-filter`: A glob pattern (relative to the package root) identifying executable files.

An example for layout for versions 0.2.3 and beyond.

```yaml
name: clean-docs-and-code
type: multi
developer: Warwick Molloy
license: Apache License 2.0
version: 0.1.0
copyright:
    - Warwick Molloy 2026
    - All rights reserved.
parts:
    - type: Skill
      usage:
        - Use this for cleaning docs.
      components:
      - SKILL.md
    - type: Mcp
      usage:
        - Identifies the docs to clean.
      bundles:
      - path: mcp-exec
          exec-filter: mcp-exec/bin/*
```
