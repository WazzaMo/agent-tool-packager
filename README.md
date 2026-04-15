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


## See the example skill pack

THIS IS THE FASTEST WAY TO LEARN HOW TO MAKE USE OF THIS...

Take a look at [./example-skills-pack](./example-skills-pack/)
and the scripted packaging commands in [pack.sh](./example-skills-pack/pack.sh)
which uses the two directories to create two different skills, treating each directory
as a bundle. NOTE: the two different skill.(yaml|md) file pairs are assembled into
a single SKILL.md file upon installation.

If you run `pack.sh` from the `./example-skills-pack/` directory, it will create and add the package
to your user catalog in the ATP Station.

To try this out.

1. Install ATP see above for how to do that.
2. Create the Station `atp station init`
3. Go to the example skills pack directory and run `pack.sh`
    > `atp catalog list` should list the package.
4. Go to another directory where you might want to try this package out with your cursor, claude, codex or gemini agent.
5. In that directory make sure you have a local git repo or create one if you do not.
    > run `ls -a` and if you see a `.git` directory you have one; if not, then run `git init` to create one.
6. Create a Safehouse in this project directory `atp safehouse init`
7. Configure the safehouse for your agent, let's assume it's Gemini CLI
    > `atp agent gemini`
8. Now install the package: `atp install "Example skills pack"`

You will it worked when you check the `.gemini` directory for content and find a `skills/` directory.
When you run Gemini and ask it to write a markdown document, it will ask permission to use the skill.

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
