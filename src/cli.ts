#!/usr/bin/env node
/**
 * Agent HQ (AHQ) CLI - entry point
 * CLI for agentic dev workflows: installs prompts, MCP servers, skills.
 */

import { Command } from "commander";
import { registerAgentCommands } from "./commands/agent.js";
import { registerCatalogCommands } from "./commands/catalog.js";
import { registerInstallCommand } from "./commands/install.js";
import { registerRemoveCommands } from "./commands/remove.js";
import { registerSafehouseCommands } from "./commands/safehouse.js";
import { registerStationCommands } from "./commands/station.js";

const program = new Command();

program
  .name("ahq")
  .description("CLI for agentic software development workflows")
  .version("0.1.0");

registerStationCommands(program);
registerSafehouseCommands(program);
registerRemoveCommands(program);
registerAgentCommands(program);
registerInstallCommand(program);
registerCatalogCommands(program);

program.parse();
