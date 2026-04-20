/**
 * Extract `stage.tar`, apply a filesystem mutation under the extract root, then rebuild the archive.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const STAGE_TAR = "stage.tar";

/**
 * Extract `stage.tar` into a temp directory, run `apply`, then replace `stage.tar` with the tree
 * (or delete the tar when the tree is empty).
 *
 * @param pkgRoot - Package root containing `stage.tar`.
 * @param apply - Synchronous callback; receives absolute path to extract root.
 */
export function mutateStageTarContents(
  pkgRoot: string,
  apply: (extractRoot: string) => void
): void {
  const tarPath = path.join(pkgRoot, STAGE_TAR);
  if (!fs.existsSync(tarPath)) {
    throw new Error("stage.tar is missing.");
  }
  if (fs.statSync(tarPath).size === 0) {
    throw new Error("stage.tar is empty.");
  }

  const tmpDir = path.join(os.tmpdir(), `atp-stage-mutate-${Date.now()}-${process.pid}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  try {
    execSync(`tar -xf "${tarPath}" -C "${tmpDir}"`, {
      cwd: pkgRoot,
      stdio: "pipe",
    });
    apply(tmpDir);
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
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

/**
 * Remove a file or directory tree under the extract root (archive-relative segments).
 *
 * @param extractRoot - Temp extract directory.
 * @param segments - Path segments under extract root (e.g. `["part_1_Skill","SKILL.md"]`).
 */
export function removePathUnderExtractRoot(
  extractRoot: string,
  segments: string[]
): void {
  const target = path.join(extractRoot, ...segments);
  if (!fs.existsSync(target)) {
    return;
  }
  const stat = fs.statSync(target);
  if (stat.isDirectory()) {
    fs.rmSync(target, { recursive: true, force: true });
  } else {
    fs.unlinkSync(target);
  }
}

/**
 * Rename a directory under the extract root (`fs.renameSync`).
 *
 * @param extractRoot - Temp extract directory.
 * @param fromSegments - Source path segments.
 * @param toSegments - Destination path segments.
 */
export function renameDirectoryUnderExtractRoot(
  extractRoot: string,
  fromSegments: string[],
  toSegments: string[]
): void {
  const from = path.join(extractRoot, ...fromSegments);
  const to = path.join(extractRoot, ...toSegments);
  if (!fs.existsSync(from)) {
    return;
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.renameSync(from, to);
}
