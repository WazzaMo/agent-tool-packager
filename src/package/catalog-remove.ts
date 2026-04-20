/**
 * Remove a user catalog package from the Station: `atp catalog remove <name>`.
 */

import fs from "node:fs";
import path from "node:path";

import yaml from "js-yaml";

import { parseCatalogPackagesField } from "../catalog/load.js";
import type { CatalogPackages } from "../catalog/types.js";
import { getStationPath, pathExists } from "../config/paths.js";
import { DEFAULT_CATALOG } from "../config/station-config.js";
import { removeSafehousePackageWithResult } from "../remove/remove-safehouse.js";

import { sortedProjectBasesWithPackageInRegisteredSafehouses } from "./registered-safehouse-package-scan.js";

const USER_PACKAGES_DIR = "user_packages";
const CATALOG_FILE = "atp-catalog.yaml";

/** Reasons {@link removeCatalogUserPackage} can fail (without calling `process.exit`). */
export type CatalogRemoveFailureCode =
  | "no_station"
  | "invalid_name"
  | "not_in_user"
  | "standard_only"
  | "no_catalog_file"
  | "conflicting_catalog_remove_options"
  | "still_in_registered_safehouses"
  | "safehouse_remove_failed";

export type CatalogRemoveResult =
  | { ok: true; removedUserDir: boolean; removedFromProjectBases?: string[] }
  | { ok: false; code: CatalogRemoveFailureCode; message: string };

type PreparedCatalogUserRemoval = {
  name: string;
  catalogPath: string;
  root: Record<string, unknown>;
  wrapped: boolean;
  catLevel: Record<string, unknown>;
  packages: CatalogPackages;
  userIdx: number;
};

type PrepareCatalogUserRemovalResult =
  | { ok: false; result: Extract<CatalogRemoveResult, { ok: false }> }
  | { ok: true; prepared: PreparedCatalogUserRemoval };

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

function prepareCatalogUserPackageRemoval(
  stationPath: string,
  pkgName: string
): PrepareCatalogUserRemovalResult {
  const name = pkgName.trim();

  if (!pathExists(stationPath)) {
    return {
      ok: false,
      result: {
        ok: false,
        code: "no_station",
        message: "No Station found. Run `atp station init` first.",
      },
    };
  }

  if (!isSafeCatalogPackageName(name)) {
    return {
      ok: false,
      result: {
        ok: false,
        code: "invalid_name",
        message: "Invalid package name.",
      },
    };
  }

  const catalogPath = path.join(stationPath, CATALOG_FILE);
  if (!fs.existsSync(catalogPath)) {
    return {
      ok: false,
      result: {
        ok: false,
        code: "no_catalog_file",
        message: `No catalog file at ${catalogPath}.`,
      },
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
        result: {
          ok: false,
          code: "standard_only",
          message: `Package "${name}" is listed only in the standard catalog. Remove standard entries by editing ${CATALOG_FILE} (or your standard catalog source); user catalog packages can be removed with this command.`,
        },
      };
    }
    return {
      ok: false,
      result: {
        ok: false,
        code: "not_in_user",
        message: `Package "${name}" is not in the user catalog.`,
      },
    };
  }

  return {
    ok: true,
    prepared: {
      name,
      catalogPath,
      root,
      wrapped,
      catLevel,
      packages,
      userIdx,
    },
  };
}

function commitPreparedCatalogUserPackageRemoval(prepared: PreparedCatalogUserRemoval): {
  removedUserDir: boolean;
} {
  const { name, catalogPath, root, wrapped, catLevel, packages, userIdx } = prepared;

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

  const stationPath = path.dirname(catalogPath);
  const userPkgDir = path.join(stationPath, USER_PACKAGES_DIR, name);
  let removedUserDir = false;
  if (fs.existsSync(userPkgDir)) {
    fs.rmSync(userPkgDir, { recursive: true, force: true });
    removedUserDir = true;
  }

  return { removedUserDir };
}

