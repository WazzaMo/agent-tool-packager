/**
 * Safehouse subcommands: atp safehouse init, atp safehouse list, etc.
 */

import type { Command } from "commander";
import { safehouseInit } from "../init/safehouse-init.js";
import { safehouseList } from "../safehouse/list.js";

import { findProjectBase } from "../config/paths.js";

export function registerSafehouseCommands(program: Command): void {
  const safehouse = program
    .command("safehouse")
    .description("Manage the project Safehouse (project-local installs)");

  safehouse
    .command("init")
    .description("Create .atp_safehouse in the current directory")
    .action(async () => {
      await safehouseInit();
    });

  safehouse
    .command("list")
    .description("List packages installed in the project Safehouse")
    .action(() => {
      const cwd = process.cwd();
      const projectBase = findProjectBase(cwd) || cwd;
      safehouseList(projectBase);
    });
}
