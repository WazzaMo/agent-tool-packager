/**
 * Resolve a component source file path for staging (like `cp` source resolution).
 */

import path from "node:path";

/**
 * Resolve the absolute path to a component file.
 * Relative paths are resolved from {@link packageCwd}; absolute paths are normalised.
 *
 * @param packageCwd - Package root directory (CLI working directory).
 * @param filePath - User-supplied path (relative or absolute).
 * @returns Normalised absolute path.
 */
export function resolveComponentSourcePath(packageCwd: string, filePath: string): string {
  const trimmed = filePath.trim();
  if (path.isAbsolute(trimmed)) {
    return path.normalize(trimmed);
  }
  return path.resolve(packageCwd, trimmed);
}
