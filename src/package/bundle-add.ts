/**
 * Add a bundle (directory tree) to the package and stage.tar.
 * See docs/features/2-package-developer-support.md.
 * UNIX conformant: bundle must have bin/ for executables, or use --exec-filter.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { loadDevManifest } from "./load-manifest.js";
import { saveDevManifest } from "./save-manifest.js";

const STAGE_TAR = "stage.tar";

export function bundleAdd(
  cwd: string,
  execBase: string,
  opts?: { execFilter?: string }
): void {
  const pkgRoot = path.resolve(cwd);
  const bundlePath = path.resolve(cwd, execBase);

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

  const manifest = loadDevManifest(cwd);
  if (!manifest) {
    console.error("No atp-package.yaml found. Run `atp create package skeleton` first.");
    process.exit(1);
  }

  const bundles = manifest.bundles ?? [];
  const baseName = path.basename(execBase);
  if (bundles.includes(baseName)) {
    return; // already added
  }

  // UNIX conformant: must have bin/ for executables, or --exec-filter
  const hasBin = fs.existsSync(path.join(bundlePath, "bin"));
  if (!hasBin && !opts?.execFilter) {
    console.error(
      "Bundle does not have bin/ directory. Either provide --exec-filter option so " +
        "installation can setup the executables correctly, or place them in a bin/ directory in the bundle."
    );
    process.exit(1);
  }

  bundles.push(baseName);
  manifest.bundles = bundles;
  saveDevManifest(cwd, manifest);

  const tarPath = path.join(cwd, STAGE_TAR);
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
