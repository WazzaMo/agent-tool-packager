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

const greetingMessage = `
    AA      GGGGG    EEEEEEE  NN    NN  TTTTTTTT  HH    HH     QQQQ
  AAAAAA   GG    GG  EE       NNN   NN  T  TT  T  HH    HH   QQQQQQQQ
 AA    AA  GG        EE       NNNN  NN     TT     HH    HH  QQ      QQ
 AA    AA  GG        EEEEE    NNNN  NN     TT     HH    HH  QQ      QQ
 AA    AA  GG  GGGG  EEEEE    NN NN NN     TT     HHHHHHHH  QQ      QQ
 AAAAAAAA  GG  G GG  EE       NN  NNNN     TT     HHHHHHHH  QQ QQ   QQ
 AAAAAAAA  GG    GG  EE       NN  NNNN     TT     HH    HH  QQ  QQ  QQ
 AA    AA   GG  GG   EE       NN    NN     TT     HH    HH  QQ   QQ QQ
 AA    AA    GGGG    EEEEEEE  NN    NN     TT     HH    HH  QQ    QQQQ
 AA    AA ======================================  HH    HH   QQQQQQQQ
 AA    AA    By Warwick Molloy Melbourne, Aus     HH    HH     QQQQ QQ

CLI for agentic software development workflows`;


const program = new Command();

program
  .name("ahq")
  .description(greetingMessage)
  .version("0.1.0");

registerStationCommands(program);
registerSafehouseCommands(program);
registerRemoveCommands(program);
registerAgentCommands(program);
registerInstallCommand(program);
registerCatalogCommands(program);

program.parse();

