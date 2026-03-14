/**
 * Remove a bundle from the package and stage.tar.
 * See docs/features/2-package-developer-support.md.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadDevManifest } from "./load-manifest.js";
import { saveDevManifest } from "./save-manifest.js";

const STAGE_TAR = "stage.tar";

export function bundleRemove(cwd: string, execBase: string): void {
  const pkgRoot = path.resolve(cwd);
  const manifest = loadDevManifest(cwd);

  if (!manifest) {
    console.error("No atp-package.yaml found. Run `atp create package skeleton` first.");
    process.exit(1);
  }

  const baseName = path.basename(execBase);
  const bundles = manifest.bundles ?? [];

  if (!bundles.includes(baseName)) {
    console.error("Bundle had not been included in the package.");
    process.exit(1);
  }

  const tarPath = path.join(cwd, STAGE_TAR);
  if (!fs.existsSync(tarPath) || fs.statSync(tarPath).size === 0) {
    console.error("Bundle had not been included in the package.");
    process.exit(1);
  }

  // Verify bundle is in the stage tar (paths start with execBase/)
  let hasBundleInTar = false;
  try {
    const list = execSync(`tar -tf "${tarPath}"`, {
      cwd: pkgRoot,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    const prefix = baseName + "/";
    hasBundleInTar = list.split("\n").some((line) => line.trim().startsWith(prefix));
  } catch {
    /* tar list failed */
  }

  if (!hasBundleInTar) {
    console.error("Bundle had not been included in the package.");
    process.exit(1);
  }

  // Extract, remove bundle dir, recreate tar
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

    // Recreate tar from remaining content
    fs.unlinkSync(tarPath);
    const entries = fs.readdirSync(extractDir, { withFileTypes: true });
    if (entries.length === 0) {
      // Empty archive - create minimal tar (empty)
      execSync(`tar -cf "${tarPath}" -C "${extractDir}" .`, {
        cwd: pkgRoot,
        stdio: "pipe",
      });
    } else {
      const args = entries.map((e) => e.name).join(" ");
      execSync(`tar -cf "${tarPath}" -C "${extractDir}" ${args}`, {
        cwd: pkgRoot,
        stdio: "pipe",
      });
    }
  } finally {
    try {
      fs.rmSync(extractDir, { recursive: true });
    } catch {
      /* ignore */
    }
  }

  manifest.bundles = bundles.filter((b) => b !== baseName);
  saveDevManifest(cwd, manifest);
}
