# Agent HQ

A utility for CLI agentic software development workflows.

Cursor summarised this project as:

> **Agent HQ is an early-stage project to standardize how
  you add prompts, MCP
  servers, and skills to agentic CLI workflows, with documentation and conventions in place**

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.
Created by Warwick Molloy Feb 2026.

# Why AHQ?

Ever wanted to install your standard prompt markdown files in a project
in a convenient way?

Ever wanted to install MCP servers, skills etc in a convenient manner?

Me too...

## Build, test and run

**Prerequisites:** Go 1.21 or later.

The CLI lives in the `src/` directory. From the repository root:

```bash
# Build the binary (output: src/ahq)
cd src && go build -o ahq .

# Run tests
cd src && go test ./...

# Run the CLI
./src/ahq help
./src/ahq install    # default: install prompt markdown into the current project
```

To use the binary from anywhere, copy it to a directory on your `PATH`, for example:

```bash
cp src/ahq ~/bin/ahq
```

Config is read from `~/.ahq/config.yaml`. Package catalogs: global (bundled),
user local at `~/.ahq/catalog.yaml`, and optional project local at `./.ahq-local/catalog.yaml`
(project overrides user overrides global). Full details: [docs/configuration.md](docs/configuration.md).

### Testing the catalog

For **install from config** (all prompt sources), create `~/.ahq/config.yaml` with
`prompt_sources` and optional `project_prompts_dir`. Then:

```bash
./src/ahq install
```

To try **catalog** (list, add local packages, install by name). Catalog entries
point at paths or URLs elsewhere; `ahq install <name>` copies those assets
into the project.

```bash
# List packages (global + user + project; use --local-only, --global-only, or --project-only to filter)
./src/ahq list

# Add a local package (path to a directory containing .md files)
./src/ahq catalog add my-prompt /path/to/your/prompt-dir

# List again to see your package with source "local"
./src/ahq list

# Install that package into the current project (creates e.g. prompts/ and copies .md)
./src/ahq install my-prompt

# Show details for a package
./src/ahq catalog show my-prompt

# Remove from your local catalog (only local packages can be removed)
./src/ahq catalog remove my-prompt
```

`ahq install` with no arguments still uses config and copies from all
`prompt_sources`. `ahq install <name>` resolves `<name>` from the merged
catalog (project overrides user overrides global when names match) and copies from that
package’s location. To add packages for the current repo only, create
`./.ahq-local/catalog.yaml` with the same `packages:` list shape as the user catalog.

## Other benefits

We are all citizen researchers when it comes to Agentic software dev because
**everyone** is learning how this should be done.

### Prompts

If you have a genius prompt you want to make standard (selfishly to make it easy)
and sharing is nice, too, then please raise a GH issue and I'll add it and attribute
your contribution.

