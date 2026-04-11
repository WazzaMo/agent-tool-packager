/**
 * Add a bundle (directory tree) to the package and stage.tar.
 * See docs/features/2-package-developer-support.md.
 * UNIX conformant: bundle must have bin/ for executables, or use --exec-filter.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { loadDevManifest } from "./load-manifest.js";
import { bundleManifestPath, isBundleDirectoryUnderPackage, resolveBundleSourcePath } from "./resolve-bundle-source.js";
import { exitIfMultiUsesRootStaging } from "./root-staging-guard.js";
import { saveDevManifest } from "./save-manifest.js";
import { stageFlatBundleTree } from "./stage-multi.js";

import type { BundleDefinition, DevPackageManifest } from "./types.js";

const STAGE_TAR = "stage.tar";

/**
 * Exit if bundle path is missing or not a directory.
 *
 * @param bundleAbs - Absolute path to bundle directory.
 * @param userArg - Original user path (for errors).
 */
function assertBundleExistsAndIsDir(bundleAbs: string, userArg: string): void {
  if (!fs.existsSync(bundleAbs)) {
    console.error("Nominated path or directory does not exist.");
    process.exit(1);
  }
  if (!fs.statSync(bundleAbs).isDirectory()) {
    console.error(`Path is not a directory: ${userArg}`);
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
 * @param execBase - Path to bundle directory (relative to cwd, including `..`, or absolute).
 * @param opts - Optional execFilter or skipExec for non-UNIX or data-only bundles.
 */
export function bundleAdd(
  cwd: string,
  execBase: string,
  opts?: { execFilter?: string; skipExec?: boolean }
): void {
  const pkgRoot = path.resolve(cwd);
  const bundleAbs = resolveBundleSourcePath(pkgRoot, execBase);
  const manifestPath = bundleManifestPath(pkgRoot, bundleAbs);

  assertBundleExistsAndIsDir(bundleAbs, execBase);

  if (opts?.skipExec && opts?.execFilter) {
    console.error("Cannot use --skip-exec together with --exec-filter.");
    process.exit(1);
  }

  const manifest = loadManifestOrExit(cwd);
  exitIfMultiUsesRootStaging(manifest, "bundle add <dir>");
  const bundles = manifest.bundles ?? [];

  // Check if bundle already exists by path
  const existing = bundles.find((b) => {
    if (typeof b === "string") return b === manifestPath;
    return b.path === manifestPath;
  });
  if (existing) return;

  assertUnixConformantOrExecFilter(bundleAbs, opts);

  const bundleDef: BundleDefinition = opts?.skipExec
    ? { path: manifestPath, "skip-exec": true }
    : {
        path: manifestPath,
        "exec-filter": opts?.execFilter ?? `${manifestPath}/bin/*`,
      };

  bundles.push(bundleDef);
  manifest.bundles = bundles;
  saveDevManifest(cwd, manifest);

  const tarPath = path.join(cwd, STAGE_TAR);
  if (isBundleDirectoryUnderPackage(pkgRoot, bundleAbs)) {
    appendBundleToTar(pkgRoot, tarPath, manifestPath);
  } else {
    stageFlatBundleTree(pkgRoot, manifestPath, bundleAbs);
  }
}
