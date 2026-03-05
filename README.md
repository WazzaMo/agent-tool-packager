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


```
======================================================================
    AA      GGGGG    EEEEEEE  NN    NN  TTTTTTTT  HH    HH     QQQQ
  AAAAAA   GG    GG  EE       NNN   NN  T  TT  T  HH    HH   QQQQQQQQ
 AA    AA  GG        EE       NNNN  NN     TT     HH    HH  QQ      QQ
 AA    AA  GG        EEEEE    NNNN  NN     TT     HH    HH  QQ      QQ
 AA    AA  GG GGGGG  EEEEE    NN NN NN     TT     HHHHHHHH  QQ      QQ
 AAAAAAAA  GG GGGGG  EE       NN  NNNN     TT     HHHHHHHH  QQ QQ   QQ
 AAAAAAAA  GG    GG  EE       NN  NNNN     TT     HH    HH  QQ  QQ  QQ
 AA    AA   GGGGGG   EE       NN    NN     TT     HH    HH  QQ   QQ QQ
 AA    AA    GGGG    EEEEEEE  NN    NN     TT     HH    HH  QQ    QQQQ
 AA    AA ======================================  HH    HH   QQQQQQQQ
 AA    AA    By Warwick Molloy Melb, Aus          HH    HH     QQQQ QQ

```

## Build, test and run

### Prerequisites

I use Fast Node Manager and the `.node-version` file will set you up
with a node that works. Assuming you have FNM installed in your user
home directory.

[Fast Node Manager Github repo](https://github.com/Schniz/fnm)

```bash
fnm use
```

This command will refer to the `.node-version` file and prompt you
to install that version if your system doesn't have it. Say "yes"
and you're good to go.


Node.js 20+

```bash
npm install
npm run build
```

Run the CLI:
```bash
# Direct execution (after build)
npx ahq --version
npx ahq station init
npx ahq safehouse init
npx ahq agent cursor
npx ahq catalog list
npx ahq install <package> [--project|--user] [--dependencies]
npx ahq station list
npx ahq safehouse list
npx ahq remove station <pkg> [--exfiltrate]
npx ahq remove safehouse <pkg>
```

Development (no build step):
```bash
npm run dev -- station init
```

Override Station location:
```bash
STATION_PATH="/path/to/station" npx ahq station init
```

## Configuration

- **Station:** `~/.ahq_station` (or `STATION_PATH`) — config, catalog, manifests
- **Safehouse:** `./.ahq_safehouse` — per-project installs
- **Catalog:** global (bundled) + user (`~/.ahq_station/ahq_catalog.yaml`) + project (`./.ahq-local/catalog.yaml`). Precedence: project > user > global

See [docs/configuration.md](docs/configuration.md) for full configuration.

### Testing the catalog


## Other benefits

We are all citizen researchers when it comes to Agentic software dev because
**everyone** is learning how this should be done.

### Prompts

If you have a genius prompt you want to make standard (selfishly to make it easy)
and sharing is nice, too, then please raise a GH issue and I'll add it and attribute
your contribution.

