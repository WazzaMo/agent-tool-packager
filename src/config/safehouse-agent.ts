/**
 * Safehouse agent assignment: install/remove require an explicit `agent` in `.atp_safehouse/atp-config.yaml`.
 */

import type { SafehouseConfig } from "./types.js";

/**
 * User-facing lines when `agent` is unset (null, missing, or blank).
 */
export function formatSafehouseAgentNotAssignedMessage(): string {
  return (
    "No agent is assigned for this project's Safehouse.\n" +
    "Run `atp agent <name>` (for example cursor or claude) before installing or removing packages."
  );
}

/**
 * Thrown when Safehouse `agent` is not set to a non-empty string.
 */
export class SafehouseAgentNotAssignedError extends Error {
  constructor() {
    super(formatSafehouseAgentNotAssignedMessage());
    this.name = "SafehouseAgentNotAssignedError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * @param config - Parsed `.atp_safehouse/atp-config.yaml`, or `null` when missing.
 * @returns Trimmed agent id, or `null` when unset or blank.
 */
export function assignedSafehouseAgentName(
  config: SafehouseConfig | null
): string | null {
  if (!config || typeof config.agent !== "string") {
    return null;
  }
  const t = config.agent.trim();
  return t === "" ? null : t;
}
