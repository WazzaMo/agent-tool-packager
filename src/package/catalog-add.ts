/**
 * Add package to Station's user catalog.
 * See docs/features/2-package-developer-support.md.
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import zlib from "node:zlib";
import yaml from "js-yaml";
import { getStationPath } from "../config/paths.js";
import { DEFAULT_CATALOG } from "../config/station-config.js";
import { parseCatalogPackagesField } from "../catalog/load.js";
import type { CatalogPackage } from "../catalog/types.js";
import { loadDevManifest } from "./load-manifest.js";
import { validatePackage } from "./validate.js";
import type { DevPackageManifest } from "./types.js";
import { enrichCatalogPackageManifestAssets } from "./catalog-asset-enrichment.js";

const USER_PACKAGES_DIR = "user_packages";
const STAGE_TAR = "stage.tar";
const PACKAGE_FILE = "atp-package.yaml";
const CATALOG_FILE = "atp-catalog.yaml";

/**
 * @param cwd - Package root directory.
 * @returns Loaded manifest or exits when `atp-package.yaml` is missing.
 */
function loadManifestOrExit(cwd: string): DevPackageManifest {
  const manifest = loadDevManifest(cwd);
  if (!manifest) {
    console.error("No atp-package.yaml found. Run `atp create package skeleton` first.");
    process.exit(1);
  }
  return manifest;
}

/**
 * @param cwd - Package root directory.
 * Exits when {@link validatePackage} fails.
 */
function validatePackageOrExit(cwd: string): void {
  const validation = validatePackage(cwd);
  if (!validation.ok) {
    console.error("Package definition is not yet complete, so it does not pass validation.");
    console.error("Please continue to define the package and run `atp validate package` for feedback.");
    console.error("When validation passes, try adding the package to the catalog.");
    console.error("");
    console.error("Validation indicates:");
    for (const msg of validation.missing) {
      console.error(`  - ${msg}`);
    }
    process.exit(1);
  }
}

/**
 * @param cwd - Package root directory.
 * @returns Absolute path to a non-empty `stage.tar`, or exits.
 */
function requireNonEmptyStageTarPath(cwd: string): string {
  const stagePath = path.join(cwd, STAGE_TAR);
  if (!fs.existsSync(stagePath) || fs.statSync(stagePath).size === 0) {
    console.error("stage.tar is missing or empty. Add components or bundles.");
    process.exit(1);
  }
  return stagePath;
}

/**
 * Create `user_packages/<name>/`, copy manifest, gzip and extract `stage.tar`.
 *
 * @param cwd - Developer package root.
 * @param stagePath - Path to `stage.tar` under `cwd`.
 * @param name - Package name (directory name under `user_packages`).
 * @returns Absolute path to the created catalog package directory.
 */
function createCatalogPackageDirectory(cwd: string, stagePath: string, name: string): string {
  const stationPath = getStationPath();
  const userPkgsPath = path.join(stationPath, USER_PACKAGES_DIR);
  const pkgDir = path.join(userPkgsPath, name);

  try {
    fs.mkdirSync(pkgDir, { recursive: true });
  } catch (err) {
    console.error(`Failed to create package directory: ${err}`);
    process.exit(1);
  }

  const manifestDest = path.join(pkgDir, PACKAGE_FILE);
  fs.copyFileSync(path.join(cwd, PACKAGE_FILE), manifestDest);

  const stageBuf = fs.readFileSync(stagePath);
  const gzBuf = zlib.gzipSync(stageBuf, { level: 9 });
  fs.writeFileSync(path.join(pkgDir, "package.tar.gz"), gzBuf);

  try {
    execSync(`tar -xzf package.tar.gz`, { cwd: pkgDir, stdio: "pipe" });
  } catch {
    /* Non-fatal: install may still work */
  }

  return pkgDir;
}

/**
 * Merge installer `assets` into the copied manifest on disk.
 *
 * @param pkgDir - Extracted catalog package directory.
 * @param manifestDest - Path to `atp-package.yaml` inside `pkgDir`.
 * @param manifest - Parsed developer manifest (for multi-type layout).
 */
function writeEnrichedManifestWithAssets(
  pkgDir: string,
  manifestDest: string,
  manifest: DevPackageManifest
): void {
  const outManifest = yaml.load(fs.readFileSync(manifestDest, "utf8")) as Record<string, unknown>;
  const assets = enrichCatalogPackageManifestAssets(pkgDir, outManifest, manifest);
  outManifest.assets = assets;
  fs.writeFileSync(manifestDest, yaml.dump(outManifest, { lineWidth: 120 }), "utf8");
}

/**
 * Add or update a user catalog entry pointing at `pkgDir`.
 *
 * @param name - Package name.
 * @param version - Semantic version string.
 * @param pkgDir - `file://` target for the entry.
 * @param manifest - Used for default description from usage.
 */
function upsertUserCatalogEntry(
  name: string,
  version: string,
  pkgDir: string,
  manifest: DevPackageManifest
): void {
  const stationPath = getStationPath();
  const catalogPath = path.join(stationPath, CATALOG_FILE);

  let root: Record<string, unknown>;
  if (fs.existsSync(catalogPath)) {
    const parsed = yaml.load(fs.readFileSync(catalogPath, "utf8"));
    root =
      parsed && typeof parsed === "object"
        ? { ...(parsed as Record<string, unknown>) }
        : structuredClone(DEFAULT_CATALOG) as unknown as Record<string, unknown>;
  } else {
    root = structuredClone(DEFAULT_CATALOG) as unknown as Record<string, unknown>;
  }

  const wrapped =
    "catalog" in root && root.catalog !== null && typeof root.catalog === "object";
  const catLevel = (wrapped ? root.catalog : root) as Record<string, unknown>;

  const packages = parseCatalogPackagesField(catLevel.packages);

  const description =
    manifest.usage?.length > 0 ? manifest.usage.join(" ") : undefined;
  const location = `file://${pkgDir}`;
  const entry: CatalogPackage = {
    name,
    version,
    description,
    location,
  };

  const uIdx = packages.user.findIndex((p) => p.name === name);
  if (uIdx >= 0) {
    packages.user[uIdx] = { ...packages.user[uIdx], ...entry };
  } else {
    packages.user.push(entry);
  }

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
}

/**
 * Best-effort removal of `stage.tar` from the developer tree (Feature 2 cleanup).
 *
 * @param stagePath - Absolute path to `stage.tar`.
 */
function removeStageTarIfPresent(stagePath: string): void {
  try {
    fs.unlinkSync(stagePath);
  } catch {
    /* ignore */
  }
}

/**
 * Add package to Station's user catalog: validate, materialise under `user_packages/`,
 * enrich `assets`, update `atp-catalog.yaml`, remove local `stage.tar`.
 *
 * @param cwd - Package root directory.
 */
export function catalogAddPackage(cwd: string): void {
  const manifest = loadManifestOrExit(cwd);
  validatePackageOrExit(cwd);

  const name = manifest.name;
  if (!name) {
    console.error("Package name is required.");
    process.exit(1);
  }

  const stagePath = requireNonEmptyStageTarPath(cwd);
  const pkgDir = createCatalogPackageDirectory(cwd, stagePath, name);
  const manifestDest = path.join(pkgDir, PACKAGE_FILE);

  writeEnrichedManifestWithAssets(pkgDir, manifestDest, manifest);
  upsertUserCatalogEntry(name, manifest.version ?? "0.0.0", pkgDir, manifest);
  removeStageTarIfPresent(stagePath);

  console.log(`Package ${name} added to user package catalog.`);
  console.log("It can now be installed at either the Station or into a project's Safehouse.");
}
