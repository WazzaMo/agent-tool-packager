/**
 * Main install orchestration: resolve, copy, record.
 * Splits Feature 4 multi-part vs legacy install entry points; shared copy + best-effort rollback.
 */

import path from "node:path";

import { SafehouseAgentNotAssignedError } from "../config/safehouse-agent.js";
import { safehouseExists } from "../config/load.js";
import { expandHome, findProjectBase } from "../config/paths.js";

import { buildBundleInstallPathMap } from "./bundle-path-map.js";
import {
  checkDependencies,
  executeCatalogInstall,
  getAgentBasePath,
} from "./catalog-install-execute.js";
import {
  buildProviderInstallContext,
  manifestInstallLayout,
  prepareCatalogInstallPartInputs,
} from "./catalog-install-context.js";
import {
  resolvePackage,
  resolvePackagePath,
  loadPackageManifest,
} from "./resolve.js";

import {
  formatInstallUserFailureLines,
  mergeAmbiguityVerboseRequested,
} from "./format-install-user-failure.js";

import type { CatalogInstallContext, InstallOptions } from "./types.js";

const SAFEHOUSE_REQUIRED_MSG =
  "No Safehouse found. Run `atp safehouse init` first from your project directory.";

export type {
  BinaryScope,
  CatalogInstallContext,
  InstallOptions,
  PromptScope,
} from "./types.js";

export { buildProviderInstallContext, manifestInstallLayout, prepareCatalogInstallPartInputs };

/**
 * Install a Feature 4 multi-part catalog package (non-empty `parts` in manifest).
 *
 * @param ctx - Resolved install context.
 */
export async function installMultiTypeCatalogPackage(
  ctx: CatalogInstallContext
): Promise<void> {
  await executeCatalogInstall("multi", ctx);
}

/**
 * Install a legacy single-type catalog package (flat root manifest).
 *
 * @param ctx - Resolved install context.
 */
export async function installLegacyCatalogPackage(
  ctx: CatalogInstallContext
): Promise<void> {
  await executeCatalogInstall("legacy", ctx);
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
    process.exit(2);
  }

  const catalogPkg = resolvePackage(packageName, projectBase);
  if (!catalogPkg) {
    console.error(`Package not found in catalog: ${packageName}`);
    process.exit(2);
  }

  const pkgDir = resolvePackagePath(catalogPkg.location, projectBase);
  if (!pkgDir) {
    console.error(
      `Package location not supported (file:// only): ${catalogPkg.location ?? "(none)"}`
    );
    process.exit(2);
  }

  const manifest = loadPackageManifest(pkgDir);
  if (!manifest) {
    console.error(
      `No manifest (atp-package.yaml or package.yaml) found in ${pkgDir}`
    );
    process.exit(2);
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
      process.exit(2);
    }
    for (const dep of missing) {
      await installPackage(dep, opts, projectBase);
    }
  }

  let agentBase: string;
  try {
    agentBase = getAgentBasePath(projectBase);
  } catch (e) {
    if (e instanceof SafehouseAgentNotAssignedError) {
      console.error(e.message);
      process.exit(2);
    }
    throw e;
  }
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

  const ctx: CatalogInstallContext = {
    pkgDir,
    manifest,
    agentBase,
    bundlePathMap,
    installBinDir,
    catalogPkg,
    opts,
    projectBase,
  };

  const layout = manifestInstallLayout(manifest);
  try {
    if (layout === "multi") {
      await installMultiTypeCatalogPackage(ctx);
    } else {
      await installLegacyCatalogPackage(ctx);
    }
  } catch (err) {
    const verboseMerge = mergeAmbiguityVerboseRequested(Boolean(opts.verbose));
    const lines = formatInstallUserFailureLines(err, verboseMerge);
    for (const line of lines) {
      console.error(line);
    }
    process.exit(2);
  }
}
