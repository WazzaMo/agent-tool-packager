/**
 * Validate package: `atp validate package`.
 */

import { validatePackage } from "../package/validate.js";

import type { Command } from "commander";

/**
 * Run package validation for `cwd` and print result; exit non-zero when incomplete.
 *
 * @param cwd - Directory containing `atp-package.yaml`.
 */
function runValidatePackageCli(cwd: string): void {
  const result = validatePackage(cwd);
  if (result.ok) {
    console.log("Package appears complete. Mandatory minimal values are set.");
    console.log("Some optional values are also set.");
    console.log("This package can be added to the catalog.");
    return;
  }
  for (const msg of result.missing) {
    console.error(`  - ${msg}`);
  }
  process.exit(result.exitCode);
}

/**
 * Register `validate package` and wire it to {@link runValidatePackageCli}.
 *
 * @param program - Root Commander program.
 */
export function registerValidateCommands(program: Command): void {
  program
    .command("validate")
    .description("Validate package or other entities")
    .command("package")
    .description("Validate atp-package.yaml in current directory")
    .action(() => {
      runValidatePackageCli(process.cwd());
    });
}
