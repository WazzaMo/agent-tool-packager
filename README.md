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

Config is read from `~/.ahq/config.yaml`. See `docs/notes` for the config schema.

## Other benefits

We are all citizen researchers when it comes to Agentic software dev because
**everyone** is learning how this should be done.

### Prompts

If you have a genius prompt you want to make standard (selfishly to make it easy)
and sharing is nice, too, then please raise a GH issue and I'll add it and attribute
your contribution.

