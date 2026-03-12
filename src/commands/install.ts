/**
 * Install command: atp install <package> [--project|--user] [--dependencies]
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
      "Install to project Safehouse (default: binaries to .atp_safehouse, skills to agent dir)"
    )
    .option(
      "--user",
      "Install binaries to ~/.local/bin, ~/.local/share, ~/.local/etc"
    )
    .option(
      "--dependencies",
      "Install package dependencies first; without it, fail with clear message if deps missing"
    )
    .action(
      async (
        pkgName: string,
        opts: { project?: boolean; user?: boolean; dependencies?: boolean }
      ) => {
        const scope = opts.user ? "user" : "project";
        await installPackage(
          pkgName,
          {
            scope,
            dependencies: opts.dependencies ?? false,
          },
          process.cwd()
        );
      }
    );
}
