/**
 * Remove a user catalog package from the Station: `atp catalog remove <name>`.
 */

import fs from "node:fs";
import path from "node:path";

import yaml from "js-yaml";

import { parseCatalogPackagesField } from "../catalog/load.js";
import { getStationPath, pathExists } from "../config/paths.js";
import { DEFAULT_CATALOG } from "../config/station-config.js";

const USER_PACKAGES_DIR = "user_packages";
const CATALOG_FILE = "atp-catalog.yaml";

/** Reasons {@link removeCatalogUserPackage} can fail (without calling `process.exit`). */
export type CatalogRemoveFailureCode =
  | "no_station"
  | "invalid_name"
  | "not_in_user"
  | "standard_only"
  | "no_catalog_file";

export type CatalogRemoveResult =
  | { ok: true; removedUserDir: boolean }
  | { ok: false; code: CatalogRemoveFailureCode; message: string };

/**
 * Reject path injection in CLI-supplied package names.
 *
 * @param name - Raw package name from argv.
 * @returns `true` when the name is safe to use as a single path segment.
 */
export function isSafeCatalogPackageName(name: string): boolean {
  const t = name.trim();
  if (t.length === 0) {
    return false;
  }
  if (t !== path.basename(t)) {
    return false;
  }
  if (t.includes("..")) {
    return false;
  }
  return true;
}

/**
 * Remove one package from `packages.user`, delete `user_packages/<name>/` when present,
 * and rewrite `atp-catalog.yaml`. Standard-catalog rows are never removed here.
 *
 * @param stationPath - Absolute Station root (typically {@link getStationPath}).
 * @param pkgName - Package name (must pass {@link isSafeCatalogPackageName}).
 * @returns Outcome for tests and CLI.
 */
export function removeCatalogUserPackage(
  stationPath: string,
  pkgName: string
): CatalogRemoveResult {
  const name = pkgName.trim();

  if (!pathExists(stationPath)) {
    return {
      ok: false,
      code: "no_station",
      message: "No Station found. Run `atp station init` first.",
    };
  }

  if (!isSafeCatalogPackageName(name)) {
    return {
      ok: false,
      code: "invalid_name",
      message: "Invalid package name.",
    };
  }

  const catalogPath = path.join(stationPath, CATALOG_FILE);
  if (!fs.existsSync(catalogPath)) {
    return {
      ok: false,
      code: "no_catalog_file",
      message: `No catalog file at ${catalogPath}.`,
    };
  }

  const parsed = yaml.load(fs.readFileSync(catalogPath, "utf8"));
  const root: Record<string, unknown> =
    parsed && typeof parsed === "object"
      ? { ...(parsed as Record<string, unknown>) }
      : structuredClone(DEFAULT_CATALOG) as unknown as Record<string, unknown>;

  const wrapped =
    "catalog" in root && root.catalog !== null && typeof root.catalog === "object";
  const catLevel = (wrapped ? root.catalog : root) as Record<string, unknown>;

  const packages = parseCatalogPackagesField(catLevel.packages);
  const inStandard = packages.standard.some((p) => p.name === name);
  const userIdx = packages.user.findIndex((p) => p.name === name);

  if (userIdx < 0) {
    if (inStandard) {
      return {
        ok: false,
        code: "standard_only",
        message: `Package "${name}" is listed only in the standard catalog. Remove standard entries by editing ${CATALOG_FILE} (or your standard catalog source); user catalog packages can be removed with this command.`,
      };
    }
    return {
      ok: false,
      code: "not_in_user",
      message: `Package "${name}" is not in the user catalog.`,
    };
  }

  packages.user.splice(userIdx, 1);
  catLevel.packages = packages;

  const defaults = DEFAULT_CATALOG.catalog as Record<string, unknown>;
  if (catLevel["standard_packages-path"] == null) {
    catLevel["standard_packages-path"] = defaults["standard_packages-path"];
  }
  if (catLevel["user_packages-path"] == null) {
    catLevel["user_packages-path"] = defaults["user_packages-path"];
  }

  if (wrapped) {
    root.catalog = catLevel;
  }

  fs.writeFileSync(catalogPath, yaml.dump(root, { lineWidth: 120 }), "utf8");

  const userPkgDir = path.join(stationPath, USER_PACKAGES_DIR, name);
  let removedUserDir = false;
  if (fs.existsSync(userPkgDir)) {
    fs.rmSync(userPkgDir, { recursive: true, force: true });
    removedUserDir = true;
  }

  return { ok: true, removedUserDir };
}

/**
 * CLI entry: remove a user catalog package using the current {@link getStationPath}.
 *
 * @param pkgName - Package name from argv.
 */
export function catalogRemovePackageCli(pkgName: string): void {
  const stationPath = getStationPath();
  const result = removeCatalogUserPackage(stationPath, pkgName);
  if (!result.ok) {
    console.error(result.message);
    process.exit(1);
  }
  const name = pkgName.trim();
  console.log(`Removed "${name}" from the user catalog.`);
  if (result.removedUserDir) {
    console.log(`Deleted Station copy under user_packages/${name}/.`);
  }
}
