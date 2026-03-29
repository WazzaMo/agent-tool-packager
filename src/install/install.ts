/**
 * Main install orchestration: resolve, copy, record.
 */

import path from "node:path";
import {
  loadSafehouseConfig,
  loadStationConfig,
  safehouseExists,
} from "../config/load.js";

import { addPackageToSafehouseManifest } from "../config/safehouse-manifest.js";

import { writeStationPackageManifest } from "../config/station-package-manifest.js";

import { expandHome, findProjectBase } from "../config/paths.js";
import { resolveAgentProjectPath } from "../config/agent-path.js";

import { buildBundleInstallPathMap } from "./bundle-path-map.js";
import {
  resolvePackage,
  resolvePackagePath,
  loadPackageManifest,
} from "./resolve.js";

import { copyPackageAssets } from "./copy-assets.js";
import type { PackageManifest } from "./types.js";

const SAFEHOUSE_REQUIRED_MSG =
  "No Safehouse found. Run `atp safehouse init` first from your project directory.";

/** Whether install prompts apply to the project Safehouse or Station scope. */
export type PromptScope = "project" | "station";
/** Where program assets are installed when applicable. */
export type BinaryScope = "user-bin" | "project-bin";

/** Options for {@link installPackage}. */
export interface InstallOptions {
  promptScope: PromptScope;
  binaryScope: BinaryScope;
  /** When true, recursively install `program_dependencies` from the catalog first. */
  dependencies: boolean;
}

/**
 * Check for missing dependencies.
 * @param manifest - Package manifest with program_dependencies.
 * @param projectBase - Project root directory.
 * @returns List of missing package names.
 */
function checkDependencies(
  manifest: PackageManifest,
  projectBase: string
): string[] {
  const deps = manifest.program_dependencies ?? [];
  const missing: string[] = [];
  for (const dep of deps) {
    const resolved = resolvePackage(dep, projectBase);
    if (!resolved) {
      missing.push(dep);
    }
  }
  return missing;
}

/**
 * Resolve agent base path (project agent dir) for skills/rules.
 * @param projectBase - Project root directory.
 * @returns Absolute path to agent directory (e.g. .cursor/).
 */
function getAgentBasePath(projectBase: string): string {
  const config = loadSafehouseConfig(projectBase);
  const stationConfig = loadStationConfig();
  const agentName = config?.agent ?? "cursor";
  const projectPath = resolveAgentProjectPath(agentName, stationConfig);
  return path.join(projectBase, projectPath);
}

/**
 * Run install for a single package.
 * Feature 3: resolve scope, find safehouse, copy assets, patch placeholders, update manifest.
 *
 * @param packageName - Name of package to install.
 * @param opts - Install scope options (promptScope, binaryScope, dependencies).
 * @param cwd - Current working directory (default process.cwd()).
 * @returns Resolves when install completes; may `process.exit` on fatal errors.
 */
export async function installPackage(
  packageName: string,
  opts: InstallOptions,
  cwd: string = process.cwd()
): Promise<void> {
  const projectBase = findProjectBase(cwd);
  if (!projectBase || !safehouseExists(projectBase)) {
    console.error(SAFEHOUSE_REQUIRED_MSG);
    process.exit(1);
  }

  const catalogPkg = resolvePackage(packageName, projectBase);
  if (!catalogPkg) {
    console.error(`Package not found in catalog: ${packageName}`);
    process.exit(1);
  }

  const pkgDir = resolvePackagePath(catalogPkg.location, projectBase);
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

  const missing = checkDependencies(manifest, projectBase);
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
      await installPackage(dep, opts, projectBase);
    }
  }

  const agentBase = getAgentBasePath(projectBase);
  const bundlePathMap = buildBundleInstallPathMap(
    manifest,
    opts.binaryScope,
    projectBase
  );

  const hasProgramAssets = (manifest.assets ?? []).some(
    (a) => a.type === "program"
  );
  const installBinDir =
    hasProgramAssets && opts.promptScope === "project"
      ? opts.binaryScope === "user-bin"
        ? expandHome("~/.local/bin")
        : path.join(projectBase, ".atp_safehouse", `${manifest.name}-exec`, "bin")
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
      projectBase
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
