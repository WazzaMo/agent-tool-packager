/**
 * Copy package assets (skills, rules, programs) to project agent directory.
 * Programs are copied to user-bin (~/.local/bin) or project-bin (.atp_safehouse/{pkg}-exec/bin).
 * Patches {bundle_name} placeholders in markdown per Feature 3.
 */

import fs from "node:fs";
import path from "node:path";

import { formatJsonDocument } from "../file-ops/mcp-merge/mcp-json-helpers.js";
import { mergeConfigTargetLabel } from "../file-ops/merge-config-target-label.js";
import { mergeMcpJsonDocument } from "../file-ops/mcp-merge/mcp-json-merge.js";

import type { PackageAsset, PackageManifest } from "./types.js";

const ASSET_TYPES_TO_AGENT_SUBDIR: Record<string, string> = {
  skill: "skills",
  rule: "rules",
  prompt: "prompts",
  "sub-agent": "rules",
  program: "bin",
};

/**
 * Resolve destination directory and file path for a non-program asset under the agent tree.
 * Hook packages follow Cursor layout: `hooks.json` at the agent root, other files under `hooks/`.
 *
 * @param agentBase - Agent project directory (e.g. `.cursor/`).
 * @param asset - Asset row (must not be `program`).
 * @returns Parent directory to create and final file path.
 */
export function agentDestinationForAsset(
  agentBase: string,
  asset: Pick<PackageAsset, "type" | "path">
): { dir: string; filePath: string } {
  const baseName = path.basename(asset.path);
  if (asset.type === "mcp") {
    return { dir: agentBase, filePath: path.join(agentBase, "mcp.json") };
  }
  if (asset.type === "hook") {
    if (baseName === "hooks.json") {
      return { dir: agentBase, filePath: path.join(agentBase, "hooks.json") };
    }
    const dir = path.join(agentBase, "hooks");
    return { dir, filePath: path.join(dir, baseName) };
  }
  const subdir = ASSET_TYPES_TO_AGENT_SUBDIR[asset.type] ?? "skills";
  const dir = path.join(agentBase, subdir);
  return { dir, filePath: path.join(dir, baseName) };
}

/**
 * Uninstall path for files written by Cursor / Gemini {@link AgentProvider} (project layer).
 * Does not remove merged JSON wholesale (handled via journal / fragment strip) or provider skill trees.
 *
 * @param agentName - Safehouse agent key (e.g. `cursor`, `gemini`).
 * @param agentBase - Absolute agent project directory.
 * @param asset - Manifest row (not `program`).
 */
export function agentProviderRemovalDestination(
  agentName: string,
  agentBase: string,
  asset: Pick<PackageAsset, "type" | "path">
): { filePath: string } {
  const baseName = path.basename(asset.path);
  const agent = agentName.trim().toLowerCase();

  if (asset.type === "mcp") {
    const file = agent === "gemini" ? "settings.json" : "mcp.json";
    return { filePath: path.join(agentBase, file) };
  }
  if (asset.type === "hook") {
    if (baseName === "hooks.json") {
      const file = agent === "gemini" ? "settings.json" : "hooks.json";
      return { filePath: path.join(agentBase, file) };
    }
    return { filePath: path.join(agentBase, "hooks", baseName) };
  }

  if (agent === "gemini") {
    if (asset.type === "prompt") {
      return { filePath: path.join(agentBase, "prompts", baseName) };
    }
    if (asset.type === "sub-agent") {
      return { filePath: path.join(agentBase, "rules", baseName) };
    }
    if (asset.type === "rule") {
      if (baseName.toLowerCase().endsWith(".toml")) {
        return { filePath: path.join(agentBase, "commands", baseName) };
      }
      return { filePath: path.join(agentBase, "rules", baseName) };
    }
  }

  return agentDestinationForAsset(agentBase, asset);
}

/**
 * Patch {bundle_name} placeholders in markdown content.
 * Feature 3: replaces {bundle_name} with absolute install path for executables.
 *
 * @param content - Markdown or text content.
 * @param bundlePathMap - Map of bundle name to install path.
 * @returns Content with placeholders replaced (unchanged when map empty).
 */
