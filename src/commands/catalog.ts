/**
 * Catalog subcommands: atp catalog list, etc.
 */

import type { Command } from "commander";
import { mergeCatalogs } from "../catalog/merge.js";
import {
  loadGlobalCatalog,
  loadProjectCatalog,
  loadUserCatalog,
} from "../catalog/load.js";
import type { CatalogPackage } from "../catalog/types.js";

function formatPackage(pkg: CatalogPackage): string {
  if (pkg.version) {
    return `${pkg.name}  ${pkg.version}`;
  }
  return pkg.name;
}

export function registerCatalogCommands(program: Command): void {
  const catalog = program
    .command("catalog")
    .description("Manage and list packages in the catalog");

  catalog
    .command("list")
    .description("List packages in the catalog that can be installed")
    .option("--global-only", "Show only global (bundled) catalog")
    .option("--project-only", "Show only project catalog")
    .option("--user-only", "Show only user (Station) catalog")
    .action((opts: { globalOnly?: boolean; projectOnly?: boolean; userOnly?: boolean }) => {
      const cwd = process.cwd();
      const global = loadGlobalCatalog();
      const user = loadUserCatalog();
      const project = loadProjectCatalog(cwd);

      let packages: CatalogPackage[];

      if (opts.globalOnly) {
        packages = global.packages;
      } else if (opts.projectOnly) {
        packages = project.packages;
      } else if (opts.userOnly) {
        packages = user.packages;
      } else {
        packages = mergeCatalogs(global, user, project);
      }

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
}
