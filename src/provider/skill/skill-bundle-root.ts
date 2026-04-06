/**
 * Resolve the staged bundle directory for skill assets in one install part.
 */

import path from "node:path";

/**
 * Normalise to POSIX-style path segments for stable comparisons.
 *
 * @param p - Relative path using `/` or `\\`.
 */
export function toPosixPath(p: string): string {
  return p.replace(/\\/g, "/");
}

/**
 * Longest common path prefix (directory segments only) for non-empty path list.
 *
 * @param posixPaths - Relative paths with `/` separators.
 */
export function longestCommonPathPrefix(posixPaths: string[]): string {
  if (posixPaths.length === 0) {
    return "";
  }
  const split = posixPaths.map((p) => p.split("/").filter(Boolean));
  if (split.some((s) => s.length === 0)) {
    return "";
  }
  const minLen = Math.min(...split.map((s) => s.length));
  const out: string[] = [];
  for (let i = 0; i < minLen - 1; i++) {
    const seg = split[0][i];
    if (!split.every((s) => s[i] === seg)) {
      break;
    }
    out.push(seg);
  }
  return out.join("/");
}

/**
 * Directory under the package/staging root that contains all skill files for this part.
 *
 * @param skillAssetPaths - Relative paths of every `skill`-type asset in the part.
 */
export function resolveSkillBundleRoot(skillAssetPaths: string[]): string {
  const posix = skillAssetPaths.map(toPosixPath);
  if (posix.length === 1) {
    const d = path.posix.dirname(posix[0]);
    return d === "." ? "" : d;
  }
  return longestCommonPathPrefix(posix);
}

/**
 * Path relative to the bundle root (POSIX).
 *
 * @param bundleRoot - From {@link resolveSkillBundleRoot}.
 * @param assetPath - Full staged relative path.
 */
export function relativeToSkillBundle(bundleRoot: string, assetPath: string): string {
  const root = toPosixPath(bundleRoot);
  const full = toPosixPath(assetPath);
  if (root === "") {
    return full;
  }
  if (full === root) {
    return "";
  }
  const prefix = `${root}/`;
  if (!full.startsWith(prefix)) {
    throw new Error(`Skill path "${full}" is not under bundle root "${root}"`);
  }
  return full.slice(prefix.length);
}
