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

type YamlBundle = string | { path: string; "exec-filter"?: string; "skip-exec"?: boolean };

function toPosixRelPath(pkgDir: string, absolutePath: string): string {
  return path.relative(pkgDir, absolutePath).replace(/\\/g, "/");
}

/**
 * Collect staged-relative POSIX paths that would be registered as `type: program` for this bundle.
 *
 * @param pkgDir - Extracted package directory (catalog copy).
 * @param bundleRootRel - Directory path inside the package (POSIX segments).
 * @param execFilterGlob - Optional glob relative to `pkgDir`; when omitted, uses `bundleRootRel/bin/*` convention.
 */
export function collectProgramRelPathsSet(
  pkgDir: string,
  bundleRootRel: string,
  execFilterGlob?: string
): Set<string> {
  const out = new Set<string>();
  if (execFilterGlob != null && execFilterGlob !== "") {
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
        out.add(file.replace(/\\/g, "/"));
      }
    } catch {
      /* no matches */
    }
    return out;
  }
  const binDir = path.join(pkgDir, ...bundleRootRel.split("/"));
  const binSub = path.join(binDir, "bin");
  if (!fs.existsSync(binSub) || !fs.statSync(binSub).isDirectory()) {
    return out;
  }
  for (const entry of fs.readdirSync(binSub)) {
    const fullPath = path.join(binSub, entry);
    if (fs.statSync(fullPath).isFile()) {
      out.add(path.posix.join(bundleRootRel.replace(/\\/g, "/"), "bin", entry));
    }
  }
  return out;
}

/**
 * Append `type: skill` rows for every file under a staged bundle tree (except program paths).
 *
 * @param assets - Accumulator.
 * @param pkgDir - Extracted package directory.
 * @param bundleRootRel - Bundle directory relative to `pkgDir` (POSIX).
 * @param programRelPaths - Paths (POSIX, relative to `pkgDir`) already claimed as programs.
 * @param seenRelPaths - Paths already emitted; updated as rows are appended.
 */
export function appendSkillFilesFromBundleTree(
  assets: CatalogAssetRow[],
  pkgDir: string,
  bundleRootRel: string,
  programRelPaths: ReadonlySet<string>,
  seenRelPaths: Set<string>
): void {
  const rootRel = bundleRootRel.replace(/\\/g, "/");
  const absRoot = path.join(pkgDir, ...rootRel.split("/"));
  if (!fs.existsSync(absRoot) || !fs.statSync(absRoot).isDirectory()) {
    return;
  }

  function visit(absDir: string): void {
    for (const ent of fs.readdirSync(absDir, { withFileTypes: true })) {
      const abs = path.join(absDir, ent.name);
      const rel = toPosixRelPath(pkgDir, abs);
      if (ent.isDirectory()) {
        visit(abs);
        continue;
      }
      if (!ent.isFile()) {
        continue;
      }
      if (programRelPaths.has(rel) || seenRelPaths.has(rel)) {
        continue;
      }
      seenRelPaths.add(rel);
      assets.push({
        path: rel,
        type: "skill",
        name: path.basename(ent.name, path.extname(ent.name)),
      });
    }
  }

  visit(absRoot);
}

/**
 * Choose install asset kind for a part's file components from its package type.
 *
 * @param partType - Canonical part type string.
 * @returns Install `assets[].type` value for staged files.
 */
function componentAssetTypeForPart(
  partType: string
): "rule" | "skill" | "prompt" | "hook" | "mcp" {
  const t = partType.toLowerCase();
  if (t === "skill") return "skill";
  if (t === "prompt") return "prompt";
  if (t === "hook") return "hook";
  if (t === "mcp") return "mcp";
  return "rule";
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
  const paths = collectProgramRelPathsSet(pkgDir, bundleRootRel, execFilterGlob);
  for (const p of paths) {
    assets.push({
      path: p,
      type: "program",
      name: path.posix.basename(p),
    });
  }
}

/**
 * @param manifest - Parsed manifest (for root `type`).
 * @returns Install `assets[].type` for each listed component file.
 */
function singleTypeComponentAssetType(
  manifest: DevPackageManifest
): "rule" | "skill" | "prompt" | "hook" | "mcp" {
  const t = (manifest.type ?? "Rule").toLowerCase();
  if (t === "rule") return "rule";
  if (t === "skill") return "skill";
  if (t === "prompt") return "prompt";
  if (t === "hook") return "hook";
  if (t === "mcp") return "mcp";
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
  const seenRelPaths = new Set<string>();
  const components = (outManifest.components as string[]) ?? [];
  for (const p of components) {
    const norm = p.replace(/\\/g, "/");
    if (seenRelPaths.has(norm)) {
      continue;
    }
    seenRelPaths.add(norm);
    assets.push({
      path: norm,
      type: assetType,
      name: path.basename(p, path.extname(p)),
    });
  }
  const bundles = (outManifest.bundles as YamlBundle[]) ?? [];
  for (const bundle of bundles) {
    const bundlePath = typeof bundle === "string" ? bundle : bundle.path;
    const normBundlePath = bundlePath.replace(/\\/g, "/");
    const skipExec = typeof bundle !== "string" && bundle["skip-exec"] === true;
    const execFilter = typeof bundle === "string" ? undefined : bundle["exec-filter"];
    const programPaths = skipExec
      ? new Set<string>()
      : collectProgramRelPathsSet(pkgDir, normBundlePath, execFilter);

    if (!skipExec) {
      appendProgramAssetsForBundleRoot(assets, pkgDir, normBundlePath, execFilter);
      for (const pr of programPaths) {
        seenRelPaths.add(pr);
      }
    }

    if (assetType === "skill") {
      appendSkillFilesFromBundleTree(assets, pkgDir, normBundlePath, programPaths, seenRelPaths);
    }
  }
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
  const seenRelPaths = new Set<string>();
  const parts = manifest.parts ?? [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const prefix = partStagePrefix(i + 1, part.type);
    const mdType = componentAssetTypeForPart(part.type);
    const isSkillPart = String(part.type ?? "")
      .trim()
      .toLowerCase() === "skill";

    for (const p of part.components ?? []) {
      const rel = `${prefix}/${p}`.replace(/\\/g, "/");
      if (seenRelPaths.has(rel)) {
        continue;
      }
      seenRelPaths.add(rel);
      assets.push({
        path: rel,
        type: mdType,
        name: path.basename(p, path.extname(p)),
      });
    }

    for (const bundle of part.bundles ?? []) {
      const bundlePath = typeof bundle === "string" ? bundle : bundle.path;
      const normBundlePath = bundlePath.replace(/\\/g, "/");
      const skipExec = typeof bundle !== "string" && bundle["skip-exec"] === true;
      const execFilter =
        typeof bundle === "string" ? undefined : bundle["exec-filter"];
      const bundleRootRel = path.posix.join(prefix, normBundlePath);
      const globFromPkgRoot =
        execFilter != null ? path.posix.join(prefix, execFilter.replace(/\\/g, "/")) : undefined;

      const programPaths = skipExec
        ? new Set<string>()
        : collectProgramRelPathsSet(pkgDir, bundleRootRel, globFromPkgRoot);

      if (!skipExec) {
        appendProgramAssetsForBundleRoot(assets, pkgDir, bundleRootRel, globFromPkgRoot);
        for (const pr of programPaths) {
          seenRelPaths.add(pr);
        }
      }

      if (isSkillPart) {
        appendSkillFilesFromBundleTree(assets, pkgDir, bundleRootRel, programPaths, seenRelPaths);
      }
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
