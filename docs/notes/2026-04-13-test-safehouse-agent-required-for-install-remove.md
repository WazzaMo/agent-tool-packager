# Test note: Safehouse agent required for install and remove

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

## Kind

test

## Purpose

This note documents automated tests for **requiring an explicit Safehouse `agent`**
(`.atp_safehouse/atp-config.yaml`) before **catalog install** and **`remove safehouse`**
paths that touch the agent tree. ATP must not assume **cursor** when `agent` is `null`,
missing, or blank.

## Behaviour under test

### `assignedSafehouseAgentName`

Returns a trimmed non-empty string, or **`null`** for missing config, **`agent: null`**, empty string, or whitespace-only values.

### `SafehouseAgentNotAssignedError`

Message matches **`formatSafehouseAgentNotAssignedMessage()`**; **`name`** is set for stable identification.

### `buildProviderInstallContext` with null agent

When mocked Safehouse has **`agent: null`**, throws **`SafehouseAgentNotAssignedError`** (provider install context must align with an assigned agent).

### CLI install without `atp agent`

After **`safehouse init`** without **`atp agent <name>`**, **`atp install`** exits **non-zero** and stderr mentions **no agent assigned** and **`atp agent`**.

## Tests

| File | What it covers |
|------|----------------|
| `test/config/safehouse-agent.test.ts` | **`assignedSafehouseAgentName`**: `null` config; `agent: null`; blank / whitespace; trimmed **`cursor`**. **`SafehouseAgentNotAssignedError`**: message and **`name`**. |
| `test/install/provider-install-context.test.ts` | **`throws when safehouse agent is null`**: mocked **`loadSafehouseConfig`** returns **`agent: null`**; **`buildProviderInstallContext`** throws **`SafehouseAgentNotAssignedError`**. |
| `test/integration/install.test.ts` | **`atp install fails when Safehouse agent is not assigned`**: fresh project with **`.git`**, **`safehouse init`**, no **`atp agent`**; **`runAtpExpectExit`** on **`install test-package`**, exit **1**, stdout+stderr match **no agent** / **`atp agent`**. |

## Commands used

- Targeted: **`npm run test:run -- test/config/safehouse-agent.test.ts`**

- Targeted: **`npm run test:run -- test/install/provider-install-context.test.ts`**

- Targeted: **`npm run test:run -- test/integration/install.test.ts`**

- Full gate: **`npm run ci:test`** (or **`npm run build`** then **`npm run test:run`**),
  because integration tests invoke **`dist/atp.js`**.

## Related

- Implementation: **`src/config/safehouse-agent.ts`**, **`src/install/install.ts`**,
  **`src/install/catalog-install-execute.ts`**, **`src/install/catalog-install-context.ts`**,
  **`src/remove/remove-safehouse.ts`**, **`src/remove/safehouse-remove-agent-assets.ts`**
