/**
 * Agent subcommands: atp agent <name>, atp agent handover to <name>.
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
import { resolveAgentProjectPath } from "../config/agent-path.js";
import {
  findProjectBase,
  getSafehousePath,
} from "../config/paths.js";

const SAFEHOUSE_REQUIRED_MSG =
  "No Safehouse found. Run `atp safehouse init` first from your project directory.";

function ensureSafehouse(cwd: string): string {
  const projectBase = findProjectBase(cwd);
  if (!projectBase || !safehouseExists(projectBase)) {
    console.error(SAFEHOUSE_REQUIRED_MSG);
    process.exit(1);
  }
  return projectBase;
}

function ensureAgentDir(projectPath: string, projectBase: string): void {
  const fullPath = path.join(projectBase, projectPath);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
}

export function registerAgentCommands(program: Command): void {
  const agent = program
    .command("agent")
    .description("Assign or handover the active agent for this project");

  // atp agent handover to <name> - must be registered before the default
  agent
    .command("handover")
    .argument("to", "'to' (literal)")
    .argument("<name>", "Agent to hand over to")
    .description("Hand over from current agent to a new agent")
    .action((_to: string, name: string) => {
      const cwd = process.cwd();
      const projectBase = ensureSafehouse(cwd);

      const config = loadSafehouseConfig(projectBase);
      if (!config) {
        console.error(SAFEHOUSE_REQUIRED_MSG);
        process.exit(1);
      }

      const stationConfig = loadStationConfig();
      const agentPath = resolveAgentProjectPath(name, stationConfig);

      ensureAgentDir(agentPath, projectBase);

      const updated: typeof config = {
        ...config,
        agent: name,
        agent_path: agentPath,
      };
      writeSafehouseConfig(updated, projectBase);

      // TODO Phase 5: skill re-install/patching when switching agents
      console.log(`Handed over to ${name} (${agentPath})`);
    });

  // atp agent <name> - assign agent to this project
  agent
    .argument("<name>", "Agent to assign (e.g. cursor, claude)")
    .description("Assign agent to this project (run from project with .atp_safehouse)")
    .action((name: string) => {
      const cwd = process.cwd();
      const projectBase = ensureSafehouse(cwd);

      const config = loadSafehouseConfig(projectBase);
      if (!config) {
        console.error(SAFEHOUSE_REQUIRED_MSG);
        process.exit(1);
      }

      if (config.agent === name) {
        console.log(`Q Branch already knows ${name} was assigned to this project`);
        return;
      }

      const stationConfig = loadStationConfig();
      const agentPath = resolveAgentProjectPath(name, stationConfig);

      ensureAgentDir(agentPath, projectBase);

      const updated: typeof config = {
        ...config,
        agent: name,
        agent_path: agentPath,
      };
      writeSafehouseConfig(updated, projectBase);

      console.log(`Assigned ${name} to this project (${agentPath})`);
    });
}
