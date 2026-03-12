# Package metadata and catalog for asset packages

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.
Created by Warwick Molloy Feb 2026.

## What is a package here?

A package is a versioned unit of one or more assets. An asset is typically a
markdown document (e.g. a prompt, a guide) but could be other artifacts.
Package authors ship a set of files plus metadata that describe the package.

## Package metadata

Authors describe the package in a manifest that lives with the assets. The
manifest should be machine-readable and include at least:

| Field       | Purpose                                      |
|-------------|----------------------------------------------|
| name        | Unique package id (e.g. slug or reverse-DNS) |
| version     | Version of this release (see versioning)     |
| description | Short human-readable summary                 |
| assets      | List of relative paths to included files     |

Optional fields can cover licence, author, homepage, and dependencies on other
packages.

### Where the manifest lives

Two straightforward options:

1. **Single manifest file** in the package root, e.g. `atp-package.yaml` or
   `package.yaml`. Tools (and the catalog) read this to know what the package
   contains and how it is versioned.

2. **Convention from layout**: e.g. "every `.md` in this directory is part of
   the package; version and name come from a small sidecar file." Fewer moving
   parts but less explicit than a full manifest.

Recommendation: a single manifest file so the catalog and CLI can parse one
thing and know the full list of assets and the version.

## Versioning

Packages are versioned so consumers can pin or upgrade. When any asset (or the
manifest) changes in a way that authors consider a new release, they bump the
version.

- **Semver (Major.Minor.Patch)** fits well: breaking changes to prompts or
  renames bump major; new assets or non-breaking edits bump minor or patch.
- **Date-based or monotonic** versions are possible if the ecosystem prefers
  simplicity over semver semantics.

The version lives in the manifest and, if desired, in the catalog entry so
clients can resolve "latest" or "1.2.x" without opening every package.

## Describing the catalog of packages

A catalog is an index of known packages and their metadata. It answers: what
packages exist, what version(s) they have, and where to get them.

### Catalog as data

The catalog can be a single file or a directory of entries. Each entry
describes one package:

- Package name (and optionally namespace or source)
- Version(s) available, or a pointer to where to discover versions
- Location: filesystem path, URL, or registry identifier so the CLI can
  resolve and fetch (or copy) the package

So the catalog is "metadata about packages" rather than the assets themselves.
Package authors (or curators) register packages in the catalog; the catalog
does not need to hold the full asset content.

### What the catalog file might look like

A minimal catalog could be a YAML or JSON array of entries, e.g.:

```yaml
# catalog.yaml or similar
packages:
  - name: doc-guide
    version: 1.0.0
    description: Markdown documentation style guide for ATP.
    location: file:///path/to/prompt-assets/docs
  - name: clean-code
    version: 1.0.0
    description: Coding conventions for Agent Tool Packager.
    location: https://example.com/atp-packages/clean-code
```

Or the catalog could reference each package’s manifest URL so that the
authoritative metadata (and list of assets) is fetched from the package
itself; the catalog then only needs name, location, and maybe latest version
for display or resolution.

### Where the catalog lives

- **User home**: e.g. `~/.atp_station/catalog.yaml` for packages the user has added
  or subscribed to.

- **Project**: e.g. `./.atp-local/catalog.yaml` for packages scoped to that
  project.

- **Bundled or remote**: ATP could ship or point at a default catalog (e.g.
  GitHub repo or static JSON) so users see a default set of packages without
  configuring anything.

Combining these (e.g. merge project catalog with user catalog, with
project overriding) gives flexibility for teams and individuals.

## Summary

| Concept        | Description                                                                 |
|----------------|-----------------------------------------------------------------------------|
| Package        | One or more assets (e.g. markdown) plus a manifest with name, version, list. |
| Manifest       | File in package root (e.g. atp-package.yaml) describing the package.        |
| Versioning     | Semver or similar; bump when assets or manifest change.                     |
| Catalog        | Index of packages: name, version, location; user/project/remote sources.   |

Package authors: add a manifest next to your assets and (optionally) register
the package in a catalog so others can discover and install it by name and
version.
