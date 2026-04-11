# Authoring packages

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

# Goal

Authoring is the loop of creating `atp-package.yaml`, staging files into `stage.tar`,
validating, and publishing the package into your Station catalog so installs can consume
it. All of this happens in a directory you choose as the package root (usually alongside
the files you want to ship).

# Start from a skeleton

```bash
atp create package skeleton
```

By default this writes a Multi-capable manifest: root `type: Multi` and an empty `parts`
list, and resets `stage.tar` for a clean slate.

If you need the older single-type flow (one root `type`, root-level `usage` and
`components`), create a legacy skeleton instead:

```bash
atp create package skeleton --legacy
```

# Set package metadata

Typical commands (run from the package directory):

```bash
atp package name my-package-name
atp package developer "Your Name"
atp package license "Apache License 2.0"
atp package version 0.1.0
atp package copyright "You 2026"
```

Copyright accepts multiple strings if you pass more than one argument.

# Multi-part workflow (default)

Add a part with a type keyword (rule, prompt, skill, hook, mcp, command, experimental):

```bash
atp package newpart rule
```

or the equivalent:

```bash
atp package part add rule
```

Then scope usage and files to that part index:

```bash
atp package part 1 usage "Short explanation for humans and agents."
atp package part 1 component path/to/file.md
```

Add bundles when the part needs executables:

```bash
atp package part 1 bundle add my-server-dir --exec-filter "my-server-dir/bin/*"
```

Multi packages stage paths under `part_{index}_{Type}/` inside `stage.tar` so parts do not
overwrite each other. Bundle directory names must be unique across the whole package.
Component file basenames must also be unique package-wide for Multi manifests.

You can remove authoring-time mistakes with `part` remove commands (whole part, or a
single component or bundle) while the package is still only on disk—not after catalog
publish in lieu of uninstall; installed copies are always removed as a whole package.

# Legacy single-type workflow

With a legacy skeleton, set the root type once, then use root-level commands:

```bash
atp package type rule
atp package usage "Why this package exists."
atp package component add docs/guide.md
```

Do not mix populated `parts` with a non-Multi root type; validation will reject it.

# Validate and inspect

```bash
atp validate package
atp package summary
```

Validation exit codes distinguish “staging problems” from “missing mandatory fields.” If
validation fails, `atp catalog add package` will refuse to publish.

# Publish to your Station catalog

When validation passes:

```bash
atp catalog add package
```

ATP copies the manifest and gzipped tarball into `user_packages/<name>/` under your
Station (per catalog rules) and updates `atp-catalog.yaml`. You can list what is
available with `atp catalog list`.

# Part kinds (what you are shipping)

Each part `type` selects install behaviour. Common kinds:

| Kind         | Typical payload                          |
|-------------|-------------------------------------------|
| Rule        | Markdown installed as agent rules         |
| Prompt      | Markdown or text in prompts area         |
| Skill       | `SKILL.md`-style skill tree               |
| Hook        | Hook config plus scripts                  |
| Mcp         | Server directory plus exec filter        |
| Command     | Scripts or tools for agent workflows      |
| Experimental| Placeholder for emerging layouts          |

Exact on-disk targets depend on the agent selected in the project Safehouse; ATP maps each
kind to provider-specific paths during install.

## Skills

According to the [Agent Skills Spec](https://agentskills.io/specification)
Skills require YAML front matter and markdown body content.
Editors, such as VS Code, provide support for each but not in the one file.

When using bundle parts for a package, you can add the YAML and the Markdown in separate files.

# Optional checks

- `atp validate catalog-package` — sanity-check an already-published package directory (for
  example under the Station) the same way the installer does before applying files.
