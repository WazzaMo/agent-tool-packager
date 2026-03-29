/**
 * Maps bundle names to install directories for `{bundle_name}` placeholder patching.
 */

import path from "node:path";

import { expandHome } from "../config/paths.js";

import type { PackageManifest } from "./types.js";

/**
 * Build bundle name → bin directory path for patching markdown (Feature 3).
 *
 * @param manifest - Package manifest containing `bundles`.
 * @param binaryScope - User-wide `~/.local/bin` vs project `.atp_safehouse/...-exec/bin`.
 * @param projectBase - Project root directory.
 * @returns Map from bundle basename to absolute bin directory path.
 */
export function buildBundleInstallPathMap(
  manifest: PackageManifest,
  binaryScope: "user-bin" | "project-bin",
  projectBase: string
): Record<string, string> {
  const bundles = manifest.bundles ?? [];
  if (bundles.length === 0) {
    return {};
  }

  const binDir =
    binaryScope === "user-bin"
      ? expandHome("~/.local/bin")
      : path.join(projectBase, ".atp_safehouse", `${manifest.name}-exec`, "bin");

  const map: Record<string, string> = {};
  for (const b of bundles) {
    const bundlePath = typeof b === "string" ? b : b.path;
    const bundleName = path.basename(bundlePath) || bundlePath;
    map[bundleName] = binDir;
  }
  return map;
}
