/**
 * Remove command group: `atp remove safehouse <pkg>`, `atp remove station <pkg> [--exfiltrate]`.
 */

import { findProjectBase } from "../config/paths.js";
import { removeSafehousePackage } from "../remove/remove-safehouse.js";
import { removeStationPackage } from "../remove/remove-station.js";

import type { Command } from "commander";

/**
 * Resolve project base for Safehouse remove (fallback to cwd).
 *
 * @param cwd - Current working directory.
 * @returns Project root for manifest paths.
 */
function projectBaseForSafehouseRemove(cwd: string): string {
  return findProjectBase(cwd) || cwd;
}

/**
 * Register remove subcommands.
 *
 * @param program - Root Commander program.
 */
export function registerRemoveCommands(program: Command): void {
  const remove = program
    .command("remove")
    .description("Remove packages from Station or project Safehouse");

  remove
    .command("safehouse <package>")
    .description("Remove package from current project's Safehouse")
    .action(async (pkgName: string) => {
      const cwd = process.cwd();
      removeSafehousePackage(pkgName, projectBaseForSafehouseRemove(cwd));
    });

  remove
    .command("station <package>")
    .description("Remove package from Station")
    .option(
      "--exfiltrate",
      "Copy Station binaries/share/config to Safehouses that use this package before removing"
    )
    .action(
      async (
        pkgName: string,
        opts: { exfiltrate?: boolean }
      ) => {
        removeStationPackage(pkgName, {
          exfiltrate: opts.exfiltrate ?? false,
        });
      }
    );
}
