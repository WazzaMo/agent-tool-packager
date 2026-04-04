/**
 * Safehouse manifest.yaml: parse, serialize, load, and update package entries.
 */

import fs from "node:fs";
import path from "node:path";

import yaml from "js-yaml";

import { getSafehousePath, pathExists } from "./paths.js";

import type {
  SafehouseManifest,
  SafehouseManifestPackage,
  PackageSource,
  BinaryScope,
} from "./types.js";

const SAFEHOUSE_MANIFEST_FILE = "manifest.yaml";

/** Top-level key in manifest.yaml per docs/features/3-package-install-process.md */
const SAFEHOUSE_MANIFEST_KEY = "Safehouse-Manifest";

/**
 * Normalise YAML-loaded document into a {@link SafehouseManifest} or `null` if shape is invalid.
 *
 * @param raw - Value from `yaml.load`.
 * @returns Manifest structure, or `null`.
 */
function parseManifest(raw: unknown): SafehouseManifest | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const inner = obj[SAFEHOUSE_MANIFEST_KEY] ?? obj;
  if (!inner || typeof inner !== "object") return null;
  const m = inner as Record<string, unknown>;
  const packages = Array.isArray(m.packages) ? m.packages : [];
  return {
    packages: packages as SafehouseManifest["packages"],
    station_path: (m.station_path as string | null) ?? null,
  };
}

/**
 * Absolute path to `manifest.yaml` under the project's Safehouse directory.
 *
 * @param projectBase - Project root containing `.atp_safehouse`.
 * @returns Full path to the manifest file.
 */
function safehouseManifestFilePath(projectBase: string): string {
  return path.join(getSafehousePath(projectBase), SAFEHOUSE_MANIFEST_FILE);
}

/**
 * Write a manifest to disk under the given project base.
 *
 * @param projectBase - Project root containing `.atp_safehouse`.
 * @param manifest - In-memory manifest to serialise.
 */
function writeSafehouseManifestToProject(
  projectBase: string,
  manifest: SafehouseManifest
): void {
  fs.writeFileSync(
    safehouseManifestFilePath(projectBase),
    writeManifestContent(manifest),
    "utf8"
  );
}

/**
 * Serialize manifest with Safehouse-Manifest wrapper for manifest.yaml.
 *
 * @param manifest - Packages and station path reference.
 * @returns YAML text including the `Safehouse-Manifest` wrapper key.
 */
export function writeManifestContent(manifest: SafehouseManifest): string {
  return yaml.dump(
    { [SAFEHOUSE_MANIFEST_KEY]: manifest },
    { lineWidth: 80 }
  );
}

/**
 * Load Safehouse manifest (manifest.yaml) with Safehouse-Manifest wrapper.
 * @param projectBase - Project base directory. Defaults to process.cwd().
 * @returns Safehouse manifest or null if Safehouse does not exist.
 */
export function loadSafehouseManifest(
  projectBase: string = process.cwd()
): SafehouseManifest | null {
  const safehousePath = getSafehousePath(projectBase);
  const manifestPath = safehouseManifestFilePath(projectBase);

  if (!pathExists(safehousePath) || !fs.existsSync(manifestPath)) {
    return null;
  }

  const content = fs.readFileSync(manifestPath, "utf8");
  const raw = yaml.load(content);
  return parseManifest(raw);
}

/**
 * Add or update package in Safehouse manifest. Safehouse must exist.
 * @param name - Package name.
 * @param version - Package version.
 * @param binaryScope - user-bin or project-bin.
 * @param source - station or local.
 * @param projectBase - Project base directory. Defaults to process.cwd().
 * @param installLayout - Optional `multi` vs `legacy` hint for Feature 4 manifests.
 */
export function addPackageToSafehouseManifest(
  name: string,
  version: string | undefined,
  binaryScope: BinaryScope = "user-bin",
  source: PackageSource = "station",
  projectBase: string = process.cwd(),
  installLayout?: "multi" | "legacy"
): void {
  const existing = loadSafehouseManifest(projectBase);
  const packages = existing?.packages ?? [];
  const stationPath = existing?.station_path ?? null;

  const filtered = packages.filter((p) => p.name !== name);
  const row: SafehouseManifestPackage = {
    name,
    version,
    source,
    binary_scope: binaryScope,
  };
  if (installLayout) {
    row.install_layout = installLayout;
  }
  filtered.push(row);

  writeSafehouseManifestToProject(projectBase, {
    packages: filtered,
    station_path: stationPath,
  });
}

/**
 * Remove package from Safehouse manifest. Safehouse must exist.
 * @param name - Package name to remove.
 * @param cwd - Project base directory. Defaults to process.cwd().
 */
export function removePackageFromSafehouseManifest(
  name: string,
  cwd: string = process.cwd()
): void {
  const existing = loadSafehouseManifest(cwd);
  if (!existing) return;

  const packages = (existing.packages ?? []).filter((p) => p.name !== name);
  const stationPath = existing.station_path ?? null;

  writeSafehouseManifestToProject(cwd, { packages, station_path: stationPath });
}

/**
 * Update a package entry in Safehouse manifest (e.g. set source: "local").
 * @param name - Package name to update.
 * @param updates - Fields to update.
 * @param cwd - Project base directory. Defaults to process.cwd().
 */
export function updateSafehousePackageInManifest(
  name: string,
  updates: { source?: PackageSource },
  cwd: string = process.cwd()
): void {
  const existing = loadSafehouseManifest(cwd);
  if (!existing) return;

  const packages = (existing.packages ?? []).map((p) =>
    p.name === name ? { ...p, ...updates } : p
  );
  const stationPath = existing.station_path ?? null;

  writeSafehouseManifestToProject(cwd, { packages, station_path: stationPath });
}

/**
 * Load Safehouse manifest from a Safehouse path (e.g. /path/to/proj/.atp_safehouse).
 * @param safehousePath path to project Safehouse
 * @returns SafehouseManifest object.
 */
export function loadSafehouseManifestFromPath(
  safehousePath: string
): SafehouseManifest | null {
  const manifestPath = path.join(safehousePath, SAFEHOUSE_MANIFEST_FILE);
  if (!fs.existsSync(manifestPath)) return null;
  const content = fs.readFileSync(manifestPath, "utf8");
  const raw = yaml.load(content);
  return parseManifest(raw);
}
