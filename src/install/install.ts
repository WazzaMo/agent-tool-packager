/**
 * Main install orchestration: resolve, copy, record.
 */

import path from "node:path";
import {
  loadSafehouseConfig,
  loadStationConfig,
  safehouseExists,
  addPackageToSafehouseManifest,
  writeStationPackageManifest,
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

const SAFEHOUSE_REQUIRED_MSG =
  "No Safehouse found. Run `atp safehouse init` first from your project directory.";

export type PromptScope = "project" | "station";
export type BinaryScope = "user-bin" | "project-bin";

export interface InstallOptions {
  promptScope: PromptScope;
  binaryScope: BinaryScope;
  dependencies: boolean;
}

/** Check for missing dependencies. Returns list of missing package names. */
function checkDependencies(
  manifest: PackageManifest,
  cwd: string
): string[] {
  const deps = manifest.program_dependencies ?? [];
  const missing: string[] = [];
  for (const dep of deps) {
    const resolved = resolvePackage(dep, cwd);
    if (!resolved) {
      missing.push(dep);
    }
  }
  return missing;
}

/** Build bundle name -> install path map for text patching. Feature 3: {bundle_name} placeholder. */
function buildBundlePathMap(
  manifest: PackageManifest,
  binaryScope: "user-bin" | "project-bin",
  cwd: string
): Record<string, string> {
  const bundles = manifest.bundles ?? [];
  if (bundles.length === 0) return {};

  const binDir =
    binaryScope === "user-bin"
      ? expandHome("~/.local/bin")
      : path.join(cwd, ".atp_safehouse", `${manifest.name}-exec`, "bin");

  const map: Record<string, string> = {};
  for (const b of bundles) {
    const bundlePath = typeof b === "string" ? b : b.path;
    const bundleName = path.basename(bundlePath) || bundlePath;
    map[bundleName] = binDir;
  }
  return map;
}

/** Resolve agent base path (project agent dir) for skills/rules. */
function getAgentBasePath(cwd: string): string {
  const config = loadSafehouseConfig(cwd);
  const stationConfig = loadStationConfig();
  const agentName = config?.agent ?? "cursor";
  const projectPath = resolveAgentProjectPath(agentName, stationConfig);
  return path.join(cwd, projectPath);
}

/** Run install for a single package. */
export async function installPackage(
  packageName: string,
  opts: InstallOptions,
  cwd: string = process.cwd()
): Promise<void> {
  if (!safehouseExists(cwd)) {
    console.error(SAFEHOUSE_REQUIRED_MSG);
    process.exit(1);
  }

  const catalogPkg = resolvePackage(packageName, cwd);
  if (!catalogPkg) {
    console.error(`Package not found in catalog: ${packageName}`);
    process.exit(1);
  }

  const pkgDir = resolvePackagePath(catalogPkg.location, cwd);
  if (!pkgDir) {
    console.error(
      `Package location not supported (file:// only): ${catalogPkg.location ?? "(none)"}`
    );
    process.exit(1);
  }

  const manifest = loadPackageManifest(pkgDir);
  if (!manifest) {
    console.error(
      `No manifest (atp-package.yaml or package.yaml) found in ${pkgDir}`
    );
    process.exit(1);
  }

  const missing = checkDependencies(manifest, cwd);
  if (missing.length > 0) {
    if (!opts.dependencies) {
      console.error(
        `Package ${packageName} has unmet dependencies: ${missing.join(", ")}`
      );
      console.error(
        "Install with --dependencies to install them first, or add them to your catalog."
      );
      process.exit(1);
    }
    for (const dep of missing) {
      await installPackage(dep, opts, cwd);
    }
  }

  const agentBase = getAgentBasePath(cwd);
  const bundlePathMap = buildBundlePathMap(manifest, opts.binaryScope, cwd);

  const hasProgramAssets = (manifest.assets ?? []).some(
    (a) => a.type === "program"
  );
  const installBinDir =
    hasProgramAssets && opts.promptScope === "project"
      ? opts.binaryScope === "user-bin"
        ? expandHome("~/.local/bin")
        : path.join(cwd, ".atp_safehouse", `${manifest.name}-exec`, "bin")
      : undefined;

  copyPackageAssets(pkgDir, manifest, agentBase, bundlePathMap, installBinDir);

  const version = manifest.version ?? catalogPkg.version ?? "0.0.0";

  if (opts.promptScope === "project") {
    const source =
      opts.binaryScope === "user-bin" ? "station" : "local";
    addPackageToSafehouseManifest(
      manifest.name,
      version,
      opts.binaryScope,
      source,
      cwd
    );
  } else {
    writeStationPackageManifest(manifest.name, {
      name: manifest.name,
      version,
      scope: "user",
      source: catalogPkg.location,
    });
  }

  const finalLabel = `prompts:${opts.promptScope}, bin:${opts.binaryScope}`;

  console.log(`Installed ${manifest.name} ${version} (${finalLabel})`);
}
