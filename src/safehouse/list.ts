/**
 * List packages installed in the project Safehouse.
 * Reads .atp_safehouse/manifest.yaml packages array.
 */

import { loadSafehouseManifest } from "../config/load.js";
import { getSafehousePath, pathExists } from "../config/paths.js";

function pad(str: string, width: number): string {
  return str.padEnd(Math.max(width, str.length));
}

export function safehouseList(cwd: string = process.cwd()): void {
  const safehousePath = getSafehousePath(cwd);

  if (!pathExists(safehousePath)) {
    console.log("No packages installed in Safehouse");
    return;
  }

  const manifest = loadSafehouseManifest(cwd);
  const packages = manifest?.packages ?? [];

  if (packages.length === 0) {
    console.log("No packages installed in Safehouse");
    return;
  }

  const nameW = Math.max(4, ...packages.map((p) => p.name.length));
  const versionW = Math.max(7, ...packages.map((p) => (p.version ?? "-").length));

  console.log(pad("NAME", nameW) + "  VERSION");
  console.log("-".repeat(nameW + versionW + 2));

  for (const p of packages) {
    console.log(pad(p.name, nameW) + "  " + (p.version ?? "-"));
  }
}
