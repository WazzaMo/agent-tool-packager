/**
 * Add a bundle (directory tree) to the package and stage.tar.
 * See docs/features/2-package-developer-support.md.
 * UNIX conformant: bundle must have bin/ for executables, or use --exec-filter.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { loadDevManifest } from "./load-manifest.js";
import { exitIfMultiUsesRootStaging } from "./root-staging-guard.js";
import { saveDevManifest } from "./save-manifest.js";

import type { BundleDefinition, DevPackageManifest } from "./types.js";

const STAGE_TAR = "stage.tar";

/**
 * Exit if bundle path escapes package root or is absolute.
 *
 * @param execBase - Bundle path relative to cwd.
 * @param pkgRoot - Resolved package root.
 */
function assertValidBundlePath(execBase: string, pkgRoot: string): void {
  const bundlePath = path.resolve(pkgRoot, execBase);
  const rel = path.relative(pkgRoot, bundlePath);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    console.error(`Invalid path to bundle given: ${execBase}`);
    process.exit(1);
  }
}

/**
 * Exit if bundle path is missing or not a directory.
 *
 * @param execBase - Bundle path relative to cwd.
 * @param pkgRoot - Resolved package root.
 */
function assertBundleExistsAndIsDir(execBase: string, pkgRoot: string): void {
  const bundlePath = path.resolve(pkgRoot, execBase);
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
 * @param cwd - Package root directory.
 * @returns Loaded manifest or exits when missing.
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
 * Exit if bundle has no `bin/` and neither `--exec-filter` nor `--skip-exec`.
 *
 * @param bundlePath - Absolute path to bundle root.
 * @param opts - Optional exec filter or skip-exec from CLI.
 */
function assertUnixConformantOrExecFilter(
  bundlePath: string,
  opts?: { execFilter?: string; skipExec?: boolean }
): void {
  const hasBin = fs.existsSync(path.join(bundlePath, "bin"));
  if (!hasBin && !opts?.execFilter && !opts?.skipExec) {
    console.error(
      "Bundle does not have bin/ directory. Provide --exec-filter for executables, " +
        "--skip-exec when the bundle has no programs, or add a bin/ directory in the bundle."
    );
    process.exit(1);
  }
}

/**
 * Append bundle directory tree to `stage.tar`, creating the archive when needed.
 *
 * @param pkgRoot - Package root (`tar -C` target).
 * @param tarPath - Path to `stage.tar`.
 * @param execBase - Bundle path relative to package root.
 */
function appendBundleToTar(pkgRoot: string, tarPath: string, execBase: string): void {
  try {
    execSync(`tar -rf "${tarPath}" -C "${pkgRoot}" "${execBase}"`, {
      cwd: pkgRoot,
      stdio: "pipe",
    });
  } catch {
    execSync(`tar -cf "${tarPath}" -C "${pkgRoot}" "${execBase}"`, {
      cwd: pkgRoot,
      stdio: "pipe",
    });
  }
}

/**
 * Add a bundle (directory tree) to the package and stage.tar.
 * Validates path, manifest, and UNIX conformity; updates manifest and tar.
 *
 * @param cwd - Package root directory
 * @param execBase - Path to bundle directory (relative to cwd)
 * @param opts - Optional execFilter or skipExec for non-UNIX or data-only bundles.
 */
export function bundleAdd(
  cwd: string,
  execBase: string,
  opts?: { execFilter?: string; skipExec?: boolean }
): void {
  const pkgRoot = path.resolve(cwd);
  const bundlePath = path.resolve(cwd, execBase);
  const relBase = path.relative(pkgRoot, bundlePath);

  assertValidBundlePath(execBase, pkgRoot);
  assertBundleExistsAndIsDir(execBase, pkgRoot);

  if (opts?.skipExec && opts?.execFilter) {
    console.error("Cannot use --skip-exec together with --exec-filter.");
    process.exit(1);
  }

  const manifest = loadManifestOrExit(cwd);
  exitIfMultiUsesRootStaging(manifest, "bundle add <dir>");
  const bundles = manifest.bundles ?? [];

  // Check if bundle already exists by path
  const existing = bundles.find((b) => {
    if (typeof b === "string") return b === relBase;
    return b.path === relBase;
  });
  if (existing) return;

  assertUnixConformantOrExecFilter(bundlePath, opts);

  const bundleDef: BundleDefinition = opts?.skipExec
    ? { path: relBase, "skip-exec": true }
    : {
        path: relBase,
        "exec-filter": opts?.execFilter ?? `${relBase}/bin/*`,
      };

  bundles.push(bundleDef);
  manifest.bundles = bundles;
  saveDevManifest(cwd, manifest);

  const tarPath = path.join(cwd, STAGE_TAR);
  appendBundleToTar(pkgRoot, tarPath, relBase);
}
