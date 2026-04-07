/**
 * Remove package from project Safehouse.
 * Deletes from manifest, binaries/share, and agent skill/rule copies.
 */

import fs from "node:fs";
import path from "node:path";

import { resolveAgentProjectPath } from "../config/agent-path.js";
import {
  safehouseExists,
  loadSafehouseConfig,
  loadStationConfig,
  loadSafehouseList,
} from "../config/load.js";
import {
  loadPackageConfigJournalEntries,
  rollbackMergedConfigJournal,
} from "../config/config-merge-journal.js";
import { getSafehousePath, expandHome, pathExists } from "../config/paths.js";
import {
  loadSafehouseManifest,
  removePackageFromSafehouseManifest,
  loadSafehouseManifestFromPath,
} from "../config/safehouse-manifest.js";
import { removeHookHandlersFromDocument } from "../file-ops/hooks-merge/cursor-hooks-json-merge.js";
import {
  formatJsonDocument,
  normalizeMcpServersPayload,
} from "../file-ops/mcp-merge/mcp-json-helpers.js";
import { removeMcpServersByNamesFromDocument } from "../file-ops/mcp-merge/remove-mcp-servers.js";
import { agentProviderRemovalDestination } from "../install/copy-assets.js";
import { removeProviderSkillBundleTrees } from "../provider/skill/remove-skill-bundles.js";
import {
  resolvePackage,
  resolvePackagePath,
  loadPackageManifest,
} from "../install/resolve.js";

import type { PackageAsset } from "../install/types.js";

const LOCAL_BIN = "~/.local/bin";
const LOCAL_SHARE = "~/.local/share";
const LOCAL_ETC = "~/.local/etc";

/**
 * Absolute path to the user's `~/.local/bin` directory.
 *
 * @returns Resolved bin directory.
 */
function getLocalBinPath(): string {
  return path.join(expandHome(LOCAL_BIN));
}

/**
 * Absolute path to the user's `~/.local/share` root.
 *
 * @returns Resolved share root.
 */
function getLocalSharePath(): string {
  return path.join(expandHome(LOCAL_SHARE));
}

/**
 * Absolute path to the user's `~/.local/etc` root.
 *
 * @returns Resolved etc root.
 */
function getLocalEtcPath(): string {
  return path.join(expandHome(LOCAL_ETC));
}

/**
 * Remove user-wide binaries/share for `pkgName` when no other registered Safehouse still uses `user-bin`.
 *
 * @param pkgName - Package name.
 * @param currentCwd - Project base whose Safehouse path is excluded from the "still in use" scan.
 */
function removeUserBinariesIfUnused(pkgName: string, currentCwd: string): void {
  const safehousePaths = loadSafehouseList();
  const others = safehousePaths.filter(
    (p) => path.resolve(p) !== path.resolve(getSafehousePath(currentCwd))
  );

  let inUse = false;
  for (const shPath of others) {
    const manifest = loadSafehouseManifestFromPath(shPath);
    if (
      manifest?.packages?.some(
        (p) => p.name === pkgName && p.binary_scope === "user-bin"
      )
    ) {
      inUse = true;
      break;
    }
  }

  if (!inUse) {
    const localBin = getLocalBinPath();
    const shareDir = path.join(getLocalSharePath(), pkgName);
    const etcDir = path.join(getLocalEtcPath(), pkgName);

    if (pathExists(shareDir)) {
      fs.rmSync(shareDir, { recursive: true });
    }
    if (pathExists(etcDir)) {
      fs.rmSync(etcDir, { recursive: true });
    }

    const binFile = path.join(localBin, pkgName);
    if (fs.existsSync(binFile) && fs.statSync(binFile).isFile()) {
      fs.unlinkSync(binFile);
    }
    console.log(`Removed shared binaries for ${pkgName} as they are no longer in use.`);
  } else {
    console.log(`Shared binaries for ${pkgName} kept as they are still in use by other projects.`);
  }
}

function readJsonConfigFile(filePath: string): unknown | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw) as unknown;
  } catch {
    console.warn(`ATP: skipping structured config rollback for ${filePath}: invalid or unreadable JSON.`);
    return null;
  }
}

/**
 * Relative path under the agent project directory for merged MCP JSON (varies by agent).
 */
function mergedMcpConfigRelativePath(agentName: string): string {
  return agentName.trim().toLowerCase() === "gemini" ? "settings.json" : "mcp.json";
}

/**
 * Relative path under the agent project directory for merged hooks JSON (varies by agent).
 */
function mergedHooksConfigRelativePath(agentName: string): string {
  return agentName.trim().toLowerCase() === "gemini" ? "settings.json" : "hooks.json";
}

