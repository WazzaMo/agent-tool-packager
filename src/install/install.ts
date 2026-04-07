/**
 * Main install orchestration: resolve, copy, record.
 * Splits Feature 4 multi-part vs legacy install entry points; shared copy + best-effort rollback.
 */

import fs from "node:fs";
import path from "node:path";

import { resolveAgentHomePath, resolveAgentProjectPath } from "../config/agent-path.js";
import {
  loadSafehouseConfig,
  loadStationConfig,
  safehouseExists,
} from "../config/load.js";
import { expandHome, findProjectBase } from "../config/paths.js";
import type { ConfigMergeJournalEntryV1 } from "../config/config-merge-journal.js";
import { addPackageToSafehouseManifest } from "../config/safehouse-manifest.js";
import { writeStationPackageManifest } from "../config/station-package-manifest.js";

import {
  buildStagedPartInstallInputs,
  coercePackageParts,
} from "../file-ops/part-install-input.js";
import { buildBundleInstallPathMap } from "./bundle-path-map.js";
import { installPackageAssetsForCatalogContext } from "./install-package-assets.js";
import {
  resolvePackage,
  resolvePackagePath,
  loadPackageManifest,
} from "./resolve.js";

import type { CatalogInstallContext, InstallOptions, PackageManifest } from "./types.js";
import {
  normaliseAgentId,
  type InstallContext,
  type InstallLayer,
} from "../file-ops/install-context.js";
import type { StagedPartInstallInput } from "../file-ops/part-install-input.js";


const SAFEHOUSE_REQUIRED_MSG =
  "No Safehouse found. Run `atp safehouse init` first from your project directory.";

export type {
  BinaryScope,
  CatalogInstallContext,
  InstallOptions,
  PromptScope,
} from "./types.js";

/**
 * Classify catalog manifest layout for install routing (Feature 4).
 *
 * @param manifest - Loaded `atp-package.yaml`.
 * @returns `multi` when `parts` is a non-empty array.
 */
export function manifestInstallLayout(manifest: PackageManifest): "multi" | "legacy" {
  const parts = coercePackageParts(manifest.parts);
  if (parts.length > 0) {
    return "multi";
  }
  return "legacy";
}

/**
 * Build staged part handles for the active catalog install (provider planning input).
 *
 * @param ctx - Resolved {@link CatalogInstallContext}.
 * @returns One entry per manifest part (multi) or a single synthetic part (legacy).
 */
export function prepareCatalogInstallPartInputs(
  ctx: CatalogInstallContext
): StagedPartInstallInput[] {
  return buildStagedPartInstallInputs(ctx.manifest, ctx.pkgDir);
}

/**
 * Build provider {@link InstallContext} for this catalog install (roots + agent + layer).
 * `stagingDir` is the package extract directory; `projectRoot` is the repo root.
 *
 * When `opts.promptScope` is `station`, `layer` is `user` and `layerRoot` is the agent home
 * from Station `agent-paths` (for merges targeting user-global config). File copy today still
 * uses `ctx.agentBase` under the project until user-layer materialisation is implemented.
 *
 * @param ctx - Resolved {@link CatalogInstallContext}.
 * @returns Absolute paths suitable for `AgentProvider.planInstall`.
 */
export function buildProviderInstallContext(ctx: CatalogInstallContext): InstallContext {
  const stationConfig = loadStationConfig();
  const safehouse = loadSafehouseConfig(ctx.projectBase);
  const agentName = safehouse?.agent ?? "cursor";
  const agent = normaliseAgentId(agentName);

  const projectRoot = path.resolve(ctx.projectBase);
  const stagingDir = path.resolve(ctx.pkgDir);

  const layer: InstallLayer =
    ctx.opts.promptScope === "project" ? "project" : "user";
  const layerRoot =
    layer === "project"
      ? path.resolve(ctx.agentBase)
      : path.resolve(resolveAgentHomePath(agentName, stationConfig));

  return { agent, layer, projectRoot, layerRoot, stagingDir };
}

/**
 * Best-effort undo of file copies when install fails before Safehouse/Station bookkeeping completes.
 *
 * @param paths - Destination files written during the attempt (most recent first is ideal).
 */
function rollbackCopiedFiles(paths: string[]): void {
  for (const p of [...paths].reverse()) {
    try {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        fs.unlinkSync(p);
      }
    } catch {
      /* ignore */
    }
  }
}

/**
 * Check for missing dependencies.
 *
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
 *
 * @param projectBase - Project root directory.
 * @returns Absolute path to agent directory (e.g. `.cursor/`).
 */
function getAgentBasePath(projectBase: string): string {
  const config = loadSafehouseConfig(projectBase);
  const stationConfig = loadStationConfig();
  const agentName = config?.agent ?? "cursor";
  const projectPath = resolveAgentProjectPath(agentName, stationConfig);
  return path.join(projectBase, projectPath);
}

/**
 * Copy assets and update Station or Safehouse; rollback copied files on failure (project scope).
 *
 * @param layout - Recorded on Safehouse manifest when `promptScope` is project.
 * @param ctx - Resolved paths and manifest.
 */
async function executeCatalogInstall(
  layout: "multi" | "legacy",
  ctx: CatalogInstallContext
): Promise<void> {
  const { pkgDir, manifest, catalogPkg, opts, projectBase } = ctx;

  const providerCtx = buildProviderInstallContext(ctx);
  if (!path.isAbsolute(providerCtx.stagingDir) || !path.isAbsolute(providerCtx.layerRoot)) {
    throw new Error("Install internal error: provider context paths must be absolute.");
  }
  const pkgResolved = path.resolve(pkgDir);
  const baseResolved = path.resolve(projectBase);
  if (providerCtx.stagingDir !== pkgResolved || providerCtx.projectRoot !== baseResolved) {
    throw new Error("Install internal error: provider context root mismatch.");
  }

  const stagedParts = prepareCatalogInstallPartInputs(ctx);
  if (layout === "multi") {
    const n = coercePackageParts(manifest.parts).length;
    if (n > 0 && stagedParts.length !== n) {
      throw new Error("Install internal error: staged part count does not match manifest parts.");
    }
  }

  const copied: string[] = [];
  const configJournal: ConfigMergeJournalEntryV1[] = [];
  try {
    installPackageAssetsForCatalogContext(
      ctx,
      providerCtx,
      stagedParts,
      (dest) => copied.push(dest),
      configJournal
    );

    const version = manifest.version ?? catalogPkg.version ?? "0.0.0";

    if (opts.promptScope === "project") {
      const source = opts.binaryScope === "user-bin" ? "station" : "local";
      addPackageToSafehouseManifest(
        manifest.name,
        version,
        opts.binaryScope,
        source,
        projectBase,
        layout,
        configJournal
      );
    } else {
      writeStationPackageManifest(manifest.name, {
        name: manifest.name,
        version,
        scope: "user",
        source: catalogPkg.location,
      });
    }
  } catch {
    rollbackCopiedFiles(copied);
    throw new Error("Install copy or manifest update failed.");
  }

  const finalLabel = `prompts:${opts.promptScope}, bin:${opts.binaryScope}`;
  console.log(`Installed ${manifest.name} ${manifest.version ?? catalogPkg.version ?? "0.0.0"} (${finalLabel})`);
}

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
    console.error(String(err));
    process.exit(1);
  }
}
