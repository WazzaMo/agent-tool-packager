/**
 * Install command: atp install <package> [--project|--station] [--user-bin|--project-bin] [--dependencies]
 */

import type { Command } from "commander";
import { installPackage } from "../install/install.js";

export function registerInstallCommand(program: Command): void {
  program
    .command("install")
    .description("Install a package from the catalog")
    .argument("<package>", "Package name to install")
    .option(
      "--project",
      "Install prompt material into the project's agent directory (default)"
    )
    .option(
      "--station",
      "Install prompt material into the Station area (~/.atp_station)"
    )
    .option(
      "--user-bin",
      "Install executables into ~/.local/bin (default)"
    )
    .option(
      "--project-bin",
      "Install executables into the project's Safehouse bin directory"
    )
    .option(
      "--dependencies",
      "Install package dependencies first; without it, fail with clear message if deps missing"
    )
    .action(
      async (
        pkgName: string,
        opts: {
          project?: boolean;
          station?: boolean;
          userBin?: boolean;
          projectBin?: boolean;
          dependencies?: boolean;
        }
      ) => {
        const promptScope = opts.station ? "station" : "project";
        const binaryScope = opts.projectBin ? "project-bin" : "user-bin";
        await installPackage(
          pkgName,
          {
            promptScope,
            binaryScope,
            dependencies: opts.dependencies ?? false,
          },
          process.cwd()
        );
      }
    );
}
