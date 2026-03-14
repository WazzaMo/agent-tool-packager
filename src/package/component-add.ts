/**
 * Add a file component to the package and stage.tar.
 * See docs/features/2-package-developer-support.md.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { loadDevManifest } from "./load-manifest.js";
import { saveDevManifest } from "./save-manifest.js";

const STAGE_TAR = "stage.tar";

export function componentAdd(cwd: string, filePath: string): void {
  const resolved = path.resolve(cwd, filePath);
  const pkgRoot = path.resolve(cwd);

  const rel = path.relative(pkgRoot, resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    console.error(`Invalid path to component given: ${filePath}`);
    process.exit(1);
  }

  if (!fs.existsSync(resolved)) {
    console.error("Nominated path or file does not exist.");
    process.exit(1);
  }

  if (!fs.statSync(resolved).isFile()) {
    console.error(`Path is not a file: ${filePath}`);
    process.exit(1);
  }

  const manifest = loadDevManifest(cwd);
  if (!manifest) {
    console.error("No atp-package.yaml found. Run `atp create package skeleton` first.");
    process.exit(1);
  }

  const baseName = path.basename(resolved);
  const components = manifest.components ?? [];

  if (components.includes(baseName)) {
    return; // already added
  }

  components.push(baseName);
  manifest.components = components;
  saveDevManifest(cwd, manifest);

  // Append to stage.tar - use base filename only (flat layout per Feature 2)
  const tarPath = path.join(cwd, STAGE_TAR);
  try {
    execSync(`tar -rf "${tarPath}" -C "${path.dirname(resolved)}" "${baseName}"`, {
      cwd: pkgRoot,
      stdio: "pipe",
    });
  } catch {
    // If tar fails (e.g. file didn't exist), create new
    execSync(`tar -cf "${tarPath}" -C "${path.dirname(resolved)}" "${baseName}"`, {
      cwd: pkgRoot,
      stdio: "pipe",
    });
  }
}
