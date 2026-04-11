# ATP non-goals and deferred layers (step 1)

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

## Purpose

This note records **out-of-scope** and **deferred** behaviour for Agent Tool Packager (ATP) **step 1** catalog install, aligned with the [provider capability matrix](./2026-04-03-plan-provider-capability-matrix.md) and Feature 5. It answers matrix item **9.1**: document non-goals until ATP explicitly scopes additional layers or products.

## Non-goals (not implemented in step 1)

| Area | Rationale |
|------|-----------|
| **Cursor Team / Enterprise-only paths** | Organisation or team policy directories, remote rule sources, and other enterprise surfaces are not modelled. Project-layer `.cursor/` remains the default contract. |
| **Claude Code teams / plugins** | Feature 5 marks **Experimental** and similar as **TBD**; ATP does not install or merge team-scoped plugins beyond what the matrix lists as **Y** / **Partial**. |
| **Cursor Experimental** | Deferred until Cursor documents a stable on-disk format (**Def** in the matrix). |
| **Full bidirectional directory sync** | Op **3** is **materialise** (copy packaged trees into the workspace), not a continuous sync engine or mirror of arbitrary host directories. |
| **Codex / Gemini / non-JSON interpolation** | `interpolation_policy` targets JSON documents; Codex `config.toml` MCP strings are not rewritten in the current pass (see matrix **6.8**). |
| **Aggregate uninstall** | Managed-block / aggregate bullets added during install are not automatically stripped on `planRemove` (noted under **6.2** in the matrix). |

## Deferred layers

| Layer | Status |
|-------|--------|
| **User / global agent home** | Partially supported via paths in Station config; behaviour is **Opt** and policy-driven. Full parity with project-layer providers is not guaranteed in step 1. |
| **Cursor hooks — enterprise / team** | Matrix marks non-project hook locations as **Def**. |
| **Gemini / Claude rule extras** | Optional `settings.json` registration paths are **Opt**; not all combinations are exercised. |

## When this list changes

Update this note and the capability matrix **Still open** section when a deferred item becomes **Req** or **implemented**, so installers and docs stay aligned.
