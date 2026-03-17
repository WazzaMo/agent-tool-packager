/**
 * Re-install all Safehouse packages for the current agent.
 * Used during agent handover.
 */

import path from "node:path";
import {
  loadSafehouseManifest,
  loadStationConfig,
  loadSafehouseConfig,
} from "../config/load.js";
import { expandHome } from "../config/paths.js";
import { resolveAgentProjectPath } from "../config/agent-path.js";
import {
  resolvePackage,
  resolvePackagePath,
  loadPackageManifest,
} from "./resolve.js";
import { copyPackageAssets } from "./copy-assets.js";
import type { PackageManifest } from "./types.js";

/** Build bundle name -> install path map for text patching. */
function buildBundlePathMap(
  manifest: PackageManifest,
  binaryScope: "user-bin" | "project-bin",
  projectBase: string
): Record<string, string> {
  const bundles = manifest.bundles ?? [];
  if (bundles.length === 0) return {};

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

/** Resolve agent base path (project agent dir) for the GIVEN agent. */
function getAgentBasePath(projectBase: string, agentName: string): string {
  const stationConfig = loadStationConfig();
  const projectPath = resolveAgentProjectPath(agentName, stationConfig);
  return path.join(projectBase, projectPath);
}

/** Re-install all packages in the Safehouse manifest for the currently configured agent. */
export async function reinstallSafehousePackages(
  projectBase: string
): Promise<void> {
  const manifest = loadSafehouseManifest(projectBase);
  if (!manifest || !manifest.packages || manifest.packages.length === 0) {
    return;
  }

  const config = loadSafehouseConfig(projectBase);
  const agentName = config?.agent;
  if (!agentName) return;

  const agentBase = getAgentBasePath(projectBase, agentName);

  for (const pkgInfo of manifest.packages) {
    const catalogPkg = resolvePackage(pkgInfo.name, projectBase);
    if (!catalogPkg) continue;

    const pkgDir = resolvePackagePath(catalogPkg.location, projectBase);
    if (!pkgDir) continue;

    const pkgManifest = loadPackageManifest(pkgDir);
    if (!pkgManifest) continue;

    const binaryScope = pkgInfo.binary_scope ?? "user-bin";
    const bundlePathMap = buildBundlePathMap(pkgManifest, binaryScope, projectBase);

    // Only copy file assets (skills, rules). Programs are already in place.
    copyPackageAssets(pkgDir, pkgManifest, agentBase, bundlePathMap);
    console.log(`  - Re-installed ${pkgInfo.name} for ${agentName}`);
  }
}
