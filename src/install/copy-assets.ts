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

/** Copy asset file from package dir to agent dir. Creates target dirs as needed. */
function copyAsset(
  pkgDir: string,
  agentBase: string,
  asset: PackageAsset
): void {
  const subdir = ASSET_TYPES_TO_AGENT_SUBDIR[asset.type] ?? "skills";
  const targetDir = path.join(agentBase, subdir);

  if (asset.type === "program") {
    // TODO: tar.gz extraction for MCP servers / binaries
    return;
  }

  const srcPath = path.join(pkgDir, asset.path);
  if (!fs.existsSync(srcPath)) return;

  fs.mkdirSync(targetDir, { recursive: true });
  const baseName = path.basename(asset.path);
  const destPath = path.join(targetDir, baseName);
  fs.copyFileSync(srcPath, destPath);
}

/** Copy all markdown/assets from manifest to agent directory. */
export function copyPackageAssets(
  pkgDir: string,
  manifest: PackageManifest,
  agentBase: string
): void {
  const assets = manifest.assets ?? [];
  for (const asset of assets) {
    copyAsset(pkgDir, agentBase, asset);
  }
}
