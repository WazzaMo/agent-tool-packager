/**
 * List packages installed in the project Safehouse.
 * Reads .atp_safehouse/manifest.yaml packages array.
 */

import {
  readTypeSummaryFromPackageDir,
  AtpPackageYamlParseError,
} from "../catalog/package-type-summary.js";
import { getSafehousePath, pathExists } from "../config/paths.js";
import { loadSafehouseManifest } from "../config/safehouse-manifest.js";
import { resolvePackage, resolvePackagePath } from "../install/resolve.js";

/**
 * Pad a string for fixed-width CLI columns.
 *
 * @param str - Cell text.
 * @param width - Minimum column width.
 * @returns Padded string.
 */
function padCell(str: string, width: number): string {
  return str.padEnd(Math.max(width, str.length));
}

/**
 * List packages recorded in the project Safehouse manifest (stdout table).
 *
 * @param cwd - Project base directory; defaults to `process.cwd()`.
 * @param opts.extended - Append type summary from resolved catalog `atp-package.yaml`.
 */
export function safehouseList(
  cwd: string = process.cwd(),
  opts?: { extended?: boolean }
): void {
  const safehousePath = getSafehousePath(cwd);

  if (!pathExists(safehousePath)) {
    console.log("No packages installed in Safehouse");
    return;
  }

  let manifest;
  try {
    manifest = loadSafehouseManifest(cwd);
  } catch {
    console.error("Invalid Safehouse manifest.yaml");
    process.exit(2);
  }

  const packages = manifest?.packages ?? [];

  if (packages.length === 0) {
    console.log("No packages installed in Safehouse");
    return;
  }

  const rows = packages.map((p) => {
    let typeSuffix = "";
    if (opts?.extended) {
      const cat = resolvePackage(p.name, cwd);
      const pkgDir = cat?.location ? resolvePackagePath(cat.location, cwd) : null;
      if (pkgDir) {
        try {
          typeSuffix = readTypeSummaryFromPackageDir(pkgDir);
        } catch (err) {
          if (err instanceof AtpPackageYamlParseError) {
            console.error(err.message);
            process.exit(2);
          }
          throw err;
        }
      }
    }
    const nameCol = p.name + typeSuffix;
    return { nameCol, version: p.version ?? "-" };
  });

  const nameW = Math.max(4, ...rows.map((r) => r.nameCol.length));
  const versionW = Math.max(7, ...rows.map((r) => r.version.length));

  console.log(padCell("NAME", nameW) + "  VERSION");
  console.log("-".repeat(nameW + versionW + 2));

  for (const r of rows) {
    console.log(padCell(r.nameCol, nameW) + "  " + r.version);
  }
}
