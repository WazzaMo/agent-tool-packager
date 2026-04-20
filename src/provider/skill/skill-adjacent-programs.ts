/**
 * Classify `program` manifest rows that belong with a Skill bundle (install under `scripts/`).
 */

import path from "node:path";

import type { StagedPartInstallInput } from "../../file-ops/part-install-input.js";
import type { PackageAsset, PackageManifest } from "../../install/types.js";

import { resolveSkillBundleRoot, toPosixPath } from "./skill-bundle-root.js";

function isMultiTypeManifest(manifest: Pick<PackageManifest, "parts">): boolean {
  const p = manifest.parts;
  return Array.isArray(p) && p.length > 0;
}

/**
 * Legacy single-type: bundle directory roots that contain no skill assets (executables there stay `bin/`).
 */
function bundleRootsWithoutSkillAssets(
  manifest: Pick<PackageManifest, "bundles">,
  skillPathsPosix: string[]
): Set<string> {
  const out = new Set<string>();
  const raw = manifest.bundles ?? [];
  for (const b of raw) {
    const pathStr = typeof b === "string" ? b : b.path;
    const root = toPosixPath(pathStr).replace(/^\/+|\/+$/g, "");
    if (root === "" || root === ".") {
      continue;
    }
    const hasSkill = skillPathsPosix.some((sp) => sp === root || sp.startsWith(`${root}/`));
    if (!hasSkill) {
      out.add(root);
    }
  }
  return out;
}

/**
 * Whether a staged program path lives in the same bundle tree as the given skill paths.
 *
 * @param bundleRootPosix - From {@link resolveSkillBundleRoot} on skill asset paths.
 * @param programPosix - Staged program path (POSIX).
 * @param skillPathsPosix - Staged skill asset paths (POSIX).
 * @param manifest - Used in legacy single-type layout to ignore programs under separate bundle dirs that have no skills (e.g. `my_tool/` next to root `SKILL.md`).
 */
export function isProgramPathUnderSkillBundle(
  bundleRootPosix: string,
  programPosix: string,
  skillPathsPosix: string[],
  manifest?: Pick<PackageManifest, "bundles" | "parts">
): boolean {
  if (bundleRootPosix !== "") {
    return (
      programPosix === bundleRootPosix || programPosix.startsWith(`${bundleRootPosix}/`)
    );
  }

  if (skillPathsPosix.length === 0) {
    return false;
  }

  if (manifest && !isMultiTypeManifest(manifest)) {
    for (const root of bundleRootsWithoutSkillAssets(manifest, skillPathsPosix)) {
      if (programPosix === root || programPosix.startsWith(`${root}/`)) {
        return false;
      }
    }
  }

  const skillDirs = [...new Set(skillPathsPosix.map((s) => path.posix.dirname(s)))];
  const allSkillsAtPackageRoot = skillDirs.every((d) => d === ".");

  if (allSkillsAtPackageRoot) {
    return path.posix.dirname(programPosix) === "." || programPosix.startsWith("bin/");
  }

  for (const s of skillPathsPosix) {
    const d = path.posix.dirname(s);
    if (d === ".") {
      continue;
    }
    if (programPosix === d || programPosix.startsWith(`${d}/`)) {
      return true;
    }
  }

  return false;
}

/**
 * `program` assets in this part that share the skill bundle root (install via skill plan, not `bin/`).
 *
 * @param manifest - Catalog manifest with `assets`.
 * @param part - Staged part (path membership).
 * @param skillAssets - `skill`-type rows for this part (non-empty).
 */
export function collectSkillAdjacentPrograms(
  manifest: PackageManifest,
  part: Pick<StagedPartInstallInput, "packagePaths">,
  skillAssets: PackageAsset[]
): PackageAsset[] {
  if (skillAssets.length === 0) {
    return [];
  }
  const skillPathsPosix = skillAssets.map((a) => toPosixPath(a.path));
  const bundleRoot = resolveSkillBundleRoot(skillPathsPosix);
  const inPart = new Set(part.packagePaths);
  const out: PackageAsset[] = [];
  for (const asset of manifest.assets ?? []) {
    if (asset.type !== "program") {
      continue;
    }
    if (!inPart.has(asset.path)) {
      continue;
    }
    const p = toPosixPath(asset.path);
    if (!isProgramPathUnderSkillBundle(bundleRoot, p, skillPathsPosix, manifest)) {
      continue;
    }
    out.push(asset);
  }
  return out;
}

/**
 * Staged paths of programs installed under skill `scripts/` for any part (skip in {@link copyProgramAssetsOnly}).
 *
 * @param manifest - Package manifest.
 * @param stagedParts - One staged part per install slice.
 */
export function collectSkillAdjacentProgramPathsForInstall(
  manifest: PackageManifest,
  stagedParts: StagedPartInstallInput[]
): Set<string> {
  const skip = new Set<string>();
  for (const part of stagedParts) {
    const skillAssets = (manifest.assets ?? []).filter(
      (a) => a.type === "skill" && part.packagePaths.includes(a.path)
    );
    for (const a of collectSkillAdjacentPrograms(manifest, part, skillAssets)) {
      skip.add(toPosixPath(a.path));
    }
  }
  return skip;
}
