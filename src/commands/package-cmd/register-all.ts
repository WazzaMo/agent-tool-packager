/**
 * Wire all `atp package` subcommands onto the CLI program.
 */

import { type Command } from "commander";

import { registerPackageComponentAndBundleCommands } from "./register-component-bundle.js";
import { registerPackageFieldCommands } from "./register-fields.js";
import { registerPackageSummaryAndAddCommands } from "./register-summary-add.js";
import { registerPackageTypeAndPartCommands } from "./register-type-part.js";

/**
 * @param program - Root Commander program.
 */
export function registerAllPackageCommands(program: Command): void {
  const pkg = program
    .command("package")
    .description("Configure package properties (run from package directory)");

  registerPackageTypeAndPartCommands(pkg);
  registerPackageFieldCommands(pkg);
  registerPackageSummaryAndAddCommands(pkg);
  registerPackageComponentAndBundleCommands(pkg);
}
