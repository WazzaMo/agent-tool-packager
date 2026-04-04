/**
 * Create package skeleton: `atp create package [skeleton]`.
 */

import path from "node:path";

import {
  clearPackageSkeletonArtifacts,
  writeLegacySkeletonManifest,
  writeMultiTypeSkeletonManifest,
} from "./package-skeleton.js";

const PACKAGE_FILE = "atp-package.yaml";

/** Options for {@link createPackageSkeleton}. */
export interface CreateSkeletonOptions {
  /** Legacy single-type flow (empty type until `atp package type`). */
  legacy?: boolean;
}

/**
 * Create an empty package skeleton: remove existing `atp-package.yaml` and `stage.tar`,
 * then write the default manifest (Multi or legacy).
 *
 * @param cwd - Package root directory.
 * @param opts - When `legacy`, write single-type empty-type skeleton.
 */
export function createPackageSkeleton(cwd: string, opts?: CreateSkeletonOptions): void {
  clearPackageSkeletonArtifacts(cwd);
  const pkgPath = path.join(cwd, PACKAGE_FILE);
  if (opts?.legacy) {
    writeLegacySkeletonManifest(pkgPath);
    return;
  }
  writeMultiTypeSkeletonManifest(pkgPath);
}
