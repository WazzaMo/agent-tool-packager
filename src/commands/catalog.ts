/**
 * Catalog subcommands: `atp catalog list`, `atp catalog add package`.
 */

import type { Command } from "commander";
import { loadStationCatalog, effectiveStationCatalogPackages } from "../catalog/load.js";

import type { CatalogPackage } from "../catalog/types.js";
import { catalogAddPackage } from "../package/catalog-add.js";

/**
 * Single-line display for one catalog entry.
 *
 * @param pkg - Catalog row.
 * @returns Text for stdout.
 */
function formatCatalogPackageLine(pkg: CatalogPackage): string {
  if (pkg.version) {
    return `${pkg.name}  ${pkg.version}`;
  }
  return pkg.name;
}

/**
 * Print effective catalog packages to stdout (or a placeholder when empty).
 */
function printStationCatalogList(): void {
  const packages = effectiveStationCatalogPackages(loadStationCatalog());

  if (packages.length === 0) {
    console.log("(no packages)");
    return;
  }

  for (const pkg of packages) {
    if (pkg.name) {
      console.log(formatCatalogPackageLine(pkg));
    }
  }
}

/**
 * Register catalog subcommands.
 *
 * @param program - Root Commander program.
 */
export function registerCatalogCommands(program: Command): void {
  const catalog = program
    .command("catalog")
    .description("Manage and list packages in the Station catalog");

  catalog
    .command("list")
    .description("List packages in the Station catalog (atp-catalog.yaml)")
    .action(() => {
      printStationCatalogList();
    });

  catalog
    .command("add package")
    .description("Add current package to Station catalog (run from package directory)")
    .action(() => {
      catalogAddPackage(process.cwd());
    });
}
