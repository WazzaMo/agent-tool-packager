/**
 * Append paths into stage.tar using Feature 4 per-part prefixes (no GNU tar --transform).
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const STAGE_TAR = "stage.tar";

/**
 * Append one path from `stagingRoot` into `tarPath`, creating the archive when missing.
 *
 * @param pkgRoot - Package root (working directory for tar).
 * @param tarPath - Absolute path to `stage.tar`.
 * @param stagingRoot - Directory passed to `tar -C`.
 * @param relEntry - Path relative to `stagingRoot` to archive.
 */
function appendTarEntryFromStagingDir(
  pkgRoot: string,
  tarPath: string,
  stagingRoot: string,
  relEntry: string
): void {
  try {
    execSync(`tar -rf "${tarPath}" -C "${stagingRoot}" "${relEntry}"`, {
      cwd: pkgRoot,
      stdio: "pipe",
    });
  } catch {
    execSync(`tar -cf "${tarPath}" -C "${stagingRoot}" "${relEntry}"`, {
      cwd: pkgRoot,
      stdio: "pipe",
    });
  }
}

/**
 * Stage a single file as `partPrefix/baseName` inside `stage.tar`.
 *
 * @param pkgRoot - Package root directory.
 * @param partPrefix - e.g. `part_1_Skill`.
 * @param sourceFileAbs - Absolute path to the source file.
 */
export function stageMultiComponentFile(
  pkgRoot: string,
  partPrefix: string,
  sourceFileAbs: string
): void {
  const baseName = path.basename(sourceFileAbs);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "atp-stage-"));
  try {
    const inner = path.join(tmp, partPrefix);
    fs.mkdirSync(inner, { recursive: true });
    fs.copyFileSync(sourceFileAbs, path.join(inner, baseName));
    const tarPath = path.join(pkgRoot, STAGE_TAR);
    appendTarEntryFromStagingDir(pkgRoot, tarPath, tmp, `${partPrefix}/${baseName}`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

/**
 * Stage a bundle directory tree under `partPrefix/bundleRelPath` inside `stage.tar`.
 *
 * @param pkgRoot - Package root directory.
 * @param partPrefix - e.g. `part_1_Rule`.
 * @param bundleRelPath - Bundle path relative to package root.
 * @param bundleAbsDir - Absolute path to the bundle directory on disk.
 */
export function stageMultiBundleTree(
  pkgRoot: string,
  partPrefix: string,
  bundleRelPath: string,
  bundleAbsDir: string
): void {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "atp-stage-"));
  try {
    const dest = path.join(tmp, partPrefix, bundleRelPath);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.cpSync(bundleAbsDir, dest, { recursive: true });
    const tarPath = path.join(pkgRoot, STAGE_TAR);
    appendTarEntryFromStagingDir(pkgRoot, tarPath, tmp, path.join(partPrefix, bundleRelPath));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
