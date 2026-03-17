/**
 * Copy package assets (skills, rules) to project agent directory.
 * Programs (tar.gz/bin) extraction is TODO.
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

/** Patch {bundle_name} placeholders in markdown content. Feature 3: docs/features/3-package-install-process.md */
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

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Copy asset file from package dir to agent dir or bin dir. Creates target dirs as needed. */
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

/** Copy all markdown/assets from manifest to agent directory. */
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
