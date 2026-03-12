#!/usr/bin/env node
/**
 * Agent Tools Packager(ATP) CLI - entry point
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
    AA      GGGGG    EEEEEEE  NN    NN  TTTTTTTT      TTTTTTTT     OOOO        OOOO     LL         SSSS
  AAAAAA   GG    GG  EE       NNN   NN  T  TT  T      T  TT  T   OOOOOOOO    OOOOOOOO   LL        SS  SS
 AA    AA  GG        EE       NNNN  NN     TT            TT     OO      OO  OO      OO  LL       SS    SS
 AA    AA  GG        EEEEE    NNNN  NN     TT            TT     OO      OO  OO      OO  LL       SS
 AA    AA  GG  GGGG  EEEEE    NN NN NN     TT            TT     OO      OO  OO      OO  LL        SSS
 AAAAAAAA  GG  G GG  EE       NN  NNNN     TT     ##     TT     OO      OO  OO      OO  LL         SSS
 AAAAAAAA  GG    GG  EE       NN  NNNN     TT     ##     TT     OO      OO  OO      OO  LL           SSS
 AA    AA   GG  GG   EE       NN    NN     TT            TT     OO      OO  OO      OO  LL             SS
 AA    AA    GGGG    EEEEEEE  NN    NN     TT            TT     OO      OO  OO      OO  LL       SS    SS
 AA    AA ==========================================     TT      OOOOOOOO    OOOOOOOO   LL        SS  SS
 AA    AA    By Warwick Molloy Melbourne, Australia      TT        OOOO        OOOO     LLLLLLLL   SSSS

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

