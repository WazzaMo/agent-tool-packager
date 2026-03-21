/**
 * Path resolution for Station and Safehouse.
 * Respects STATION_PATH env var; defaults to ~/.atp_station.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Expand ~ or $HOME to absolute home directory path.
 * @param p - Path that may start with ~/ or $HOME.
 * @returns Resolved path.
 */
export function expandHome(p: string): string {
  if (p.startsWith("~/") || p === "~") {
    return path.join(os.homedir(), p.slice(1));
  }
  if (p.startsWith("$HOME")) {
    return path.join(os.homedir(), p.slice(5));
  }
  return p;
}

/** Default station path when STATION_PATH is not set */
export const DEFAULT_STATION_PATH = path.join(os.homedir(), ".atp_station");

/**
 * Resolve the Station directory path.
 * Uses STATION_PATH env var if set; otherwise ~/.atp_station.
 * @returns Absolute path to Station directory.
 */
export function getStationPath(): string {
  const env = process.env.STATION_PATH;
  if (env) {
    return expandHome(env);
  }
  return DEFAULT_STATION_PATH;
}

/**
 * Resolve the Safehouse path (.atp_safehouse) under the project directory.
 * @param cwd - Project base directory (not necessarily process.cwd(); use findProjectBase for subdirs).
 * @returns Path to .atp_safehouse directory.
 */
export function getSafehousePath(cwd: string = process.cwd()): string {
  return path.join(cwd, ".atp_safehouse");
}

/**
 * Check if a path exists and is a directory.
 * @param dir - Path to check.
 * @returns True if directory exists.
 */
export function pathExists(dir: string): boolean {
  try {
    return fs.existsSync(dir) && fs.statSync(dir).isDirectory();
  } catch {
    return false;
  }
}

const PROJECT_BASE_MARKERS = [".git", ".vscode"];
const PROJECT_BASE_RADIUS = 2;

/**
 * Find project base directory by examining cwd and parents (radius 2).
 * Respects SAFEHOUSE_PROJECT_PATH environment variable if set.
 * Looks for .git or .vscode as evidence of project base. Feature 3 acceptance criteria.
 * @param cwd - Directory to start from. Defaults to process.cwd().
 * @returns Project base path or null if not found.
 */
export function findProjectBase(cwd: string = process.cwd()): string | null {
  // Check environment variable override first
  const envPath = process.env.SAFEHOUSE_PROJECT_PATH;
  if (envPath) {
    const resolvedEnvPath = path.resolve(expandHome(envPath));
    if (fs.existsSync(resolvedEnvPath) && fs.statSync(resolvedEnvPath).isDirectory()) {
      return resolvedEnvPath;
    }
  }

  let dir = path.resolve(cwd);
  for (let i = 0; i <= PROJECT_BASE_RADIUS; i++) {
    for (const marker of PROJECT_BASE_MARKERS) {
      const markerPath = path.join(dir, marker);
      if (fs.existsSync(markerPath)) {
        return dir;
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * Check if a directory looks like a user's home directory (anti-pattern).
 * Feature 3: used during safehouse init to avoid init in home dir.
 * @param dir - Path to check.
 * @returns True if directory appears to be home (parent is "home"/"Users", .ssh/.bashrc present).
 */
export function isHomeDirectory(dir: string): boolean {
  const resolved = path.resolve(dir);
  const home = os.homedir();
  if (resolved === home) return true;

  // Additional heuristic checks from Feature 3
  const parent = path.dirname(resolved);
  const parentName = path.basename(parent);
  if (parentName === "home" || parentName === "Users") {
    // If it's something like /home/user or /Users/user
    if (fs.existsSync(path.join(resolved, ".ssh"))) return true;
    if (fs.existsSync(path.join(resolved, ".bashrc"))) return true;
  }
  return false;
}

/**
 * Escape hatch for `atp safehouse init` in a home directory. Only the literal value `"1"` enables it.
 * @returns True when ATP_ALLOW_HOME_SAFEHOUSE is exactly "1".
 */
export function isHomeSafehouseEscapeHatchActive(): boolean {
  return process.env.ATP_ALLOW_HOME_SAFEHOUSE === "1";
}

/**
 * Whether safehouse init must refuse this directory (user home, and escape hatch not set).
 * @param dir - Resolved project root from findProjectBase.
 */
export function isForbiddenSafehouseDir(dir: string): boolean {
  return isHomeDirectory(dir) && !isHomeSafehouseEscapeHatchActive();
}
