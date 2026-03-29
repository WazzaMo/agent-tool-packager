/**
 * Remove a component from the package and stage.tar.
 * See docs/features/2-package-developer-support.md.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { DevPackageManifest } from "./types.js";
import { loadDevManifest } from "./load-manifest.js";
import { saveDevManifest } from "./save-manifest.js";
import { exitIfMultiDevManifestForLegacyRemove } from "./root-staging-guard.js";

const STAGE_TAR = "stage.tar";

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
 * Exit if the basename is not listed under `components`.
 *
 * @param manifest - Parsed developer manifest.
 * @param baseName - File basename to remove.
 */
function assertComponentInManifest(manifest: DevPackageManifest, baseName: string): void {
  const components = manifest.components ?? [];
  if (!components.includes(baseName)) {
    console.error("Component had not been included in the package.");
    process.exit(1);
  }
}

/**
 * Remove a component from the package and stage.tar.
 * Validates that the component is listed; updates manifest and tar.
 *
 * @param cwd - Package root directory
 * @param filePath - Path to file (relative to cwd)
 */
export function componentRemove(cwd: string, filePath: string): void {
  const manifest = loadManifestOrExit(cwd);
  exitIfMultiDevManifestForLegacyRemove(manifest);
  const pkgRoot = path.resolve(cwd);
  const resolved = path.resolve(cwd, filePath);
  const baseName = path.basename(resolved);

  assertComponentInManifest(manifest, baseName);

  const tarPath = path.join(cwd, STAGE_TAR);
  if (!fs.existsSync(tarPath) || fs.statSync(tarPath).size === 0) {
    console.error("Component had not been included in the package.");
    process.exit(1);
  }

  const tmpDir = path.join(os.tmpdir(), `atp-component-remove-${Date.now()}-${process.pid}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  try {
    execSync(`tar -xf "${path.join(pkgRoot, STAGE_TAR)}" -C "${tmpDir}"`, { stdio: "pipe" });
    const extractedPath = path.join(tmpDir, baseName);
    if (fs.existsSync(extractedPath)) {
      fs.unlinkSync(extractedPath);
    }
    fs.unlinkSync(tarPath);
    const remaining = fs.readdirSync(tmpDir);
    if (remaining.length > 0) {
      execSync(`tar -cf "${tarPath}" -C "${tmpDir}" .`, {
        cwd: pkgRoot,
        stdio: "pipe",
      });
    }
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true });
    } catch {
      /* ignore */
    }
  }

  const components = (manifest.components ?? []).filter((c) => c !== baseName);
  manifest.components = components;
  saveDevManifest(cwd, manifest);
}
