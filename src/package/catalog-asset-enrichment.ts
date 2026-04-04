/**
 * Build install-time `assets` from a developer manifest (single-type vs multi-type).
 * Shared bundle → program discovery; path layout differs by prefix.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { isMultiDevManifest, partStagePrefix } from "./manifest-layout.js";

import type { DevPackageManifest } from "./types.js";


/** One row written into `atp-package.yaml` under `assets` for installers. */
export interface CatalogAssetRow {
  path: string;
  type: string;
  name: string;
}

type YamlBundle = string | { path: string; "exec-filter"?: string };

/**
 * Choose install asset kind for a part's file components from its package type.
 *
 * @param partType - Canonical part type string.
 * @returns Install `assets[].type` value for staged files.
 */
function componentAssetTypeForPart(partType: string): "rule" | "skill" | "prompt" | "hook" {
  const t = partType.toLowerCase();
  if (t === "skill") return "skill";
  if (t === "prompt") return "prompt";
  if (t === "hook") return "hook";
  return "rule";
}

/**
 * Append program rows by running `ls -d` on a glob relative to `pkgDir`.
 *
 * @param assets - Accumulator.
 * @param pkgDir - Extracted package directory (catalog copy).
 * @param execFilterGlob - Glob relative to `pkgDir`.
 */
function appendProgramsFromExecGlob(
  assets: CatalogAssetRow[],
  pkgDir: string,
  execFilterGlob: string
): void {
  try {
    const binFiles = execSync(`ls -d ${execFilterGlob}`, {
      cwd: pkgDir,
      encoding: "utf8",
      stdio: "pipe",
    });
    for (const file of binFiles
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean)) {
      assets.push({ path: file, type: "program", name: path.basename(file) });
    }
  } catch {
    /* no matches */
  }
}

/**
 * Append program rows from `bundleRootRel/bin/*` when present.
 *
 * @param assets - Accumulator.
 * @param pkgDir - Extracted package directory.
 * @param bundleRootRel - Path from package root to bundle directory.
 */
function appendProgramsFromUnixBinDirectory(
  assets: CatalogAssetRow[],
  pkgDir: string,
  bundleRootRel: string
): void {
  const binDir = path.join(pkgDir, bundleRootRel, "bin");
  if (!fs.existsSync(binDir) || !fs.statSync(binDir).isDirectory()) return;

  for (const entry of fs.readdirSync(binDir)) {
    const fullPath = path.join(binDir, entry);
    if (fs.statSync(fullPath).isFile()) {
      assets.push({
        path: path.join(bundleRootRel, "bin", entry),
        type: "program",
        name: entry,
      });
    }
  }
}

/**
 * Append program assets for one bundle tree under `pkgDir`.
 *
 * @param assets - Accumulator.
 * @param pkgDir - Extracted package directory.
 * @param bundleRootRel - Directory path inside the package (may include `part_N_Type/...`).
 * @param execFilterGlob - Optional glob relative to `pkgDir`; when omitted, uses `bin/` convention.
 */
export function appendProgramAssetsForBundleRoot(
  assets: CatalogAssetRow[],
  pkgDir: string,
  bundleRootRel: string,
  execFilterGlob?: string
): void {
  if (execFilterGlob != null && execFilterGlob !== "") {
    appendProgramsFromExecGlob(assets, pkgDir, execFilterGlob);
    return;
  }
  appendProgramsFromUnixBinDirectory(assets, pkgDir, bundleRootRel);
}

/**
 * @param assets - Accumulator.
 * @param pkgDir - Extracted package directory.
 * @param bundles - Root-level bundle entries from YAML.
 */
function appendRootLevelBundlePrograms(
  assets: CatalogAssetRow[],
  pkgDir: string,
  bundles: YamlBundle[]
): void {
  for (const bundle of bundles) {
    const bundlePath = typeof bundle === "string" ? bundle : bundle.path;
    const execFilter = typeof bundle === "string" ? undefined : bundle["exec-filter"];
    appendProgramAssetsForBundleRoot(assets, pkgDir, bundlePath, execFilter);
  }
}

