/**
 * Validate package: atp validate package
 */

import type { Command } from "commander";
import { validatePackage } from "../package/validate.js";

export function registerValidateCommands(program: Command): void {
  program
    .command("validate")
    .description("Validate package or other entities")
    .command("package")
    .description("Validate atp-package.yaml in current directory")
    .action(() => {
      const result = validatePackage(process.cwd());
      if (result.ok) {
        console.log("Package appears complete. Mandatory minimal values are set.");
        console.log("Some optional values are also set.");
        console.log("This package can be added to the catalog.");
      } else {
        for (const msg of result.missing) {
          console.error(`  - ${msg}`);
        }
        process.exit(result.exitCode);
      }
    });
}
