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
import { loadDevManifest } from "./load-manifest.js";
import { validatePackage } from "./validate.js";
import type { DevPackageManifest } from "./types.js";

const USER_PACKAGES_DIR = "user_packages";
const STAGE_TAR = "stage.tar";
const PACKAGE_FILE = "atp-package.yaml";
const CATALOG_FILE = "atp-catalog.yaml";

/** Load manifest or exit. */
function loadManifestOrExit(cwd: string): DevPackageManifest {
  const manifest = loadDevManifest(cwd);
  if (!manifest) {
    console.error("No atp-package.yaml found. Run `atp create package skeleton` first.");
    process.exit(1);
  }
  return manifest;
}

/** Validate package or exit with validation errors. */
function validateOrExit(cwd: string): void {
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

/** Ensure stage.tar exists and is non-empty, or exit. */
function ensureStageTarExists(cwd: string): string {
  const stagePath = path.join(cwd, STAGE_TAR);
  if (!fs.existsSync(stagePath) || fs.statSync(stagePath).size === 0) {
    console.error("stage.tar is missing or empty. Add components or bundles.");
    process.exit(1);
  }
  return stagePath;
}

/** Create package dir, copy manifest, gzip stage.tar, extract. Returns pkgDir. */
function createPackageDir(
  cwd: string,
  stagePath: string,
  name: string
): string {
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

/** Derive assets from components and bundles, write enriched manifest. */
function enrichManifestWithAssets(
  pkgDir: string,
  manifestDest: string,
  manifest: DevPackageManifest
): void {
  const outManifest = yaml.load(fs.readFileSync(manifestDest, "utf8")) as Record<string, unknown>;
  const type = (manifest.type ?? "Rule").toLowerCase();
  const assetType = type === "rule" ? "rule" : type === "skill" ? "skill" : "rule";
  const components = (outManifest.components as string[]) ?? [];
  const assets: { path: string; type: string; name: string }[] = components.map((p) => ({
    path: p,
    type: assetType,
    name: path.basename(p, path.extname(p)),
  }));

  const bundles = (outManifest.bundles as string[]) ?? [];
  for (const bundle of bundles) {
    const binDir = path.join(pkgDir, bundle, "bin");
    if (fs.existsSync(binDir) && fs.statSync(binDir).isDirectory()) {
      for (const entry of fs.readdirSync(binDir)) {
        const fullPath = path.join(binDir, entry);
        if (fs.statSync(fullPath).isFile()) {
          assets.push({ path: path.join(bundle, "bin", entry), type: "program", name: entry });
        }
      }
    }
  }
  outManifest.assets = assets;
  fs.writeFileSync(manifestDest, yaml.dump(outManifest, { lineWidth: 120 }), "utf8");
}

/** Add or update package entry in atp-catalog.yaml. */
function addToCatalog(name: string, version: string, pkgDir: string): void {
  const stationPath = getStationPath();
  const catalogPath = path.join(stationPath, CATALOG_FILE);
  let catalog: { packages?: unknown[] } = { packages: [] };
  if (fs.existsSync(catalogPath)) {
    const content = fs.readFileSync(catalogPath, "utf8");
    const data = yaml.load(content) as { packages?: unknown[] } | null;
    if (data && Array.isArray(data.packages)) {
      catalog = data;
    }
  }

  const location = `file://${pkgDir}`;
  const existing = catalog.packages?.find(
    (p: unknown) => (p as { name?: string }).name === name
  );
  if (!existing) {
    catalog.packages = catalog.packages ?? [];
    catalog.packages.push({ name, version, location });
  }
  fs.writeFileSync(catalogPath, yaml.dump(catalog, { lineWidth: 120 }), "utf8");
}

/** Remove stage.tar from cwd (cleanup per Feature 2). */
function removeStageTar(stagePath: string): void {
  try {
    fs.unlinkSync(stagePath);
  } catch {
    /* ignore */
  }
}

/**
 * Add package to Station's user catalog.
 * Validates, creates package dir, gzips stage.tar, enriches manifest with assets,
 * updates catalog, and removes stage.tar from cwd.
 *
 * @param cwd - Package root directory
 */
export function catalogAddPackage(cwd: string): void {
  const manifest = loadManifestOrExit(cwd);
  validateOrExit(cwd);

  const name = manifest.name;
  if (!name) {
    console.error("Package name is required.");
    process.exit(1);
  }

  const stagePath = ensureStageTarExists(cwd);
  const pkgDir = createPackageDir(cwd, stagePath, name);
  const manifestDest = path.join(pkgDir, PACKAGE_FILE);

  enrichManifestWithAssets(pkgDir, manifestDest, manifest);
  addToCatalog(name, manifest.version ?? "0.0.0", pkgDir);
  removeStageTar(stagePath);

  console.log(`Package ${name} added to user package catalog.`);
  console.log("It can now be installed at either the Station or into a project's Safehouse.");
}
