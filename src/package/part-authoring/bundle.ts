/**
 * Per-part bundles: add/remove manifest entries and stage.tar trees.
 */

import fs from "node:fs";
import path from "node:path";

import { partStagePrefix } from "../manifest-layout.js";
import { wouldBundleBasenameCollideForPartAdd } from "../part-bundle-uniqueness.js";
import { saveDevManifest } from "../save-manifest.js";
import { stageMultiBundleTree } from "../stage-multi.js";
import { mutateStageTarContents, removePathUnderExtractRoot } from "../stage-tar-mutate.js";

import {
  exitUnlessMultiDevManifest,
  getPartAtIndexOrExit,
  loadDevManifestOrExit,
  parsePartIndex1OrExit,
} from "./guards.js";

import type { BundleDefinition } from "../types.js";

/**
 * @param execBase - Bundle path relative to package root.
 * @param pkgRoot - Resolved package root.
 * Exits when path escapes the package or is not an existing directory.
 */
function assertBundleDirectoryUnderPackageOrExit(execBase: string, pkgRoot: string): void {
  const bundlePath = path.resolve(pkgRoot, execBase);
  const rel = path.relative(pkgRoot, bundlePath);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    console.error(`Invalid path to bundle given: ${execBase}`);
    process.exit(1);
  }
  if (!fs.existsSync(bundlePath)) {
    console.error("Nominated path or directory does not exist.");
    process.exit(1);
  }
  if (!fs.statSync(bundlePath).isDirectory()) {
    console.error(`Path is not a directory: ${execBase}`);
    process.exit(1);
  }
}

/**
 * Split a manifest-relative path into segments for the extract root.
 *
 * @param rel - Path using `/` or platform separators.
 */
function archivePathSegments(rel: string): string[] {
  return rel.split(/[/\\]/).filter(Boolean);
}

function findBundleByRelBase(
  bundles: (string | BundleDefinition)[],
  relBase: string
): string | BundleDefinition | undefined {
  return bundles.find((b) => {
    if (typeof b === "string") return b === relBase;
    return b.path === relBase;
  });
}

/**
 * `atp package part <n> bundle add <execBase> [--exec-filter|--skip-exec]` — register bundle and stage tree.
 *
 * @param cwd - Package root directory.
 * @param indexStr - 1-based part index.
 * @param execBase - Bundle directory relative to `cwd`.
 * @param opts - `exec-filter` for non-UNIX bundles with executables; `skipExec` when there are none.
 */
export function packagePartBundleAdd(
  cwd: string,
  indexStr: string,
  execBase: string,
  opts?: { execFilter?: string; skipExec?: boolean }
): void {
  const index1 = parsePartIndex1OrExit(indexStr);
  const pkgRoot = path.resolve(cwd);
  assertBundleDirectoryUnderPackageOrExit(execBase, pkgRoot);
  const relBase = path.relative(pkgRoot, path.resolve(pkgRoot, execBase));

  const m = loadDevManifestOrExit(cwd);
  exitUnlessMultiDevManifest(m);
  const part = getPartAtIndexOrExit(m, index1);
  const bundlePath = path.resolve(pkgRoot, execBase);

  if (opts?.skipExec && opts?.execFilter) {
    console.error("Cannot use --skip-exec together with --exec-filter.");
    process.exit(1);
  }

  const hasBin = fs.existsSync(path.join(bundlePath, "bin"));
  if (!hasBin && !opts?.execFilter && !opts?.skipExec) {
    console.error(
      "Bundle does not have bin/ directory. Provide --exec-filter for executables, " +
        "--skip-exec when the bundle has no programs, or add a bin/ directory in the bundle."
    );
    process.exit(1);
  }

  const bundles = part.bundles ?? [];
  if (findBundleByRelBase(bundles, relBase)) {
    return;
  }

  if (wouldBundleBasenameCollideForPartAdd(m.parts, relBase, index1)) {
    console.error("Bundle name must be unique across all parts in the package.");
    process.exit(2);
  }

  const def: BundleDefinition = opts?.skipExec
    ? { path: relBase, "skip-exec": true }
    : {
        path: relBase,
        "exec-filter": opts?.execFilter ?? `${relBase}/bin/*`,
      };
  bundles.push(def);
  part.bundles = bundles;
  saveDevManifest(cwd, m);

  const prefix = partStagePrefix(index1, part.type);
  stageMultiBundleTree(pkgRoot, prefix, relBase, bundlePath);
}

/**
 * `atp package part <n> bundle remove <execBase>` — drop bundle from manifest and `stage.tar`.
 *
 * @param cwd - Package root directory.
 * @param indexStr - 1-based part index.
 * @param execBase - Bundle directory relative to package root.
 */
export function packagePartBundleRemove(
  cwd: string,
  indexStr: string,
  execBase: string
): void {
  const index1 = parsePartIndex1OrExit(indexStr);
  const pkgRoot = path.resolve(cwd);
  const bundlePath = path.resolve(pkgRoot, execBase);
  const relBase = path.relative(pkgRoot, bundlePath);
  if (relBase.startsWith("..") || path.isAbsolute(relBase)) {
    console.error(`Invalid path to bundle given: ${execBase}`);
    process.exit(1);
  }

  const m = loadDevManifestOrExit(cwd);
  exitUnlessMultiDevManifest(m);
  const part = getPartAtIndexOrExit(m, index1);
  const bundles = part.bundles ?? [];
  const found = findBundleByRelBase(bundles, relBase);
  if (!found) {
    console.error("Bundle had not been included in this part.");
    process.exit(1);
  }

  const prefix = partStagePrefix(index1, part.type);
  const bundleSegments = archivePathSegments(relBase);

  try {
    mutateStageTarContents(pkgRoot, (extractRoot) => {
      removePathUnderExtractRoot(extractRoot, [prefix, ...bundleSegments]);
    });
  } catch (err) {
    console.error(String(err));
    process.exit(1);
  }

  part.bundles = bundles.filter((b) => {
    if (typeof b === "string") return b !== relBase;
    return b.path !== relBase;
  });
  saveDevManifest(cwd, m);
}
