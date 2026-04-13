# Coding note: require Safehouse agent before install and remove

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

## Kind

coding

## Purpose

Catalog **install** and **`remove safehouse`** previously treated a **null** or unset
Safehouse **`agent`** (`.atp_safehouse/atp-config.yaml`) as **cursor** via **`?? "cursor"`**.
That hid misconfiguration after **`atp safehouse init`**.

This change **requires** an explicit non-blank **`agent`** before those flows run. Users
must run **`atp agent <name>`** first.

Test inventory:
[2026-04-13-test-safehouse-agent-required-for-install-remove](./2026-04-13-test-safehouse-agent-required-for-install-remove.md).

## New module

| Item | Module | Role |
|------|--------|------|
| **`assignedSafehouseAgentName`** | `src/config/safehouse-agent.ts` | Returns trimmed agent string, or **`null`** when config is missing, **`agent`** is **`null`**, not a string, empty, or whitespace-only. |
| **`SafehouseAgentNotAssignedError`** | same | **`Error`** subclass; message from **`formatSafehouseAgentNotAssignedMessage()`**. |
| **`formatSafehouseAgentNotAssignedMessage`** | same | Stable CLI copy for **`remove`** (and matches thrown **`message`** for install). |

## Install path

| Module | Change |
|--------|--------|
| `src/install/catalog-install-execute.ts` | **`getAgentBasePath`**: uses **`assignedSafehouseAgentName`**; throws **`SafehouseAgentNotAssignedError`** when unset. |
| `src/install/catalog-install-context.ts` | **`buildProviderInstallContext`**: same check so provider routing never assumes **cursor** when Safehouse has no agent. |
| `src/install/install.ts` | Wraps **`getAgentBasePath`** in **`try`/`catch`**: on **`SafehouseAgentNotAssignedError`**, **`console.error`** the message and **`process.exit(1)`** (consistent with other install guardrails). |

Recursive **`installPackage`** (dependencies) reuses the same **`projectBase`**, so the
check applies once per top-level install invocation.

## Remove path

| Module | Change |
|--------|--------|
| `src/remove/remove-safehouse.ts` | After manifest lookup, **`assignedSafehouseAgentName`**: if **`null`**, **`console.error`** formatted message and **`process.exit(1)`** before journal rollback or **`removeAgentCopies`**. |
| `src/remove/safehouse-remove-agent-assets.ts` | **`removeAgentCopies`**: throws **`SafehouseAgentNotAssignedError`** when agent unset (defence in depth; primary UX is **`remove-safehouse`** exit above). |

## Related

- [Test note](./2026-04-13-test-safehouse-agent-required-for-install-remove.md)
- [Package definition and installation](../features/1-package-definition-and-installation.md) (Safehouse **`atp-config.yaml`** shape)
