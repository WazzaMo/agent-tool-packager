# AHQ configuration

This document describes how to configure ahq: the main config file, catalogs
(local vs global), and how to add or author packages.

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.
Created by Warwick Molloy Feb 2026.

# Config file location

ahq reads configuration from a single directory. By default that directory is
`~/.ahq`. You can override it with the environment variable `AHQ_CONFIG_HOME`
(set to the directory path). That directory must contain:

| File          | Purpose                                |
|---------------|----------------------------------------|
| config.yaml   | Prompt sources and install destination |
| catalog.yaml  | Your local package catalog (optional)   |

When `AHQ_CONFIG_HOME` is not set, `~/.ahq` is used. Overriding is useful for
testing or alternate setups.

# Main config: config.yaml

The main config file defines where prompt markdown comes from when you run
`ahq install` with no package name, and where those files are written.

## Options

| Option               | Meaning                                      |
|----------------------|----------------------------------------------|
| prompt_sources       | List of paths (dirs or files) to copy from   |
| project_prompts_dir  | Subdir in the project where prompts go       |

Paths in `prompt_sources` can be absolute or start with `~/` (expanded to your
home directory). Directories are copied one level only (no recursion); list a
subdirectory explicitly if you need its `.md` files.

If `project_prompts_dir` is omitted, the default is `prompts`.

## Example config.yaml

```yaml
# ~/.ahq/config.yaml (or $AHQ_CONFIG_HOME/config.yaml)

prompt_sources:
  - ~/.ahq/prompts
  - /path/to/shared/prompt-assets

project_prompts_dir: prompts
```

With this config, `ahq install` (no arguments) copies all `.md` (and `.markdown`)
files from those sources into the current project under `prompts/`.

# Catalogs and packages

Besides installing from config, you can install **packages** by name. Packages
are listed in **catalogs**. ahq merges three catalogs when resolving a name:

| Catalog   | Location              | Who controls it        |
|-----------|-----------------------|------------------------|
| Global    | Bundled with ahq      | ahq project (read-only)|
| User      | ~/.ahq/catalog.yaml   | You                    |
| Project   | ./.ahq/catalog.yaml   | Per-repo (optional)    |

Precedence: **project overrides user overrides global**. When the same package
name appears in more than one catalog, the entry from the higher-precedence
catalog is used.

# Adding local packages

Local packages are entries in your user catalog (`~/.ahq/catalog.yaml`) or in a
project catalog (`./.ahq/catalog.yaml`). You do not edit the global catalog.

## Add a user-local package

From the command line:

```bash
ahq catalog add <name> <path-or-url>
```

Example: add a package named `my-guide` that lives in a directory:

```bash
ahq catalog add my-guide /home/me/my-prompts/guide
```

This creates or updates `~/.ahq/catalog.yaml` with an entry for `my-guide`
pointing at that path. You can then run `ahq install my-guide` to copy its
assets into the current project.

Optional version (default is `0.0.0`):

```bash
ahq catalog add my-guide ~/my-prompts/guide --version 1.0.0
```

## Add a project-local package

To scope packages to a single repository, create a project catalog:

1. Create the directory: `mkdir -p .ahq`
2. Create or edit `.ahq/catalog.yaml` with the same structure as the user catalog
   (see below). Add your package entries there.

Project catalog entries override user and global entries with the same name.

## Local catalog file shape

Both user and project catalogs use this YAML shape:

```yaml
packages:
  - name: my-guide
    version: 1.0.0
    description: My custom prompt guide.
    location: /home/me/my-prompts/guide
  - name: team-docs
    version: 0.1.0
    description: Team documentation templates.
    location: file:///shared/ahq-packages/team-docs
```

`location` can be a filesystem path or a `file://` or `https://` URL. The
package at that location should contain the assets (e.g. markdown files) to
copy when you run `ahq install <name>`.

# How locals hide or override global packages

The merged catalog is built in order: global first, then user, then project.
For each package name, the **last** entry wins.

So if the global catalog defines a package named `doc-guide`, and you add a
local package with the same name (via `ahq catalog add doc-guide /path/to/yours`),
then:

- `ahq list` will show one `doc-guide` entry; its source will be `local` (or
  `project` if you added it to the project catalog).
- `ahq install doc-guide` will copy assets from your path, not from the global
  package.

That is how you **hide** or **override** a global package: add a local (or
project) package with the same name. You cannot remove a global entry; you can
only override it by providing a local one with that name.

To stop overriding, remove the local entry:

```bash
ahq catalog remove doc-guide
```

(Only local and project catalog entries can be removed.)

# Global packages: proposing and authoring

Global packages are curated by the ahq project and shipped with the CLI. They
are read-only for users. If you want to propose a new global package or author
one for inclusion, follow the package format below and open an issue or pull
request on the ahq repository.

## What the global catalog is

The global catalog is a YAML file bundled in the ahq binary (`default-catalog.yaml`
in the source). It lists packages with:

| Field        | Purpose                              |
|--------------|--------------------------------------|
| name         | Unique package id (slug-style)       |
| version      | Semver or similar                    |
| description  | Short summary for `ahq list`         |
| location     | Path or URL to the package contents  |

Example entry:

```yaml
packages:
  - name: doc-guide
    version: 1.0.0
    description: Markdown documentation style guide for AHQ.
    location: https://github.com/WazzaMo/ahq/raw/main/prompt-assets/docs
```

Users see these when they run `ahq list` (source: `global`) and can install
them with `ahq install <name>`.

## Authoring a package for the global catalog

To propose or author a global package:

1. **Create a package** that is a versioned set of assets (typically markdown).
   Put the files in a directory or repository that can be referenced by a
   stable path or URL.

2. **Optionally add a manifest** beside the assets (e.g. `ahq-package.yaml` or
   `package.yaml`) with at least:
   - `name`: same as the catalog entry
   - `version`: same as the catalog entry
   - `description`: short summary
   - `assets`: list of relative paths to include (or rely on tool convention)

   A manifest makes the package self-describing. The catalog entry still needs
   `name`, `version`, `description`, and `location` so ahq can list and install
   without fetching the package first.

3. **Use semantic versioning** (e.g. 1.0.0). Bump the version when you change
   assets or the manifest in a way that warrants a new release.

4. **Propose it to ahq**: open an issue or PR at the ahq repository with:
   - The package name, version, description, and a stable location (URL or path
     that the project can use in the bundled catalog).
   - A short rationale for including it as a global package (e.g. widely useful
     prompt or guide). The maintainers will decide whether to add it to
     `default-catalog.yaml`.

Once a package is in the global catalog, users can install it by name. They
can also override it locally by adding their own package with the same name, as
described above.
