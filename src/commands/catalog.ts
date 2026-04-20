/**
 * Catalog subcommands: `atp catalog list`, `atp catalog add package`, `atp catalog remove`.
 */

import { loadStationCatalog, effectiveStationCatalogPackages } from "../catalog/load.js";
import {
  readTypeSummaryFromPackageDir,
  AtpPackageYamlParseError,
} from "../catalog/package-type-summary.js";
import { resolvePackagePath } from "../install/resolve.js";
import { catalogAddPackage } from "../package/catalog-add.js";
import { catalogRemovePackageCli } from "../package/catalog-remove.js";

import type { CatalogPackage } from "../catalog/types.js";
import type { Command } from "commander";

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
 *
 * @param opts.verbose - Append type summary from each resolvable `file://` package dir.
 * @param opts.cwd - Used to resolve relative catalog locations.
 */
function printStationCatalogList(opts?: { verbose?: boolean; cwd?: string }): void {
  const packages = effectiveStationCatalogPackages(loadStationCatalog());
  const cwd = opts?.cwd ?? process.cwd();

  if (packages.length === 0) {
    console.log("(no packages)");
    return;
  }

  for (const pkg of packages) {
    if (!pkg.name) {
      continue;
    }
    let line = formatCatalogPackageLine(pkg);
    if (opts?.verbose && pkg.location) {
      const dir = resolvePackagePath(pkg.location, cwd);
      if (dir) {
        try {
          line += readTypeSummaryFromPackageDir(dir);
        } catch (err) {
          if (err instanceof AtpPackageYamlParseError) {
            console.error(err.message);
            process.exit(2);
          }
          throw err;
        }
      }
    }
    console.log(line);
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
    .option("--verbose", "Show package types (from each package atp-package.yaml)")
    .action(function (this: Command) {
      const o = this.opts() as { verbose?: boolean };
      printStationCatalogList({ verbose: o.verbose, cwd: process.cwd() });
    });

  catalog
    .command("add package")
    .description("Add current package to Station catalog (run from package directory)")
    .action(() => {
      catalogAddPackage(process.cwd());
    });

  catalog
    .command("remove <package>")
    .description(
      "Remove a user catalog package from the Station (atp-catalog.yaml and user_packages/)"
    )
    .option(
      "--from-catalog-only",
      "Remove the catalog row even when registered Safehouses still list this package (may orphan installs)"
    )
    .option(
      "--and-from-projects",
      "Remove this package from every registered Safehouse manifest first, then drop the catalog row"
    )
    .action(function (this: Command, packageName: string) {
      const o = this.opts() as { fromCatalogOnly?: boolean; andFromProjects?: boolean };
      catalogRemovePackageCli(packageName, {
        fromCatalogOnly: o.fromCatalogOnly ?? false,
        andFromProjects: o.andFromProjects ?? false,
      });
    });
}
