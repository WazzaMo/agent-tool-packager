/**
 * Agent subcommands: `atp agent <name>`, `atp agent handover to <name>`.
 */

import fs from "node:fs";
import path from "node:path";


import {
  isAgentInStationConfig,
  resolveAgentProjectPath,
} from "../config/agent-path.js";
import { isProviderAgentId, normaliseAgentId, type AgentId } from "../file-ops/install-context.js";
import {
  loadSafehouseConfig,
  loadStationConfig,
  safehouseExists,
  writeSafehouseConfig,
} from "../config/load.js";
import { findProjectBase } from "../config/paths.js";
import { reinstallSafehousePackages } from "../install/reinstall.js";

import type { StationConfig } from "../config/station-config.js";
import type { SafehouseConfig } from "../config/types.js";
import type { Command } from "commander";

const SAFEHOUSE_REQUIRED_MSG =
  "No Safehouse found. Run `atp safehouse init` first from your project directory.";

const agentNotConfiguredMessage = (name: string): string =>
  `Agent '${name}' is not configured in the Station. Add it to agent-paths in atp-config.yaml.`;

/**
 * Require a provider-supported agent id; exit with message when unsupported.
 *
 * @param raw - User-supplied agent name.
 * @returns Canonical {@link AgentId}.
 */
function normaliseAgentIdForCli(raw: string): AgentId {
  try {
    return normaliseAgentId(raw);
  } catch (err) {
    console.error(String(err));
    process.exit(1);
  }
}

/**
 * Canonical id for Safehouse `agent` when it is provider-supported, else `null`.
 *
 * @param raw - Stored agent field (may be legacy / unsupported).
 */
function canonicalProviderAgentOrNull(raw: string | null): AgentId | null {
  if (raw == null || raw.trim() === "") {
    return null;
  }
  if (!isProviderAgentId(raw)) {
    return null;
  }
  return normaliseAgentId(raw);
}

/**
 * Resolve project base and require an initialised Safehouse.
 *
 * @param cwd - Current working directory.
 * @returns Project root with `.atp_safehouse`.
 */
function ensureSafehouse(cwd: string): string {
  const projectBase = findProjectBase(cwd);
  if (!projectBase || !safehouseExists(projectBase)) {
    console.error(SAFEHOUSE_REQUIRED_MSG);
    process.exit(1);
  }
  return projectBase;
}

/**
 * Load Safehouse config or exit when missing/corrupt.
 *
 * @param projectBase - Project root.
 * @returns Parsed config.
 */
function loadSafehouseConfigOrExit(projectBase: string): SafehouseConfig {
  const config = loadSafehouseConfig(projectBase);
  if (!config) {
    console.error(SAFEHOUSE_REQUIRED_MSG);
    process.exit(1);
  }
  return config;
}

/**
 * Ensure the agent project directory exists (e.g. `.cursor/`).
 *
 * @param projectPath - Relative agent root under the project.
 * @param projectBase - Project root directory.
 */
function ensureAgentDir(projectPath: string, projectBase: string): void {
  const fullPath = path.join(projectBase, projectPath);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
}

/**
 * Require that `name` exists in Station `agent-paths` and return its project path.
 *
 * @param name - Agent key.
 * @param stationConfig - Station configuration (may be null).
 * @returns Relative project path for the agent.
 */
function resolveValidatedAgentProjectPath(
  name: string,
  stationConfig: StationConfig | null
): string {
  if (!isAgentInStationConfig(name, stationConfig)) {
    console.error(agentNotConfiguredMessage(name));
    process.exit(1);
  }
  return resolveAgentProjectPath(name, stationConfig);
}

/**
 * Persist agent choice and create agent dirs as needed.
 *
 * @param projectBase - Project root.
 * @param config - Existing Safehouse config to extend.
 * @param name - Agent name.
 * @param agentPath - Relative agent directory.
 */
function persistAgentSelection(
  projectBase: string,
  config: SafehouseConfig,
  name: string,
  agentPath: string
): void {
  ensureAgentDir(agentPath, projectBase);
  const updated: SafehouseConfig = {
    ...config,
    agent: name,
    agent_path: agentPath,
  };
  writeSafehouseConfig(updated, projectBase);
}

/**
 * Register agent assignment and handover commands.
 *
 * @param program - Root Commander program.
 */
export function registerAgentCommands(program: Command): void {
  const agent = program
    .command("agent")
    .description("Assign or handover the active agent for this project");

  agent
    .command("handover")
    .argument("to", "'to' (literal)")
    .argument("<name>", "Agent to hand over to")
    .description("Hand over from current agent to a new agent")
    .action(async (_to: string, name: string) => {
      const cwd = process.cwd();
      const projectBase = ensureSafehouse(cwd);
      const config = loadSafehouseConfigOrExit(projectBase);
      const canonical = normaliseAgentIdForCli(name);
      const stationConfig = loadStationConfig();
      const agentPath = resolveValidatedAgentProjectPath(canonical, stationConfig);

      persistAgentSelection(projectBase, config, canonical, agentPath);
      await reinstallSafehousePackages(projectBase);

      console.log(`Handed over to ${canonical} (${agentPath})`);
    });

  agent
    .argument("<name>", "Agent to assign (cursor, claude, gemini, codex)")
    .description("Assign agent to this project (run from project with .atp_safehouse)")
    .action((name: string) => {
      const cwd = process.cwd();
      const projectBase = ensureSafehouse(cwd);
      const config = loadSafehouseConfigOrExit(projectBase);
      const canonical = normaliseAgentIdForCli(name);
      const current = canonicalProviderAgentOrNull(config.agent);

      if (current === canonical) {
        console.log(`Q Branch already knows ${canonical} was assigned to this project`);
        return;
      }

      const stationConfig = loadStationConfig();
      const agentPath = resolveValidatedAgentProjectPath(canonical, stationConfig);

      persistAgentSelection(projectBase, config, canonical, agentPath);

      console.log(`Assigned ${canonical} to this project (${agentPath})`);
    });
}