/**
 * @param manifest - Parsed manifest (for root `type`).
 * @returns Install `assets[].type` for each listed component file.
 */
function singleTypeComponentAssetType(manifest: DevPackageManifest): "rule" | "skill" | "prompt" | "hook" {
  const t = (manifest.type ?? "Rule").toLowerCase();
  if (t === "rule") return "rule";
  if (t === "skill") return "skill";
  if (t === "prompt") return "prompt";
  if (t === "hook") return "hook";
  return "rule";
}

/**
 * Enrich catalog manifest with assets for a **single-type** package (flat paths).
 *
 * @param pkgDir - Directory containing extracted `stage` + `atp-package.yaml`.
 * @param outManifest - Parsed YAML object (may include `components` / `bundles`).
 * @param manifest - In-memory manifest for root type.
 * @returns Asset rows to assign to `outManifest.assets`.
 */
export function enrichSingleTypePackageAssets(
  pkgDir: string,
  outManifest: Record<string, unknown>,
  manifest: DevPackageManifest
): CatalogAssetRow[] {
  const assets: CatalogAssetRow[] = [];
  const assetType = singleTypeComponentAssetType(manifest);
  const components = (outManifest.components as string[]) ?? [];
  for (const p of components) {
    assets.push({
      path: p,
      type: assetType,
      name: path.basename(p, path.extname(p)),
    });
  }
  const bundles = (outManifest.bundles as YamlBundle[]) ?? [];
  appendRootLevelBundlePrograms(assets, pkgDir, bundles);
  return assets;
}

/**
 * @param assets - Accumulator.
 * @param pkgDir - Extracted package directory.
 * @param manifest - Multi-type manifest with `parts`.
 */
function appendMultiTypeMarkdownAndBundleAssets(
  assets: CatalogAssetRow[],
  pkgDir: string,
  manifest: DevPackageManifest
): void {
  const parts = manifest.parts ?? [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const prefix = partStagePrefix(i + 1, part.type);
    const mdType = componentAssetTypeForPart(part.type);
    for (const p of part.components ?? []) {
      const rel = `${prefix}/${p}`;
      assets.push({
        path: rel,
        type: mdType,
        name: path.basename(p, path.extname(p)),
      });
    }
    for (const bundle of part.bundles ?? []) {
      const bundlePath = typeof bundle === "string" ? bundle : bundle.path;
      const execFilter =
        typeof bundle === "string" ? undefined : bundle["exec-filter"];
      const bundleRootRel = `${prefix}/${bundlePath}`;
      const globFromPkgRoot = execFilter != null ? `${prefix}/${execFilter}` : undefined;
      appendProgramAssetsForBundleRoot(assets, pkgDir, bundleRootRel, globFromPkgRoot);
    }
  }
}

/**
 * Enrich catalog manifest with assets for a **multi-type** package (`part_N_Type/` paths).
 *
 * @param pkgDir - Directory containing extracted tarball contents.
 * @param manifest - Parsed multi-type manifest.
 * @returns Asset rows to assign to `outManifest.assets`.
 */
export function enrichMultiTypePackageAssets(
  pkgDir: string,
  manifest: DevPackageManifest
): CatalogAssetRow[] {
  const assets: CatalogAssetRow[] = [];
  appendMultiTypeMarkdownAndBundleAssets(assets, pkgDir, manifest);
  return assets;
}

/**
 * Build the `assets` array for the catalog copy of a package (dispatcher).
 *
 * @param pkgDir - Extracted package directory under the station.
 * @param outManifest - YAML body loaded from disk (single-type uses its `components`).
 * @param manifest - Parsed developer manifest.
 * @returns Rows to persist as `assets` on `outManifest`.
 */
export function enrichCatalogPackageManifestAssets(
  pkgDir: string,
  outManifest: Record<string, unknown>,
  manifest: DevPackageManifest
): CatalogAssetRow[] {
  if (isMultiDevManifest(manifest) && (manifest.parts?.length ?? 0) > 0) {
    return enrichMultiTypePackageAssets(pkgDir, manifest);
  }
  return enrichSingleTypePackageAssets(pkgDir, outManifest, manifest);
}
