/**
 * Remove command group: atp remove safehouse <pkg>, atp remove station <pkg> [--exfiltrate].
 */

import type { Command } from "commander";
import { removeSafehousePackage } from "../remove/remove-safehouse.js";
import { removeStationPackage } from "../remove/remove-station.js";

import { findProjectBase } from "../config/paths.js";

export function registerRemoveCommands(program: Command): void {
  const remove = program
    .command("remove")
    .description("Remove packages from Station or project Safehouse");

  remove
    .command("safehouse <package>")
    .description("Remove package from current project's Safehouse")
    .action(async (pkgName: string) => {
      const cwd = process.cwd();
      const projectBase = findProjectBase(cwd) || cwd;
      removeSafehousePackage(pkgName, projectBase);
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
