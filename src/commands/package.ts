/**
 * Package subcommands: `atp package` developer manifest and staging helpers.
 */

import { type Command } from "commander";

import { registerAllPackageCommands } from "./package-cmd/register-all.js";

/**
 * Register `package` subcommands (manifest fields, parts, components, bundles).
 *
 * @param program - Root Commander program.
 */
export function registerPackageCommands(program: Command): void {
  registerAllPackageCommands(program);
}
