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
 * Resolve project base from `SAFEHOUSE_PROJECT_PATH` when it points at an existing directory.
 *
 * @returns Absolute directory path, or `null` when unset or invalid.
 */
function projectBaseFromEnvOverride(): string | null {
  const envPath = process.env.SAFEHOUSE_PROJECT_PATH;
  if (!envPath) {
    return null;
  }
  const resolvedEnvPath = path.resolve(expandHome(envPath));
  if (fs.existsSync(resolvedEnvPath) && fs.statSync(resolvedEnvPath).isDirectory()) {
    return resolvedEnvPath;
  }
  return null;
}

/**
 * Whether any configured project-root marker exists directly under `dir`.
 *
 * @param dir - Directory to inspect (absolute or normalised).
 * @returns `true` if `.git` or `.vscode` exists under `dir`.
 */
function directoryContainsProjectMarker(dir: string): boolean {
  return PROJECT_BASE_MARKERS.some((marker) =>
    fs.existsSync(path.join(dir, marker))
  );
}

/**
 * Walk up from `startDir` at most `PROJECT_BASE_RADIUS` steps seeking a marker directory.
 *
 * @param startDir - Absolute starting directory.
 * @returns Project base path or `null`.
 */
function findProjectBaseWalkingUp(startDir: string): string | null {
  let dir = startDir;
  for (let i = 0; i <= PROJECT_BASE_RADIUS; i++) {
    if (directoryContainsProjectMarker(dir)) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  return null;
}

/**
 * Find project base directory by examining cwd and parents (radius 2).
 * Respects SAFEHOUSE_PROJECT_PATH environment variable if set.
 * Looks for .git or .vscode as evidence of project base. Feature 3 acceptance criteria.
 *
 * @param cwd - Directory to start from. Defaults to process.cwd().
 * @returns Project base path or null if not found.
 */
export function findProjectBase(cwd: string = process.cwd()): string | null {
  const fromEnv = projectBaseFromEnvOverride();
  if (fromEnv) {
    return fromEnv;
  }
  return findProjectBaseWalkingUp(path.resolve(cwd));
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