/**
 * Remove MCP server keys that this package added (merge rollback), without deleting the config file.
 */
function stripMcpServersFromAgentForPackage(
  agentBase: string,
  pkgDir: string,
  assetPath: string,
  destConfigRelative: string = "mcp.json"
): void {
  const srcPath = path.join(pkgDir, assetPath);
  if (!fs.existsSync(srcPath)) {
    console.warn(
      `ATP: package MCP asset missing at ${assetPath}; skipping mcp.json rollback for that asset.`
    );
    return;
  }
  let payload: unknown;
  try {
    payload = JSON.parse(fs.readFileSync(srcPath, "utf8")) as unknown;
  } catch {
    console.warn(`ATP: invalid JSON in package MCP asset ${assetPath}; skipping mcp.json rollback.`);
    return;
  }
  let serverNames: string[];
  try {
    serverNames = Object.keys(normalizeMcpServersPayload(payload).mcpServers);
  } catch {
    console.warn(`ATP: package MCP asset ${assetPath} is not a valid mcpServers payload; skipping rollback.`);
    return;
  }
  if (serverNames.length === 0) {
    return;
  }

  const destPath = path.join(agentBase, destConfigRelative);
  const existing = readJsonConfigFile(destPath);
  if (existing === null) {
    return;
  }

  const { document, changed } = removeMcpServersByNamesFromDocument(existing, serverNames);
  if (!changed) {
    return;
  }
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, formatJsonDocument(document), "utf8");
}

/**
 * Remove hook handlers that match the package `hooks.json` payload (merge rollback).
 */
function stripHooksJsonFromAgentForPackage(
  agentBase: string,
  pkgDir: string,
  assetPath: string,
  destConfigRelative: string = "hooks.json"
): void {
  const srcPath = path.join(pkgDir, assetPath);
  if (!fs.existsSync(srcPath)) {
    console.warn(
      `ATP: package hooks asset missing at ${assetPath}; skipping hooks.json rollback for that asset.`
    );
    return;
  }
  let pkgHooks: unknown;
  try {
    pkgHooks = JSON.parse(fs.readFileSync(srcPath, "utf8")) as unknown;
  } catch {
    console.warn(`ATP: invalid JSON in package hooks asset ${assetPath}; skipping hooks.json rollback.`);
    return;
  }

  const destPath = path.join(agentBase, destConfigRelative);
  const existing = readJsonConfigFile(destPath);
  if (existing === null) {
    return;
  }

  const { document, changed } = removeHookHandlersFromDocument(existing, pkgHooks);
  if (!changed) {
    return;
  }
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, formatJsonDocument(document), "utf8");
}

/**
 * Delete skill/rule copies under the configured agent directory for listed assets.
 *
 * @param projectBase - Project root.
 * @param pkgName - Package name (unused today; reserved for logging).
 * @param assets - Manifest assets to remove from the agent tree.
 * @param pkgDir - Extracted package directory (for merge rollback of `mcp.json` / `hooks.json`).
 */
function removeAgentCopies(
  projectBase: string,
  _pkgName: string,
  assets: PackageAsset[],
  pkgDir?: string,
  skipMcpHooksFragmentStrip?: boolean
): void {
  const config = loadSafehouseConfig(projectBase);
  const stationConfig = loadStationConfig();
  const agentName = config?.agent ?? "cursor";
  const projectPath = resolveAgentProjectPath(agentName, stationConfig);
  const agentBase = path.join(projectBase, projectPath);
  const mcpRollbackFile = mergedMcpConfigRelativePath(agentName);
  const hooksRollbackFile = mergedHooksConfigRelativePath(agentName);
  const agentKey = agentName.trim().toLowerCase();

  if ((agentKey === "cursor" || agentKey === "gemini") && pkgDir) {
    removeProviderSkillBundleTrees(agentBase, pkgDir, assets);
  }

  let warnedMissingPkgDir = false;

  for (const asset of assets) {
    if (asset.type === "program") continue;

    if (asset.type === "skill" && (agentKey === "cursor" || agentKey === "gemini")) {
      continue;
    }

    if (asset.type === "mcp") {
      if (skipMcpHooksFragmentStrip) {
        continue;
      }
      if (pkgDir) {
        stripMcpServersFromAgentForPackage(agentBase, pkgDir, asset.path, mcpRollbackFile);
      } else if (!warnedMissingPkgDir) {
        warnedMissingPkgDir = true;
        console.warn(
          "ATP: package directory unavailable; skipping MCP and hooks.json merge rollback (merged config files left unchanged)."
        );
      }
      continue;
    }

    if (asset.type === "hook" && path.basename(asset.path) === "hooks.json") {
      if (skipMcpHooksFragmentStrip) {
        continue;
      }
      if (pkgDir) {
        stripHooksJsonFromAgentForPackage(agentBase, pkgDir, asset.path, hooksRollbackFile);
      } else if (!warnedMissingPkgDir) {
        warnedMissingPkgDir = true;
        console.warn(
          "ATP: package directory unavailable; skipping MCP and hooks.json merge rollback (merged config files left unchanged)."
        );
      }
      continue;
    }

    const { filePath: destPath } = agentProviderRemovalDestination(agentName, agentBase, asset);

    if (fs.existsSync(destPath)) {
      try {
        fs.unlinkSync(destPath);
      } catch (err) {
        console.warn(`Could not remove ${destPath}:`, err);
      }
    }
  }
}

