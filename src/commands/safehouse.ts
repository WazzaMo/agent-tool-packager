/**
 * Safehouse subcommands: `atp safehouse init`, `atp safehouse list`.
 */

import { findProjectBase } from "../config/paths.js";
import { safehouseInit } from "../init/safehouse-init.js";
import { safehouseList } from "../safehouse/list.js";

import type { Command } from "commander";

/**
 * Resolve project base for Safehouse list (fallback to cwd when markers missing).
 *
 * @param cwd - Current working directory.
 * @returns Directory passed to {@link safehouseList}.
 */
function projectBaseForSafehouseList(cwd: string): string {
  return findProjectBase(cwd) || cwd;
}

/**
 * Register Safehouse-related commands on the program.
 *
 * @param program - Root Commander program.
 */
export function registerSafehouseCommands(program: Command): void {
  const safehouse = program
    .command("safehouse")
    .description("Manage the project Safehouse (project-local installs)");

  safehouse
    .command("init")
    .description(
      "Create .atp_safehouse for the resolved project (not under $HOME unless ATP_ALLOW_HOME_SAFEHOUSE=1)"
    )
    .action(async () => {
      await safehouseInit();
    });

  safehouse
    .command("list")
    .description("List packages installed in the project Safehouse")
    .option(
      "--extended",
      "Append types from catalog package atp-package.yaml (parse errors exit 2)"
    )
    .action(function (this: Command) {
      const cwd = process.cwd();
      const o = this.opts() as { extended?: boolean };
      safehouseList(projectBaseForSafehouseList(cwd), { extended: o.extended });
    });
}
