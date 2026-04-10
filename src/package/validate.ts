/**
 * Validate package definition: dispatches to single-type vs multi-type routines.
 * See docs/features/4-multi-type-packages.md.
 *
 * **Install analogue:** {@link validateCatalogInstallPackage} applies the same checks to a
 * catalog extract directory (files on disk, no `stage.tar` requirement) immediately before
 * install. Scope is the package payload the installer consumes—not the target agent project.
 */

import fs from "node:fs";
import path from "node:path";

import { loadDevManifest } from "./load-manifest.js";
import {
  isMultiDevManifest,
  legacyHasPartsConflict,
  multiHasRootPayloadConflict,
} from "./manifest-layout.js";
import { validateMultiTypePackage } from "./validate-multi-type-package.js";
import { validateSingleTypePackage } from "./validate-single-type-package.js";

import type { ValidateResult } from "./validate-types.js";


export type { ValidateResult } from "./validate-types.js";

/** Catalog install / reinstall pre-flight: same checks as {@link validatePackage} using on-disk extract layout. */
export { validateCatalogInstallPackage } from "./validate-catalog-install-package.js";

const PACKAGE_FILE = "atp-package.yaml";

/**
 * @param cwd - Directory containing `atp-package.yaml`.
 * @returns Outcome when the manifest file is missing.
 */
function manifestFileMissingResult(): ValidateResult {
  return {
    ok: false,
    exitCode: 2,
    missing: ["atp-package.yaml"],
    message: "No atp-package.yaml found. Run 'atp create package skeleton' first.",
  };
}

/**
 * @returns Outcome when YAML could not be parsed into a manifest.
 */
function manifestParseFailedResult(): ValidateResult {
  return {
    ok: false,
    exitCode: 2,
    missing: ["Valid atp-package.yaml"],
    message: "Could not parse atp-package.yaml.",
  };
}

/**
 * @returns Outcome when a singular root type is paired with a non-empty `parts` list.
 */
function legacyPartsConflictResult(): ValidateResult {
  return {
    ok: false,
    exitCode: 1,
    missing: ["parts (not allowed with single root type)"],
    message: "Legacy package cannot list parts alongside a singular root type.",
  };
}

/**
 * @returns Outcome when Multi root type still has root usage/components/bundles.
 */
function multiRootPayloadConflictResult(): ValidateResult {
  return {
    ok: false,
    exitCode: 1,
    missing: ["root usage/components/bundles (use parts for Multi layout)"],
    message: "Multi package must define usage, components, and bundles under parts, not at the root.",
  };
}

/**
 * Validate `atp-package.yaml` and `stage.tar` in the **developer** package directory.
 *
 * For **catalog install**, use {@link validateCatalogInstallPackage} on the Station extract
 * (same validation intent; staging verified as loose files under that root).
 *
 * @param cwd - Package root directory.
 * @returns Aggregated validation result for CLI or programmatic use.
 */
export function validatePackage(cwd: string): ValidateResult {
  const pkgPath = path.join(cwd, PACKAGE_FILE);

  if (!fs.existsSync(pkgPath)) {
    return manifestFileMissingResult();
  }

  const manifest = loadDevManifest(cwd);
  if (!manifest) {
    return manifestParseFailedResult();
  }

  if (legacyHasPartsConflict(manifest)) {
    return legacyPartsConflictResult();
  }

  if (multiHasRootPayloadConflict(manifest)) {
    return multiRootPayloadConflictResult();
  }

  if (isMultiDevManifest(manifest)) {
    return validateMultiTypePackage(cwd, manifest);
  }

  return validateSingleTypePackage(cwd, manifest);
}
