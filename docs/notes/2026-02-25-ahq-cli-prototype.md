# AHQ CLI prototype plan

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.
Created by Warwick Molloy Feb 2026.

## Goal

Deliver a minimal Go CLI that reads user config from `~/.ahq/config.yaml` and can
write prompt markdown files into the project directory where `ahq` is run.

## Config location and shape

- Path: `~/.ahq/config.yaml` (user's home directory).
- Config must define where prompt assets live and which prompts to install.
- Prototype shape: a list of prompt source paths and an optional destination
  subdirectory in the project (e.g. `prompts/`).

## Behaviour

1. On run, resolve and read `~/.ahq/config.yaml`.
2. If config is missing, exit with a clear message (no crash).
3. Use config to determine source(s) of prompt markdown (paths or names).
4. Write (copy) those prompt markdown files into the current working directory,
   under a configured or default subdir (e.g. `prompts/`), so the project
   "has" the prompts where the user ran `ahq`.

## Implementation layout (src/)

Small files per clean-code convention; single responsibility.

| File       | Responsibility                                  |
|------------|--------------------------------------------------|
| main.go    | Entry, CLI dispatch, orchestration               |
| config.go  | Resolve ~/.ahq path, read and parse config.yaml  |
| prompts.go | Copy/write prompt markdown into project (cwd)    |
| cli.go     | Subcommands (e.g. install) and flag handling     |

## Config schema (prototype)

```yaml
# ~/.ahq/config.yaml
prompt_sources:          # paths to dirs or files (home-relative or absolute)
  - ~/.ahq/prompts
  - /path/to/prompt-assets
project_prompts_dir: prompts   # subdir in cwd where markdown is written (default)
```

## Implementation detail

Prompt sources that are directories are copied one level only (no recursion).
List a subdirectory in `prompt_sources` if you need its `.md` files.

## Out of scope for prototype

- MCP server installation.
- Versioning or overwrite rules (prototype can overwrite).
- Network or fetching prompts from URLs.
- Validation of markdown content.

## Success criteria

- `ahq install` (or default command) reads `~/.ahq/config.yaml`.
- Prompt markdown from configured sources appears under the project dir.
- Clear error when config is missing or invalid.
- Code stays in small, focused files under src/.
