/**
 * Load `atp-package.yaml` for package subcommands; exit with a standard message when missing.
 */

import { loadDevManifest } from "../../package/load-manifest.js";

import type { DevPackageManifest } from "../../package/types.js";

const MANIFEST_MISSING_MSG =
  "No atp-package.yaml. Run `atp create package skeleton` first.";

/**
 * @param cwd - Package directory.
 * @returns Parsed manifest.
 */
export function loadDevManifestOrExit(cwd: string): DevPackageManifest {
  const m = loadDevManifest(cwd);
  if (!m) {
    console.error(MANIFEST_MISSING_MSG);
    process.exit(1);
  }
  return m;
}
