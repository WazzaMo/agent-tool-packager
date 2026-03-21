/**
 * Catalog subcommands: atp catalog list, etc.
 */

import type { Command } from "commander";
import { loadStationCatalog, effectiveStationCatalogPackages } from "../catalog/load.js";

import type { CatalogPackage } from "../catalog/types.js";
import { catalogAddPackage } from "../package/catalog-add.js";

function formatPackage(pkg: CatalogPackage): string {
  if (pkg.version) {
    return `${pkg.name}  ${pkg.version}`;
  }
  return pkg.name;
}

export function registerCatalogCommands(program: Command): void {
  const catalog = program
    .command("catalog")
    .description("Manage and list packages in the Station catalog");

  catalog
    .command("list")
    .description("List packages in the Station catalog (atp-catalog.yaml)")
    .action(() => {
      const packages = effectiveStationCatalogPackages(loadStationCatalog());

      if (packages.length === 0) {
        console.log("(no packages)");
        return;
      }

      for (const pkg of packages) {
        if (pkg.name) {
          console.log(formatPackage(pkg));
        }
      }
    });

  catalog
    .command("add package")
    .description("Add current package to Station catalog (run from package directory)")
    .action(() => {
      catalogAddPackage(process.cwd());
    });
}
