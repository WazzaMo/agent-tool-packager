# Test note: skill-adjacent programs under `scripts/`

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

# Summary

This note records tests added or updated for installing bundle **`program`** rows that are **skill-adjacent** (co-located with the same skill bundle tree) under `<skills-parent>/<name>/scripts/`, omitting them from **`copyProgramAssetsOnly`** / project and user **`bin/`**, plus install CLI exit code **2** on failure paths in **`installPackage`**.

It also records **Feature 3** coverage so **legacy** “skill + separate bundle directory with no skill files there” still installs executables to Safehouse **`...-exec/bin/`**, and a follow-on case where skill-adjacent scripts **must not** appear in those bin trees.

## Unit

| Area | File | What is covered |
|------|------|-----------------|
| Skill planner | `test/provider/skill/skill-standard.test.ts` | `raw_file_copy` to `skills/.../scripts/<basename>` with `applyProgramExecutableMode` on files; duplicate basename between two programs throws; conflict when a skill file already targets the same `scripts/<basename>` throws |
| Copy programs | `test/install/copy-assets.test.ts` | `copyProgramAssetsOnly` skips paths present in `skipProgramPaths` (POSIX path in set) while still copying other programs |

## Integration

| Area | File | What is covered |
|------|------|-----------------|
| Cursor skill install | `test/integration/cursor-agent-provider-skill-install.test.ts` | Bundle-only layout (`mybundle/` with `skill.yaml`, `skill.md`, `bin/helper.sh` and `--exec-filter`) installs `helper.sh` under `.cursor/skills/<skill-name>/scripts/`, `SKILL.md` references `scripts/helper.sh`, and `~/.local/bin/helper.sh` is absent |
| Feature 3 install | `test/integration/feature3-package-install-process.test.ts` | **(1)** Root `SKILL.md` + separate bundle `my_tool/bin/run.sh` (no skills under `my_tool/`): `run.sh` still under `.atp_safehouse/exec-pkg-exec/bin/`, `{my_tool}` patched there. **(2)** Bundle-only `sbundle/` with skill partials + `exec-filter`: `helper.sh` under `.cursor/skills/.../scripts/` and **absent** from Safehouse `f3-skill-adjacent-exec/bin` and `~/.local/bin` |
| Install CLI | `test/integration/install.test.ts` | `runAtpExpectExit` for missing agent and missing dependencies expects exit **2** (aligned with `installPackage` / install command) |

## Pass rate

Full suite: **`npm run build`** then **`npm run test:run`** — all tests passing at time of writing (**568** tests). Integration tests exercise **`dist/atp.js`**; rebuild after source changes before expecting green runs.

## Gaps / follow-up

- No dedicated test for **station**-scope skill + program roots (plan called for tracing `promptScope === "station"`); behaviour should match project path because the same planner and skip set run.
- **Gemini / Claude / Codex** skill+program matrix not expanded beyond shared planner coverage; Cursor integration is the primary end-to-end check.
