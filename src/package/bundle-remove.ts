/**
 * Remove a bundle from the package and stage.tar.
 * See docs/features/2-package-developer-support.md.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { DevPackageManifest } from "./types.js";
import { loadDevManifest } from "./load-manifest.js";
import { saveDevManifest } from "./save-manifest.js";

const STAGE_TAR = "stage.tar";

/**
 * Load atp-package.yaml or exit with code 1.
 * @param cwd - Package root directory
 * @returns The parsed manifest (never null; exits otherwise)
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
 * Exit with code 1 if the bundle is not listed in the manifest.
 */
function assertBundleInManifest(manifest: DevPackageManifest, baseName: string): void {
  const bundles = manifest.bundles ?? [];
  if (!bundles.includes(baseName)) {
    console.error("Bundle had not been included in the package.");
    process.exit(1);
  }
}

/**
 * Exit with code 1 if stage.tar does not exist or is empty.
 * @returns Path to stage.tar
 */
function assertStageTarExists(cwd: string): string {
  const tarPath = path.join(cwd, STAGE_TAR);
  if (!fs.existsSync(tarPath) || fs.statSync(tarPath).size === 0) {
    console.error("Bundle had not been included in the package.");
    process.exit(1);
  }
  return tarPath;
}

/**
 * Exit with code 1 if the bundle is not present in the stage tar.
 */
function assertBundleInTar(tarPath: string, baseName: string, pkgRoot: string): void {
  const prefix = baseName + "/";
  let hasBundleInTar = false;
  try {
    const list = execSync(`tar -tf "${tarPath}"`, {
      cwd: pkgRoot,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    hasBundleInTar = list.split("\n").some((line) => line.trim().startsWith(prefix));
  } catch {
    /* tar list failed */
  }
  if (!hasBundleInTar) {
    console.error("Bundle had not been included in the package.");
    process.exit(1);
  }
}

/**
 * Extract stage.tar, remove the bundle directory, and recreate the tar.
 * Uses a temporary directory; cleans up on exit.
 */
function recreateTarWithoutBundle(tarPath: string, baseName: string, pkgRoot: string): void {
  const extractDir = path.join(os.tmpdir(), `atp-bundle-rm-${Date.now()}`);
  try {
    fs.mkdirSync(extractDir, { recursive: true });
    execSync(`tar -xf "${tarPath}" -C "${extractDir}"`, {
      cwd: pkgRoot,
      stdio: "pipe",
    });

    const bundleDirInExtract = path.join(extractDir, baseName);
    if (fs.existsSync(bundleDirInExtract)) {
      fs.rmSync(bundleDirInExtract, { recursive: true });
    }

    fs.unlinkSync(tarPath);
    execSync(`tar -cf "${tarPath}" -C "${extractDir}" .`, {
      cwd: pkgRoot,
      stdio: "pipe",
    });
  } finally {
    try {
      fs.rmSync(extractDir, { recursive: true });
    } catch {
      /* ignore */
    }
  }
}

/**
 * Remove the bundle from the manifest and save.
 */
function removeBundleFromManifest(cwd: string, manifest: DevPackageManifest, baseName: string): void {
  const bundles = manifest.bundles ?? [];
  manifest.bundles = bundles.filter((b) => b !== baseName);
  saveDevManifest(cwd, manifest);
}

/**
 * Remove a bundle from the package and stage.tar.
 * Validates manifest, stage.tar, and bundle presence; extracts, removes
 * the bundle directory, recreates the tar, and updates the manifest.
 *
 * @param cwd - Package root directory (contains atp-package.yaml and stage.tar)
 * @param execBase - Base path of the bundle (directory name; can be full path)
 */
export function bundleRemove(cwd: string, execBase: string): void {
  const pkgRoot = path.resolve(cwd);
  const baseName = path.basename(execBase);

  const manifest = loadManifestOrExit(cwd);
  assertBundleInManifest(manifest, baseName);
  const tarPath = assertStageTarExists(cwd);
  assertBundleInTar(tarPath, baseName, pkgRoot);

  recreateTarWithoutBundle(tarPath, baseName, pkgRoot);
  removeBundleFromManifest(cwd, manifest, baseName);
}