export function patchMarkdownBundlePlaceholders(
  content: string,
  bundlePathMap?: Record<string, string>
): string {
  if (!bundlePathMap || Object.keys(bundlePathMap).length === 0) {
    return content;
  }
  let result = content;
  for (const [name, installPath] of Object.entries(bundlePathMap)) {
    result = result.replace(new RegExp(`\\{${escapeRegExp(name)}\\}`, "g"), installPath);
  }
  return result;
}

/**
 * Escape special regex characters for safe use in `RegExp` construction.
 *
 * @param s - Raw placeholder fragment or string.
 * @returns Escaped string safe to embed in a character class or pattern.
 */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function copyMcpAssetToAgent(
  pkgDir: string,
  agentBase: string,
  asset: PackageAsset,
  mcpMerge: { forceConfig: boolean; skipConfig: boolean } | undefined,
  onFileCopied?: (destAbsolute: string) => void
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
  const destPath = path.join(agentBase, "mcp.json");
  const existing = fs.existsSync(destPath)
    ? (JSON.parse(fs.readFileSync(destPath, "utf8")) as unknown)
    : null;
  const outcome = mergeMcpJsonDocument(existing, incoming, {
    forceConfig: mcpMerge?.forceConfig ?? false,
    skipConfig: mcpMerge?.skipConfig ?? false,
    mergeTargetLabel: mergeConfigTargetLabel(agentBase, "mcp.json"),
  });
  if (outcome.status === "applied") {
    fs.mkdirSync(agentBase, { recursive: true });
    fs.writeFileSync(destPath, formatJsonDocument(outcome.document), "utf8");
    onFileCopied?.(destPath);
  }
}

/**
 * Copy a single asset from package dir to agent dir or bin dir.
 * Patches placeholders in markdown skills/rules. Creates target dirs as needed.
 * @param pkgDir - Package directory.
 * @param agentBase - Agent base path (e.g. .cursor/).
 * @param asset - Asset definition from manifest.
 * @param bundlePathMap - Optional map for {bundle_name} patching.
 * @param installBinDir - Optional bin directory for program assets.
 */
function copyAsset(
  pkgDir: string,
  agentBase: string,
  asset: PackageAsset,
  bundlePathMap?: Record<string, string>,
  installBinDir?: string,
  onFileCopied?: (destAbsolute: string) => void,
  mcpMerge?: { forceConfig: boolean; skipConfig: boolean }
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
    copyMcpAssetToAgent(pkgDir, agentBase, asset, mcpMerge, onFileCopied);
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

/**
 * Copy all assets from manifest to agent directory (skills, rules) and optionally to bin.
 *
 * @param pkgDir - Package directory.
 * @param manifest - Package manifest with assets.
 * @param agentBase - Agent base path.
 * @param bundlePathMap - Optional map for `{bundle_name}` placeholder patching.
 * @param installBinDir - Optional bin directory for program assets.
 * @param onFileCopied - Optional hook for each file written (used for install rollback).
 */
export function copyPackageAssets(
  pkgDir: string,
  manifest: PackageManifest,
  agentBase: string,
  bundlePathMap?: Record<string, string>,
  installBinDir?: string,
  onFileCopied?: (destAbsolute: string) => void,
  mcpMerge?: { forceConfig: boolean; skipConfig: boolean }
): void {
  const assets = manifest.assets ?? [];
  for (const asset of assets) {
    copyAsset(pkgDir, agentBase, asset, bundlePathMap, installBinDir, onFileCopied, mcpMerge);
  }
}

/**
 * Copy only `program` assets from the manifest (used after {@link CursorAgentProvider} handles the rest).
 *
 * @param pkgDir - Package extract directory.
 * @param manifest - Catalog manifest with `assets`.
 * @param installBinDir - Destination for executables.
 * @param onFileCopied - Optional rollback hook.
 */
export function copyProgramAssetsOnly(
  pkgDir: string,
  manifest: PackageManifest,
  installBinDir: string | undefined,
  onFileCopied?: (destAbsolute: string) => void
): void {
  const assets = manifest.assets ?? [];
  for (const asset of assets) {
    if (asset.type === "program") {
      copyAsset(pkgDir, "", asset, undefined, installBinDir, onFileCopied);
    }
  }
}