function formatStillInRegisteredSafehousesMessage(pkgName: string, projectBases: string[]): string {
  const lines = [
    `Package "${pkgName}" is still listed in registered project Safehouse manifest(s).`,
    "Remove it from those projects first, or run:",
    `  atp catalog remove ${pkgName} --and-from-projects`,
    "To remove only the Station catalog row (may leave agent copies if the catalog entry is already gone), run:",
    `  atp catalog remove ${pkgName} --from-catalog-only`,
    "",
    "Project roots:",
    ...projectBases.map((p) => `  - ${p}`),
  ];
  return lines.join("\n");
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
  const prep = prepareCatalogUserPackageRemoval(stationPath, pkgName);
  if (!prep.ok) {
    return prep.result;
  }
  const { removedUserDir } = commitPreparedCatalogUserPackageRemoval(prep.prepared);
  return { ok: true, removedUserDir };
}

/**
 * Remove a user catalog row with optional checks against `atp-safehouse-list.yaml` manifests.
 *
 * @param stationPath - Absolute Station root.
 * @param pkgName - Package name.
 * @param opts - `fromCatalogOnly`: skip Safehouse guard; `andFromProjects`: remove from registered Safehouses first.
 */
export function removeCatalogUserPackageWithPolicy(
  stationPath: string,
  pkgName: string,
  opts: { fromCatalogOnly?: boolean; andFromProjects?: boolean }
): CatalogRemoveResult {
  const fromCatalogOnly = opts.fromCatalogOnly ?? false;
  const andFromProjects = opts.andFromProjects ?? false;

  if (fromCatalogOnly && andFromProjects) {
    return {
      ok: false,
      code: "conflicting_catalog_remove_options",
      message:
        "Use only one of --from-catalog-only or --and-from-projects (they are mutually exclusive).",
    };
  }

  if (fromCatalogOnly) {
    return removeCatalogUserPackage(stationPath, pkgName);
  }

  const prep = prepareCatalogUserPackageRemoval(stationPath, pkgName);
  if (!prep.ok) {
    return prep.result;
  }
  const name = prep.prepared.name;

  const projects = sortedProjectBasesWithPackageInRegisteredSafehouses(stationPath, name);

  if (!andFromProjects && projects.length > 0) {
    return {
      ok: false,
      code: "still_in_registered_safehouses",
      message: formatStillInRegisteredSafehousesMessage(name, projects),
    };
  }

  const removedFromProjectBases: string[] = [];
  if (andFromProjects) {
    for (const projectBase of projects) {
      const shResult = removeSafehousePackageWithResult(name, projectBase);
      if (!shResult.ok) {
        return {
          ok: false,
          code: "safehouse_remove_failed",
          message: `Could not remove "${name}" from project ${projectBase}: ${shResult.message}`,
        };
      }
      removedFromProjectBases.push(projectBase);
    }
  }

  const { removedUserDir } = commitPreparedCatalogUserPackageRemoval(prep.prepared);
  return {
    ok: true,
    removedUserDir,
    removedFromProjectBases:
      removedFromProjectBases.length > 0 ? removedFromProjectBases : undefined,
  };
}

/**
 * CLI entry: remove a user catalog package using the current {@link getStationPath}.
 *
 * @param pkgName - Package name from argv.
 * @param opts - Optional Safehouse policy flags.
 */
export function catalogRemovePackageCli(
  pkgName: string,
  opts?: { fromCatalogOnly?: boolean; andFromProjects?: boolean }
): void {
  const stationPath = getStationPath();
  const result = removeCatalogUserPackageWithPolicy(stationPath, pkgName, {
    fromCatalogOnly: opts?.fromCatalogOnly ?? false,
    andFromProjects: opts?.andFromProjects ?? false,
  });
  if (!result.ok) {
    console.error(result.message);
    process.exit(1);
  }
  const name = pkgName.trim();
  console.log(`Removed "${name}" from the user catalog.`);
  if (result.removedFromProjectBases && result.removedFromProjectBases.length > 0) {
    console.log(
      `Removed "${name}" from ${result.removedFromProjectBases.length} registered project(s) first.`
    );
  }
  if (result.removedUserDir) {
    console.log(`Deleted Station copy under user_packages/${name}/.`);
  }
}
