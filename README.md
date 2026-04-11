# WazzaMo Agent Tool Packager (ATP)

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

CLI version **0.2.3** (see `package.json`).

```
    AA      GGGGG    EEEEEEE  NN    NN  TTTTTTTT      TTTTTTTT     OOOO        OOOO     LL         SSSS
  AAAAAA   GG    GG  EE       NNN   NN  T  TT  T      T  TT  T   OOOOOOOO    OOOOOOOO   LL        SS  SS
 AA    AA  GG        EE       NNNN  NN     TT            TT     OO      OO  OO      OO  LL       SS    SS
 AA    AA  GG        EEEEE    NNNN  NN     TT            TT     OO      OO  OO      OO  LL       SS
 AA    AA  GG  GGGG  EEEEE    NN NN NN     TT            TT     OO      OO  OO      OO  LL        SSS
 AAAAAAAA  GG  G GG  EE       NN  NNNN     TT     ##     TT     OO      OO  OO      OO  LL         SSS
 AAAAAAAA  GG    GG  EE       NN  NNNN     TT     ##     TT     OO      OO  OO      OO  LL           SSS
 AA    AA   GG  GG   EE       NN    NN     TT            TT     OO      OO  OO      OO  LL             SS
 AA    AA    GGGG    EEEEEEE  NN    NN     TT            TT     OO      OO  OO      OO  LL       SS    SS
 AA    AA ==========================================     TT      OOOOOOOO    OOOOOOOO   LL        SS  SS
 AA    AA    By Warwick Molloy Melbourne, Australia      TT        OOOO        OOOO     LLLLLLLL   SSSS

```

GitHub: [https://github.com/WazzaMo/agent-tool-packager](https://github.com/WazzaMo/agent-tool-packager)


# What ATP is

Agent Tool Packager (`atp`) standardises how you build small **packages** of agent-facing
materials, such as rules, prompts, skills, hooks, MCP servers, commands, and related payloads.
Once packaged, you can install them into **projects**.

You define packages once, publish them to your local **Station** (catalog + config), then install into each repo’s
**Safehouse** (per-project manifest and paths) for the **agent** you use (Cursor, Claude
Code, Gemini CLI, Codex CLI, and others supported in Station `agent-paths`).

In short: one workflow to author, validate, catalogue, and install agent tools without
repeating vendor-specific copy steps by hand.

# Install the CLI

```bash
npm install -g @wazzamo-agent-tools/packager
```

```bash
atp --version
```

Use a current **Node.js** (see `.node-version`; Node 24+ is typical). Primary use is on
UNIX-like systems (Linux, macOS, BSD).

# How to use ATP (overview)

The flow is always: **Station** (once per machine or `STATION_PATH`) → **author** a
package → **publish** to the catalog → **Safehouse** + **agent** in each project →
**install** packages.

| Step | Topic of manual                          | Manual                                                                                           |
|------|------------------------------------------|--------------------------------------------------------------------------------------------------|
|   1  | Understand Station, Safehouse, catalog   | [manuals/1-Terminology.md](manuals/1-Terminology.md)                                             |
|   2  | Create your Station                      | [manuals/2-Setting-up-for-first-ever-use.md](manuals/2-Setting-up-for-first-ever-use.md)         |
|   3  | Create package, validate, add to catalog | [manuals/3-Authoring-Packages.md](manuals/3-Authoring-Packages.md)                               |
|   4  | Setup Safehouse, set agent               | [manuals/4-Safehouse-and-agent-configuration.md](manuals/4-Safehouse-and-agent-configuration.md) |
|   5  | Managing packages in projects            | [manuals/5-Install-list-and-remove-packages.md](manuals/5-Install-list-and-remove-packages.md)   |

End-to-end narrative index (same pages, with short blurbs):

[manuals/agent-tools-packager.md](manuals/agent-tools-packager.md)

## Minimal command sequence

```bash
atp station init
cd /path/to/your/package-dir
atp create package skeleton
# … edit metadata and parts (see authoring manual) …
atp validate package
atp catalog add package

cd /path/to/your/git-project
atp safehouse init
atp agent cursor
atp install your-package-name
```

Install-time validation also runs against the catalog copy; you can mirror it with
`atp validate catalog-package` on the Station package directory.

## Flags you will use often

- `--project` / `--station` — where prompt-like files land.

- `--user-bin` / `--project-bin` — where bundle executables land.

- `--dependencies` — install declared dependencies in one go.

- `--force-config` / `--skip-config` — resolve MCP and hooks JSON merge conflicts (mutually
  exclusive).

Details and examples: [manuals/5-Install-list-and-remove-packages.md](manuals/5-Install-list-and-remove-packages.md).

# Further documentation

- [docs/configuration.md](docs/configuration.md) — Station layout, `atp-config.yaml`,
  `atp-catalog.yaml`, Safehouse manifest, merged install targets.

- [docs/doc-guide.md](docs/doc-guide.md) — Markdown conventions for docs in this repo.

- [AGENTS.md](AGENTS.md) — condensed guide for automation and AI agents working in the
  repository.

# Contributing and development

## Proposing changes

Follow the fork and pull request process, coding standards, and review expectations in
[CONTRIBUTING.md](CONTRIBUTING.md). That document also points here for basic environment
setup.

## Developer setup and deep dive

[DEVELOPER-README.md](DEVELOPER-README.md) is the long-form companion to this README: why
ATP exists, extended quickstart (including Multi-part authoring), MCP and hooks merge
notes, `npm run build` / `test:run` / `dev`, `install-home` and `uninstall-home`, and
`STATION_PATH` examples. Use it when you are modifying the tool or need copy-pastable
workflows beyond the manuals.

Quick clone workflow:

```bash
git clone https://github.com/WazzaMo/agent-tool-packager.git
cd agent-tool-packager
fnm use   # or another Node version manager aligned with .node-version
npm install
npm run build
npm run test:run
```

Before opening a PR: `npm run lint`, `npm run build`, and `npm run test:run` (as described
in [CONTRIBUTING.md](CONTRIBUTING.md)).
