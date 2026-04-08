/**
 * Install command: `atp install <package>` with project/station and bin scope flags.
 */

import {
  installPackage,
  type InstallOptions,
} from "../install/install.js";

import type { Command } from "commander";

/**
 * Map Commander flags to {@link InstallOptions}.
 *
 * @param opts - Parsed CLI options.
 * @returns Options for {@link installPackage}.
 */
function installOptionsFromCliFlags(opts: {
  project?: boolean;
  station?: boolean;
  userBin?: boolean;
  projectBin?: boolean;
  dependencies?: boolean;
  forceConfig?: boolean;
  skipConfig?: boolean;
}): InstallOptions {
  if (opts.forceConfig && opts.skipConfig) {
    throw new Error("Cannot use --force-config together with --skip-config.");
  }
  const promptScope = opts.station ? "station" : "project";
  const binaryScope = opts.projectBin ? "project-bin" : "user-bin";
  return {
    promptScope,
    binaryScope,
    dependencies: opts.dependencies ?? false,
    forceConfig: opts.forceConfig ?? false,
    skipConfig: opts.skipConfig ?? false,
  };
}

/**
 * Register `install` and delegate to {@link installPackage}.
 *
 * @param program - Root Commander program.
 */
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
    .option(
      "--force-config",
      "When merging agent JSON config, replace an existing MCP server or hook handler if it conflicts with the package (targets e.g. .cursor/mcp.json, .cursor/hooks.json, or Gemini .gemini/settings.json for mcpServers/hooks slices)"
    )
    .option(
      "--skip-config",
      "Skip MCP and hooks JSON merges: no read/write of merged config files (e.g. .cursor/mcp.json, .cursor/hooks.json, or Gemini .gemini/settings.json)"
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
          forceConfig?: boolean;
          skipConfig?: boolean;
        }
      ) => {
        let installOpts: InstallOptions;
        try {
          installOpts = installOptionsFromCliFlags(opts);
        } catch (e) {
          console.error((e as Error).message);
          process.exit(1);
          return;
        }
        await installPackage(pkgName, installOpts, process.cwd());
      }
    );
}
