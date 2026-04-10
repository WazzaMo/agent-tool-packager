/**
 * Run catalog install copy + manifest bookkeeping; rollback copied files on failure.
 */

import fs from "node:fs";
import path from "node:path";

import { resolveAgentProjectPath } from "../config/agent-path.js";
import {
  loadSafehouseConfig,
  loadStationConfig,
} from "../config/load.js";
import type { ConfigMergeJournalEntryV1 } from "../config/config-merge-journal.js";
import { addPackageToSafehouseManifest } from "../config/safehouse-manifest.js";
import { writeStationPackageManifest } from "../config/station-package-manifest.js";
import { coercePackageParts } from "../file-ops/part-install-input.js";
import { HooksMergeAmbiguousError } from "../file-ops/hooks-merge/errors.js";
import { McpMergeAmbiguousError } from "../file-ops/mcp-merge/errors.js";

import { validateCatalogInstallPackage } from "../package/validate-catalog-install-package.js";

import { installPackageAssetsForCatalogContext } from "./install-package-assets.js";
import { resolvePackage } from "./resolve.js";

import {
  buildProviderInstallContext,
  prepareCatalogInstallPartInputs,
} from "./catalog-install-context.js";

import type { CatalogInstallContext, PackageManifest } from "./types.js";

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
export function checkDependencies(
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
export function getAgentBasePath(projectBase: string): string {
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
export async function executeCatalogInstall(
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

  const preInstall = validateCatalogInstallPackage(pkgResolved);
  if (!preInstall.ok) {
    throw new Error(
      "Package failed pre-install validation. Fix or restore the catalog package, then retry.\n" +
        preInstall.missing.map((line) => `  - ${line}`).join("\n")
    );
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
  } catch (e) {
    rollbackCopiedFiles(copied);
    if (e instanceof McpMergeAmbiguousError || e instanceof HooksMergeAmbiguousError) {
      throw e;
    }
    const cause = e instanceof Error ? e.message : String(e);
    throw new Error(`Install copy or manifest update failed: ${cause}`);
  }

  const finalLabel = `prompts:${opts.promptScope}, bin:${opts.binaryScope}`;
  console.log(`Installed ${manifest.name} ${manifest.version ?? catalogPkg.version ?? "0.0.0"} (${finalLabel})`);
}
