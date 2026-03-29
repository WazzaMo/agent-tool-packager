/**
 * Agent subcommands: `atp agent <name>`, `atp agent handover to <name>`.
 */

import fs from "node:fs";
import path from "node:path";
import type { Command } from "commander";

import {
  loadSafehouseConfig,
  loadStationConfig,
  safehouseExists,
  writeSafehouseConfig,
} from "../config/load.js";

import {
  isAgentInStationConfig,
  resolveAgentProjectPath,
} from "../config/agent-path.js";

import { findProjectBase } from "../config/paths.js";

import { reinstallSafehousePackages } from "../install/reinstall.js";

import type { SafehouseConfig } from "../config/types.js";

import type { StationConfig } from "../config/station-config.js";

const SAFEHOUSE_REQUIRED_MSG =
  "No Safehouse found. Run `atp safehouse init` first from your project directory.";

const agentNotConfiguredMessage = (name: string): string =>
  `Agent '${name}' is not configured in the Station. Add it to agent-paths in atp-config.yaml.`;

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
      const stationConfig = loadStationConfig();
      const agentPath = resolveValidatedAgentProjectPath(name, stationConfig);

      persistAgentSelection(projectBase, config, name, agentPath);
      await reinstallSafehousePackages(projectBase);

      console.log(`Handed over to ${name} (${agentPath})`);
    });

  agent
    .argument("<name>", "Agent to assign (e.g. cursor, claude)")
    .description("Assign agent to this project (run from project with .atp_safehouse)")
    .action((name: string) => {
      const cwd = process.cwd();
      const projectBase = ensureSafehouse(cwd);
      const config = loadSafehouseConfigOrExit(projectBase);

      if (config.agent === name) {
        console.log(`Q Branch already knows ${name} was assigned to this project`);
        return;
      }

      const stationConfig = loadStationConfig();
      const agentPath = resolveValidatedAgentProjectPath(name, stationConfig);

      persistAgentSelection(projectBase, config, name, agentPath);

      console.log(`Assigned ${name} to this project (${agentPath})`);
    });
}
