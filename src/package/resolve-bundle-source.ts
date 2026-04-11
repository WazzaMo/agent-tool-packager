/**
 * Resolve bundle directory paths for authoring (same rules as component sources: `cp`-like).
 */

import path from "node:path";

import { resolveComponentSourcePath } from "./resolve-component-source.js";

/**
 * Resolve the absolute path to a bundle directory.
 * Relative paths are resolved from {@link packageCwd}; absolute paths are normalised.
 *
 * @param packageCwd - Package root directory (CLI working directory).
 * @param userPath - User-supplied path (relative or absolute).
 * @returns Normalised absolute path.
 */
export function resolveBundleSourcePath(packageCwd: string, userPath: string): string {
  return resolveComponentSourcePath(packageCwd, userPath);
}

/**
 * Path stored in `atp-package.yaml` for a bundle: relative to package root when the bundle
 * directory lies inside the package; otherwise the directory basename (like per-part
 * components) so staged paths stay flat under each part prefix.
 *
 * @param pkgRoot - Package root.
 * @param bundleAbsDir - Absolute path to the bundle directory.
 */
export function bundleManifestPath(pkgRoot: string, bundleAbsDir: string): string {
  const root = path.resolve(pkgRoot);
  const abs = path.resolve(bundleAbsDir);
  const rel = path.relative(root, abs);
  if (!rel || rel === ".") {
    return path.basename(abs);
  }
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    return path.basename(abs);
  }
  return rel.split(path.sep).join("/");
}

/**
 * True when the bundle directory is inside {@link pkgRoot} (not a peer via `..`).
 *
 * @param pkgRoot - Package root.
 * @param bundleAbsDir - Absolute bundle directory.
 */
export function isBundleDirectoryUnderPackage(pkgRoot: string, bundleAbsDir: string): boolean {
  const rel = path.relative(path.resolve(pkgRoot), path.resolve(bundleAbsDir));
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}
