/**
 * Provider install roots (internal DTO). See docs/notes/2026-04-03-plan-provider-internal-dtos.md.
 */

/** Agents that may be assigned in Safehouse; each has an {@link AgentProvider} for catalog install (Codex skills use `.agents/skills/` under the project root). */
export const PROVIDER_AGENT_IDS = ["cursor", "claude", "gemini", "codex"] as const;

/** Canonical agent keys (Feature 5 / Station `agent-paths`). */
export type AgentId = (typeof PROVIDER_AGENT_IDS)[number];

/** Config merge / file-op scope; v1 uses project layer for on-disk copy targets. */
export type InstallLayer = "project" | "user" | "global";

/**
 * Resolved roots for path interpretation (absolute paths in practice).
 * `stagingDir` is the extracted package directory for this install transaction.
 */
export interface InstallContext {
  agent: AgentId;
  layer: InstallLayer;
  projectRoot: string;
  /**
   * Root for agent-relative provider targets (e.g. `.cursor/` under the project, or user agent home).
   * Aligns with `layer` when user-layer installs are fully implemented.
   */
  layerRoot: string;
  stagingDir: string;
}

/**
 * True when `raw` names a supported provider agent (case-insensitive).
 *
 * @param raw - CLI or Safehouse `agent` string.
 */
export function isProviderAgentId(raw: string): boolean {
  const k = raw.trim().toLowerCase();
  return PROVIDER_AGENT_IDS.some((id) => id === k);
}

/**
 * Map Safehouse / CLI agent name to {@link AgentId}.
 *
 * @param raw - `atp-config.yaml` `agent` field or default.
 * @returns Canonical id.
 * @throws Error when the agent is not a supported {@link AgentId} (no provider exists).
 */
export function normaliseAgentId(raw: string): AgentId {
  const k = raw.trim().toLowerCase();
  const hit = PROVIDER_AGENT_IDS.find((id) => id === k);
  if (hit) {
    return hit;
  }
  const label = raw.trim() === "" ? "(empty)" : JSON.stringify(raw);
  const list = PROVIDER_AGENT_IDS.join(", ");
  throw new Error(
    `Unsupported agent ${label}. Supported agents: ${list}. Assign a supported agent with \`atp agent <name>\` or add future support in AgentProvider.`
  );
}
