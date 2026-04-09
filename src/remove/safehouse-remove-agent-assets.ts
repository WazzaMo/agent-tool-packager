/**
 * Strip merged MCP / hooks config and delete agent file copies during Safehouse package removal.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { resolveAgentProjectPath } from "../config/agent-path.js";
import { loadSafehouseConfig, loadStationConfig } from "../config/load.js";
import { removeHookHandlersFromDocument } from "../file-ops/hooks-merge/hooks-json-merge.js";
import {
  formatJsonDocument,
  normalizeMcpServersPayload,
} from "../file-ops/mcp-merge/mcp-json-helpers.js";
import { removeMcpServerNamesFromCodexConfigToml } from "../file-ops/mcp-merge/mcp-codex-toml-merge.js";
import { removeMcpServersByNamesFromDocument } from "../file-ops/mcp-merge/remove-mcp-servers.js";
import { agentProviderRemovalDestination } from "../install/copy-assets.js";
import { removeProviderSkillBundleTrees } from "../provider/skill/remove-skill-bundles.js";

import type { PackageAsset } from "../install/types.js";

const MERGE_ROLLBACK_SKIP_MSG =
  "ATP: package directory unavailable; skipping MCP and hooks.json merge rollback (merged config files left unchanged).";

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
  const k = agentName.trim().toLowerCase();
  if (k === "gemini") {
    return "settings.json";
  }
  if (k === "codex") {
    return "config.toml";
  }
  return "mcp.json";
}

/**
 * Relative path under the agent project directory for merged hooks JSON (varies by agent).
 */
function mergedHooksConfigRelativePath(agentName: string): string {
  const k = agentName.trim().toLowerCase();
  if (k === "gemini" || k === "claude") {
    return "settings.json";
  }
  return "hooks.json";
}

/**
 * Remove MCP server keys that this package added (merge rollback), without deleting the config file.
 *
 * @param mergeRoot - Directory containing the merged JSON (agent layer or project root for Claude `.mcp.json`).
 */
function stripMcpServersFromAgentForPackage(
  mergeRoot: string,
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

  const destPath = path.join(mergeRoot, destConfigRelative);
  if (destPath.toLowerCase().endsWith(".toml")) {
    if (!fs.existsSync(destPath)) {
      return;
    }
    const raw = fs.readFileSync(destPath, "utf8");
    try {
      const { content, changed } = removeMcpServerNamesFromCodexConfigToml(raw, serverNames);
      if (!changed) {
        return;
      }
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.writeFileSync(destPath, content, "utf8");
    } catch (e) {
      console.warn(
        `ATP: skipping Codex config.toml MCP rollback for ${destConfigRelative}: ${(e as Error).message}`
      );
    }
    return;
  }

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

function warnMergeRollbackSkippedOnce(state: { warned: boolean }): void {
  if (state.warned) {
    return;
  }
  state.warned = true;
  console.warn(MERGE_ROLLBACK_SKIP_MSG);
}

function removeProviderSkillBundlesIfNeeded(
  agentKey: string,
  agentBase: string,
  projectBase: string,
  pkgDir: string,
  assets: PackageAsset[]
): void {
  if (!pkgDir) {
    return;
  }
  if (agentKey === "cursor" || agentKey === "gemini" || agentKey === "claude") {
    removeProviderSkillBundleTrees(agentBase, pkgDir, assets);
    return;
  }
  if (agentKey === "codex") {
    removeProviderSkillBundleTrees(agentBase, pkgDir, assets, {
      projectBase,
      skillsParentRelative: ".agents/skills",
    });
  }
}

function stripMcpMergeRollbackForAsset(
  agentKey: string,
  projectBase: string,
  agentBase: string,
  pkgDir: string,
  assetPath: string,
  mcpRollbackFile: string
): void {
  const mcpMergeRoot = agentKey === "claude" ? projectBase : agentBase;
  const mcpRelative = agentKey === "claude" ? ".mcp.json" : mcpRollbackFile;
  stripMcpServersFromAgentForPackage(mcpMergeRoot, pkgDir, assetPath, mcpRelative);
  if (agentKey === "claude") {
    stripMcpServersFromAgentForPackage(os.homedir(), pkgDir, assetPath, ".claude.json");
  }
}

/**
 * Delete skill/rule copies under the configured agent directory for listed assets.
 *
 * @param projectBase - Project root.
 * @param _pkgName - Package name (unused today; reserved for logging).
 * @param assets - Manifest assets to remove from the agent tree.
 * @param pkgDir - Extracted package directory (for merge rollback of `mcp.json` / `hooks.json`).
 */
export function removeAgentCopies(
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

  removeProviderSkillBundlesIfNeeded(agentKey, agentBase, projectBase, pkgDir ?? "", assets);

  const warnState = { warned: false };

  for (const asset of assets) {
    if (asset.type === "program") continue;

    if (
      asset.type === "skill" &&
      (agentKey === "cursor" || agentKey === "gemini" || agentKey === "claude" || agentKey === "codex")
    ) {
      continue;
    }

    if (asset.type === "mcp") {
      if (skipMcpHooksFragmentStrip) {
        continue;
      }
      if (pkgDir) {
        stripMcpMergeRollbackForAsset(
          agentKey,
          projectBase,
          agentBase,
          pkgDir,
          asset.path,
          mcpRollbackFile
        );
      } else {
        warnMergeRollbackSkippedOnce(warnState);
      }
      continue;
    }

    if (asset.type === "hook" && path.basename(asset.path) === "hooks.json") {
      if (skipMcpHooksFragmentStrip) {
        continue;
      }
      if (pkgDir) {
        stripHooksJsonFromAgentForPackage(agentBase, pkgDir, asset.path, hooksRollbackFile);
      } else {
        warnMergeRollbackSkippedOnce(warnState);
      }
      continue;
    }

    unlinkAgentAssetIfPresent(agentName, agentBase, asset);
  }
}

function unlinkAgentAssetIfPresent(
  agentName: string,
  agentBase: string,
  asset: PackageAsset
): void {
  const { filePath: destPath } = agentProviderRemovalDestination(agentName, agentBase, asset);
  if (!fs.existsSync(destPath)) {
    return;
  }
  try {
    fs.unlinkSync(destPath);
  } catch (err) {
    console.warn(`Could not remove ${destPath}:`, err);
  }
}
