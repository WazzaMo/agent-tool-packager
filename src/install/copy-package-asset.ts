/**
 * Copy one manifest asset (program, MCP merge, hooks merge, markdown with placeholders).
 */

import fs from "node:fs";
import path from "node:path";

import { mergeHooksJsonDocument } from "../file-ops/hooks-merge/hooks-json-merge.js";
import { formatJsonDocument } from "../file-ops/mcp-merge/mcp-json-helpers.js";
import { mergeConfigTargetLabel } from "../file-ops/merge-config-target-label.js";
import { mergeMcpJsonDocument } from "../file-ops/mcp-merge/mcp-json-merge.js";

import {
  agentDestinationForAsset,
  patchMarkdownBundlePlaceholders,
  type LegacyClaudeMergeContext,
} from "./copy-asset-support.js";

import type { PackageAsset } from "./types.js";

function copyMcpAssetToAgent(
  pkgDir: string,
  agentBase: string,
  asset: PackageAsset,
  mcpMerge: { forceConfig: boolean; skipConfig: boolean } | undefined,
  onFileCopied?: (destAbsolute: string) => void,
  legacyClaude?: LegacyClaudeMergeContext
): void {
  const srcPath = path.join(pkgDir, asset.path);
  if (!fs.existsSync(srcPath)) return;
  const raw = fs.readFileSync(srcPath, "utf8");
  let incoming: unknown;
  try {
    incoming = JSON.parse(raw) as unknown;
  } catch (e) {
    const err = e as SyntaxError;
    throw new Error(`Invalid JSON in MCP asset ${asset.path}: ${err.message}`);
  }
  const destPath = legacyClaude
    ? path.join(legacyClaude.projectRoot, ".mcp.json")
    : path.join(agentBase, "mcp.json");
  const destDir = path.dirname(destPath);
  const existing = fs.existsSync(destPath)
    ? (JSON.parse(fs.readFileSync(destPath, "utf8")) as unknown)
    : null;
  const mergeLabel = legacyClaude
    ? ".mcp.json"
    : mergeConfigTargetLabel(agentBase, "mcp.json");
  const outcome = mergeMcpJsonDocument(existing, incoming, {
    forceConfig: mcpMerge?.forceConfig ?? false,
    skipConfig: mcpMerge?.skipConfig ?? false,
    mergeTargetLabel: mergeLabel,
  });
  if (outcome.status === "applied") {
    fs.mkdirSync(destDir, { recursive: true });
    fs.writeFileSync(destPath, formatJsonDocument(outcome.document), "utf8");
    onFileCopied?.(destPath);
  }
}

function mergeClaudeHooksAssetFromPackage(
  pkgDir: string,
  asset: PackageAsset,
  claudeAgentDir: string,
  mcpMerge: { forceConfig: boolean; skipConfig: boolean } | undefined,
  onFileCopied?: (destAbsolute: string) => void
): void {
  const srcPath = path.join(pkgDir, asset.path);
  if (!fs.existsSync(srcPath)) return;
  let incoming: unknown;
  try {
    incoming = JSON.parse(fs.readFileSync(srcPath, "utf8")) as unknown;
  } catch (e) {
    const err = e as SyntaxError;
    throw new Error(`Invalid JSON in hook asset ${asset.path}: ${err.message}`);
  }
  const settingsPath = path.join(claudeAgentDir, "settings.json");
  const existing = fs.existsSync(settingsPath)
    ? (JSON.parse(fs.readFileSync(settingsPath, "utf8")) as unknown)
    : null;
  const mergeLabel = mergeConfigTargetLabel(claudeAgentDir, "settings.json");
  const { document, changed } = mergeHooksJsonDocument(existing, incoming, {
    forceConfig: mcpMerge?.forceConfig ?? false,
    skipConfig: mcpMerge?.skipConfig ?? false,
    mergeTargetLabel: mergeLabel,
  });
  if (changed) {
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(settingsPath, formatJsonDocument(document), "utf8");
    onFileCopied?.(settingsPath);
  }
}

/**
 * Copy a single asset from package dir to agent dir or bin dir.
 * Patches placeholders in markdown skills/rules. Creates target dirs as needed.
 *
 * @param pkgDir - Package directory.
 * @param agentBase - Agent base path (e.g. .cursor/).
 * @param asset - Asset definition from manifest.
 * @param bundlePathMap - Optional map for {bundle_name} patching.
 * @param installBinDir - Optional bin directory for program assets.
 */
export function copyPackageAsset(
  pkgDir: string,
  agentBase: string,
  asset: PackageAsset,
  bundlePathMap?: Record<string, string>,
  installBinDir?: string,
  onFileCopied?: (destAbsolute: string) => void,
  mcpMerge?: { forceConfig: boolean; skipConfig: boolean },
  legacyClaude?: LegacyClaudeMergeContext
): void {
  if (asset.type === "program") {
    if (!installBinDir) return;
    const srcPath = path.join(pkgDir, asset.path);
    if (!fs.existsSync(srcPath)) return;
    fs.mkdirSync(installBinDir, { recursive: true });
    const baseName = path.basename(asset.path);
    const destPath = path.join(installBinDir, baseName);
    fs.copyFileSync(srcPath, destPath);
    onFileCopied?.(destPath);
    return;
  }

  if (asset.type === "mcp") {
    copyMcpAssetToAgent(pkgDir, agentBase, asset, mcpMerge, onFileCopied, legacyClaude);
    return;
  }

  if (
    legacyClaude &&
    asset.type === "hook" &&
    path.basename(asset.path) === "hooks.json"
  ) {
    mergeClaudeHooksAssetFromPackage(
      pkgDir,
      asset,
      legacyClaude.claudeAgentDir,
      mcpMerge ?? { forceConfig: false, skipConfig: false },
      onFileCopied
    );
    return;
  }

  const { dir: targetDir, filePath: destPath } = agentDestinationForAsset(agentBase, asset);

  const srcPath = path.join(pkgDir, asset.path);
  if (!fs.existsSync(srcPath)) return;

  fs.mkdirSync(targetDir, { recursive: true });

  const isMarkdown =
    asset.type === "skill" ||
    asset.type === "rule" ||
    asset.type === "prompt" ||
    asset.type === "sub-agent";
  if (isMarkdown && bundlePathMap && Object.keys(bundlePathMap).length > 0) {
    const content = fs.readFileSync(srcPath, "utf8");
    const patched = patchMarkdownBundlePlaceholders(content, bundlePathMap);
    fs.writeFileSync(destPath, patched, "utf8");
    onFileCopied?.(destPath);
  } else {
    fs.copyFileSync(srcPath, destPath);
    onFileCopied?.(destPath);
  }
}
