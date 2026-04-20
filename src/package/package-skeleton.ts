/**
 * Initial atp-package.yaml content for single-type vs multi-type new packages.
 */

import fs from "node:fs";
import path from "node:path";

const PACKAGE_FILE = "atp-package.yaml";
const STAGE_FILE = "stage.tar";

/**
 * Remove prior manifest and `stage.tar` before writing a new skeleton.
 *
 * @param cwd - Package root directory.
 */
export function clearPackageSkeletonArtifacts(cwd: string): void {
  const pkgPath = path.join(cwd, PACKAGE_FILE);
  const stagePath = path.join(cwd, STAGE_FILE);
  if (fs.existsSync(pkgPath)) {
    fs.unlinkSync(pkgPath);
  }
  if (fs.existsSync(stagePath)) {
    fs.unlinkSync(stagePath);
  }
}

/**
 * Write default multi-type skeleton: root type Multi, empty `parts`.
 *
 * @param pkgPath - Absolute path to `atp-package.yaml`.
 */
export function writeMultiTypeSkeletonManifest(pkgPath: string): void {
  fs.writeFileSync(pkgPath, `type: Multi\nparts: []\n`, "utf8");
}

/**
 * Write legacy single-type skeleton: empty root `type` until `atp package type`.
 *
 * @param pkgPath - Absolute path to `atp-package.yaml`.
 */
export function writeLegacySkeletonManifest(pkgPath: string): void {
  fs.writeFileSync(pkgPath, "type: \"\"\n", "utf8");
}
