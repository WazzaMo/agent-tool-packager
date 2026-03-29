/**
 * Copy package assets (skills, rules, programs) to project agent directory.
 * Programs are copied to user-bin (~/.local/bin) or project-bin (.atp_safehouse/{pkg}-exec/bin).
 * Patches {bundle_name} placeholders in markdown per Feature 3.
 */

import fs from "node:fs";
import path from "node:path";
import type { PackageAsset, PackageManifest } from "./types.js";

const ASSET_TYPES_TO_AGENT_SUBDIR: Record<string, string> = {
  skill: "skills",
  rule: "rules",
  "sub-agent": "rules",
  program: "bin",
};

/**
 * Patch {bundle_name} placeholders in markdown content.
 * Feature 3: replaces {bundle_name} with absolute install path for executables.
 * @param content - Markdown or text content.
 * @param bundlePathMap - Map of bundle name to install path.
 * @returns Content with placeholders replaced.
 */
function patchPlaceholders(
  content: string,
  bundlePathMap: Record<string, string>
): string {
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
  installBinDir?: string
): void {
  if (asset.type === "program") {
    if (!installBinDir) return;
    const srcPath = path.join(pkgDir, asset.path);
    if (!fs.existsSync(srcPath)) return;
    fs.mkdirSync(installBinDir, { recursive: true });
    const baseName = path.basename(asset.path);
    const destPath = path.join(installBinDir, baseName);
    fs.copyFileSync(srcPath, destPath);
    return;
  }

  const subdir = ASSET_TYPES_TO_AGENT_SUBDIR[asset.type] ?? "skills";
  const targetDir = path.join(agentBase, subdir);

  const srcPath = path.join(pkgDir, asset.path);
  if (!fs.existsSync(srcPath)) return;

  fs.mkdirSync(targetDir, { recursive: true });
  const baseName = path.basename(asset.path);
  const destPath = path.join(targetDir, baseName);

  const isMarkdown = asset.type === "skill" || asset.type === "rule" || asset.type === "sub-agent";
  if (isMarkdown && bundlePathMap && Object.keys(bundlePathMap).length > 0) {
    const content = fs.readFileSync(srcPath, "utf8");
    const patched = patchPlaceholders(content, bundlePathMap);
    fs.writeFileSync(destPath, patched, "utf8");
  } else {
    fs.copyFileSync(srcPath, destPath);
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
 */
export function copyPackageAssets(
  pkgDir: string,
  manifest: PackageManifest,
  agentBase: string,
  bundlePathMap?: Record<string, string>,
  installBinDir?: string
): void {
  const assets = manifest.assets ?? [];
  for (const asset of assets) {
    copyAsset(pkgDir, agentBase, asset, bundlePathMap, installBinDir);
  }
}