/**
 * Remove project-scoped `share/`, `etc/`, and named binary under the Safehouse tree.
 *
 * @param safehousePath - Path to `.atp_safehouse`.
 * @param utility - Package name used as subdirectory / binary stem.
 */
function removeSafehouseBinariesAndShare(
  safehousePath: string,
  utility: string
): void {
  const shareDir = path.join(safehousePath, "share", utility);
  const etcDir = path.join(safehousePath, "etc", utility);
  const binDir = path.join(safehousePath, "bin");

  if (fs.existsSync(shareDir)) {
    fs.rmSync(shareDir, { recursive: true });
  }
  if (fs.existsSync(etcDir)) {
    fs.rmSync(etcDir, { recursive: true });
  }

  // Best-effort: remove binary with package name if it exists
  const binFile = path.join(binDir, utility);
  if (fs.existsSync(binFile) && fs.statSync(binFile).isFile()) {
    fs.unlinkSync(binFile);
  }
}

/**
 * Remove a package from the project Safehouse manifest and clean up installed files.
 *
 * @param pkgName - Package name as recorded in the manifest.
 * @param cwd - Project base directory; defaults to `process.cwd()`.
 */
export function removeSafehousePackage(
  pkgName: string,
  cwd: string = process.cwd()
): void {
  if (!safehouseExists(cwd)) {
    console.error("No Safehouse found. Run `atp safehouse init` first.");
    process.exit(1);
  }

  const manifest = loadSafehouseManifest(cwd);
  const packages = manifest?.packages ?? [];
  const found = packages.find((p) => p.name === pkgName);

  if (!found) {
    console.error(`Package ${pkgName} is not installed in this Safehouse.`);
    process.exit(1);
  }

  const safehousePath = getSafehousePath(cwd);
  const stationConfig = loadStationConfig();
  const shConfig = loadSafehouseConfig(cwd);
  const agentName = shConfig?.agent ?? "cursor";
  const agentBaseForJournal = path.join(cwd, resolveAgentProjectPath(agentName, stationConfig));

  let skipMcpHooksFragmentStrip = false;
  if (found.config_journal_path) {
    const journalEntries = loadPackageConfigJournalEntries(
      safehousePath,
      found.config_journal_path
    );
    if (journalEntries.length > 0) {
      const warnings = rollbackMergedConfigJournal(agentBaseForJournal, journalEntries);
      for (const w of warnings) {
        console.warn(w);
      }
      skipMcpHooksFragmentStrip = true;
    }
  }

  // Remove skill/rule copies - need package manifest for asset list
  const catalogPkg = resolvePackage(pkgName, cwd);
  if (catalogPkg) {
    const pkgDir = resolvePackagePath(catalogPkg.location, cwd);
    if (pkgDir) {
      const pkgManifest = loadPackageManifest(pkgDir);
      if (pkgManifest?.assets) {
        removeAgentCopies(
          cwd,
          pkgName,
          pkgManifest.assets,
          pkgDir,
          skipMcpHooksFragmentStrip
        );
      }
    }
  } else {
    console.warn(
      `Package ${pkgName} not found in catalog; skipping skill/rule cleanup.`
    );
  }

  if (found.binary_scope === "user-bin") {
    removeUserBinariesIfUnused(pkgName, cwd);
  } else if (found.binary_scope === "project-bin") {
    removeSafehouseBinariesAndShare(safehousePath, pkgName);
  } else {
    // Default/fallback: just try both if scope unknown
    removeUserBinariesIfUnused(pkgName, cwd);
    removeSafehouseBinariesAndShare(safehousePath, pkgName);
  }

  removePackageFromSafehouseManifest(pkgName, cwd);

  console.log(`Removed ${pkgName} from Safehouse.`);
}
