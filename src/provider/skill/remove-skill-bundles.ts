/**
 * Remove Agent Skills directories created under `{agentBase}/skills/{name}/` by provider install.
 */

import fs from "node:fs";
import path from "node:path";

import { patchMarkdownBundlePlaceholders } from "../../install/copy-assets.js";
import type { PackageAsset } from "../../install/types.js";

import { finalizeSkillMdContent } from "./finalize-skill-md.js";
import { resolvePrimarySkillSource } from "./resolve-primary-skill-source.js";
import { resolveSkillBundleRoot, toPosixPath } from "./skill-bundle-root.js";

function partitionSkillAssetsByPartPrefix(assets: PackageAsset[]): PackageAsset[][] {
  const skills = assets.filter((a) => a.type === "skill");
  if (skills.length === 0) {
    return [];
  }
  const groups = new Map<string, PackageAsset[]>();
  for (const a of skills) {
    const posix = toPosixPath(a.path);
    const m = posix.match(/^(part_\d+_[^/]+)\//);
    const key = m?.[1] ?? "__root__";
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(a);
  }
  return [...groups.values()];
}

/**
 * Best-effort removal of provider-style skill trees for Cursor / Gemini project installs.
 *
 * @param agentBase - Absolute agent project directory (e.g. `.cursor` or `.gemini`).
 * @param pkgDir - Extracted package directory (same layout as at install).
 * @param assets - Full manifest asset list (non-skill rows ignored).
 */
export function removeProviderSkillBundleTrees(
  agentBase: string,
  pkgDir: string,
  assets: PackageAsset[]
): void {
  for (const group of partitionSkillAssetsByPartPrefix(assets)) {
    const paths = group.map((a) => toPosixPath(a.path));
    let bundleRoot: string;
    try {
      bundleRoot = resolveSkillBundleRoot(paths);
    } catch {
      continue;
    }
    let primary: ReturnType<typeof resolvePrimarySkillSource>;
    try {
      primary = resolvePrimarySkillSource(pkgDir, bundleRoot, group);
    } catch {
      continue;
    }
    const text = patchMarkdownBundlePlaceholders(primary.skillMdUtf8, undefined);
    const fallbackName =
      primary.primaryAsset.name?.trim() ||
      path.posix.basename(
        toPosixPath(primary.primaryAsset.path),
        path.posix.extname(primary.primaryAsset.path)
      );
    let skillDirName: string;
    try {
      skillDirName = finalizeSkillMdContent(text, fallbackName).skillDirName;
    } catch {
      continue;
    }
    const skillDir = path.join(agentBase, "skills", skillDirName);
    if (fs.existsSync(skillDir) && fs.statSync(skillDir).isDirectory()) {
      fs.rmSync(skillDir, { recursive: true });
    }
  }
}
