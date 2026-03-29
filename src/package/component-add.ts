/**
 * Add a file component to the package and stage.tar.
 * See docs/features/2-package-developer-support.md.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { DevPackageManifest } from "./types.js";
import { loadDevManifest } from "./load-manifest.js";
import { saveDevManifest } from "./save-manifest.js";
import { exitIfMultiUsesRootStaging } from "./root-staging-guard.js";
import { resolveComponentSourcePath } from "./resolve-component-source.js";

const STAGE_TAR = "stage.tar";

/**
 * Exit if path does not exist or is not a file.
 *
 * @param resolved - Absolute path to the nominated file.
 * @param filePath - Original user path (for error messages).
 */
function assertComponentExistsAndIsFile(resolved: string, filePath: string): void {
  if (!fs.existsSync(resolved)) {
    console.error("Nominated path or file does not exist.");
    process.exit(1);
  }
  if (!fs.statSync(resolved).isFile()) {
    console.error(`Path is not a file: ${filePath}`);
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
 * Append one file to `stage.tar`, creating the archive when needed.
 *
 * @param pkgRoot - Package root (tar cwd).
 * @param tarPath - Path to `stage.tar`.
 * @param fileDir - Directory containing the file (`tar -C` target).
 * @param baseName - File name only.
 */
function appendComponentToTar(
  pkgRoot: string,
  tarPath: string,
  fileDir: string,
  baseName: string
): void {
  try {
    execSync(`tar -rf "${tarPath}" -C "${fileDir}" "${baseName}"`, {
      cwd: pkgRoot,
      stdio: "pipe",
    });
  } catch {
    execSync(`tar -cf "${tarPath}" -C "${fileDir}" "${baseName}"`, {
      cwd: pkgRoot,
      stdio: "pipe",
    });
  }
}

/**
 * Add a file component to the package and stage.tar.
 * Validates path and manifest; updates manifest and tar (flat layout).
 *
 * @param cwd - Package root directory
 * @param filePath - Source file: relative to {@link cwd} (including `..`) or absolute
 */
export function componentAdd(cwd: string, filePath: string): void {
  const pkgRoot = path.resolve(cwd);
  const resolved = resolveComponentSourcePath(pkgRoot, filePath);

  assertComponentExistsAndIsFile(resolved, filePath);

  const manifest = loadManifestOrExit(cwd);
  exitIfMultiUsesRootStaging(manifest, "component <path>");
  const baseName = path.basename(resolved);
  const components = manifest.components ?? [];

  if (components.includes(baseName)) return;

  components.push(baseName);
  manifest.components = components;
  saveDevManifest(cwd, manifest);

  const tarPath = path.join(cwd, STAGE_TAR);
  const fileDir = path.dirname(resolved);
  appendComponentToTar(pkgRoot, tarPath, fileDir, baseName);
}
