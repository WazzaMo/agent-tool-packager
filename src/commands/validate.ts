/**
 * Validate commands: `atp validate package` (authoring), `atp validate catalog-package` (pre-install).
 */

import path from "node:path";

import { validateCatalogInstallPackage, validatePackage } from "../package/validate.js";

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
 * Run catalog-extract validation (same checks as immediately before `atp install`).
 *
 * @param pkgDir - Catalog package root (extracted `user_packages/<name>/` or similar).
 */
function runValidateCatalogInstallCli(pkgDir: string): void {
  const result = validateCatalogInstallPackage(pkgDir);
  if (result.ok) {
    console.log("Catalog package passes pre-install validation.");
    console.log("Manifest and on-disk staging match what `atp install` requires.");
    return;
  }
  console.error("Catalog package failed pre-install validation.");
  console.error(
    "Fix files under this directory (e.g. Station user_packages/...) or re-run `atp catalog add package` from source."
  );
  console.error("");
  console.error("Validation indicates:");
  for (const msg of result.missing) {
    console.error(`  - ${msg}`);
  }
  process.exit(result.exitCode);
}

/**
 * Register `validate package` and `validate catalog-package`.
 *
 * @param program - Root Commander program.
 */
export function registerValidateCommands(program: Command): void {
  const validate = program
    .command("validate")
    .description("Validate package manifests (authoring or catalog extract)");

  validate
    .command("package")
    .description("Validate atp-package.yaml and stage.tar in the current directory (authoring)")
    .action(() => {
      runValidatePackageCli(process.cwd());
    });

  validate
    .command("catalog-package")
    .description(
      "Validate an extracted catalog package directory (same as pre-flight before atp install); default: cwd"
    )
    .argument("[dir]", "Catalog package root (atp-package.yaml or package.yaml)")
    .action((dir?: string) => {
      const pkgDir = dir ? path.resolve(dir) : process.cwd();
      runValidateCatalogInstallCli(pkgDir);
    });
}
