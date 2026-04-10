/**
 * Install-time package validation: **integration point** for “validate package” semantics
 * when installing from a **catalog extract** (`user_packages/<name>/`, etc.).
 *
 * **Intent:** Same rules as {@link validatePackage} for everything the installer reads from
 * that directory (manifest shape, Multi/legacy layout, duplicate basenames, declared
 * components/bundles, optional `assets` path sweep, rule/skill YAML). **Staging** is
 * verified as **files on disk** instead of `stage.tar` membership—that is the only
 * deliberate difference; the logical payload matches what `atp catalog add package` produced.
 *
 * **Scope:** Only the catalog package root and its manifest. Does not validate the target
 * project’s agent tree (merge ambiguity, drift, and `--force-config` are apply-time concerns).
 */

import fs from "node:fs";
import path from "node:path";

import { loadPackageManifest } from "../install/resolve.js";
import type { PackageManifest } from "../install/types.js";

import {
  hasDuplicatePartTypes,
  isFatalMultiFieldMissing,
  collectDuplicateComponentBasenameGaps,
  collectMultiPartStructureGaps,
  collectMultiRootMetadataGaps,
  multiTypeHasMandatoryFailure,
} from "./validate-multi-type-package.js";
import { collectCatalogInstallRuleSkillViolations } from "./validate-rule-skill-frontmatter.js";
import {
  buildSingleTypeFailureMessage,
  collectSingleTypeRootFieldGaps,
  singleTypeHasMandatoryGap,
} from "./validate-single-type-package.js";
import {
  isMultiDevManifest,
  legacyHasPartsConflict,
  multiHasRootPayloadConflict,
  partStagePrefix,
} from "./manifest-layout.js";
import type { DevPackageManifest, PackagePart } from "./types.js";
import type { ValidateResult } from "./validate-types.js";

const PACKAGE_FILE_HINT = "atp-package.yaml (or package.yaml)";

function manifestFileMissingResult(): ValidateResult {
  return {
    ok: false,
    exitCode: 2,
    missing: [PACKAGE_FILE_HINT],
    message: `No ${PACKAGE_FILE_HINT} found in package directory.`,
  };
}

function manifestParseFailedResult(): ValidateResult {
  return {
    ok: false,
    exitCode: 2,
    missing: [`Valid ${PACKAGE_FILE_HINT}`],
    message: `Could not parse ${PACKAGE_FILE_HINT}.`,
  };
}

function legacyPartsConflictResult(): ValidateResult {
  return {
    ok: false,
    exitCode: 1,
    missing: ["parts (not allowed with single root type)"],
    message: "Legacy package cannot list parts alongside a singular root type.",
  };
}

function multiRootPayloadConflictResult(): ValidateResult {
  return {
    ok: false,
    exitCode: 1,
    missing: ["root usage/components/bundles (use parts for Multi layout)"],
    message: "Multi package must define usage, components, and bundles under parts, not at the root.",
  };
}

/**
 * Normalise install manifest fields for shared validation helpers (developer shape).
 *
 * @param m - Raw catalog manifest from YAML.
 */
function packageManifestToDevLike(m: PackageManifest): DevPackageManifest {
  const raw = m as PackageManifest & { usage?: unknown; components?: unknown };
  const usage = Array.isArray(raw.usage)
    ? raw.usage.map(String)
    : raw.usage != null
      ? [String(raw.usage)]
      : [];
  const components = Array.isArray(raw.components) ? raw.components.map(String) : [];
  return {
    name: String(m.name ?? ""),
    version: String(m.version ?? ""),
    type: String(m.type ?? ""),
    usage,
    components,
    parts: m.parts,
    bundles: m.bundles,
  };
}

/**
 * @param root - Package root directory.
 * @param relPosix - Relative path using `/` (no `..`).
 */
function diskHasStagedPath(root: string, relPosix: string): boolean {
  const norm = relPosix.replace(/\\/g, "/");
  if (norm.includes("..") || path.posix.isAbsolute(norm)) {
    return false;
  }
  const segments = norm.split("/").filter(Boolean);
  return fs.existsSync(path.join(root, ...segments));
}

function appendSingleTypeDiskStagingGaps(
  pkgDir: string,
  manifest: DevPackageManifest,
  missing: string[]
): void {
  for (const c of manifest.components ?? []) {
    const rel = c.replace(/\\/g, "/");
    if (!diskHasStagedPath(pkgDir, rel)) {
      missing.push(`staged file missing (${rel})`);
    }
  }
  for (const b of manifest.bundles ?? []) {
    const bp = typeof b === "string" ? b : b.path;
    const rel = String(bp).replace(/\\/g, "/");
    if (!diskHasStagedPath(pkgDir, rel)) {
      missing.push(`staged bundle missing (${rel})`);
    }
  }
}

function appendMultiTypeDiskStagingGaps(pkgDir: string, parts: PackagePart[], missing: string[]): void {
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const index1 = i + 1;
    const prefix = partStagePrefix(index1, part.type);
    for (const c of part.components ?? []) {
      const rel = `${prefix}/${c}`;
      if (!diskHasStagedPath(pkgDir, rel)) {
        missing.push(`part ${index1}: staged file missing (${rel})`);
      }
    }
    for (const b of part.bundles ?? []) {
      const bp = typeof b === "string" ? b : b.path;
      const rel = `${prefix}/${bp}`;
      if (!diskHasStagedPath(pkgDir, rel)) {
        missing.push(`part ${index1}: staged bundle missing (${rel})`);
      }
    }
  }
}

/**
 * When the catalog manifest lists `assets`, every path must exist under `pkgDir`.
 *
 * @param pkgDir - Extracted package root.
 * @param manifest - Catalog manifest.
 * @param missing - Output list.
 */
function appendMissingDeclaredAssetPaths(
  pkgDir: string,
  manifest: PackageManifest,
  missing: string[]
): void {
  const assets = manifest.assets ?? [];
  if (assets.length === 0) {
    return;
  }
  for (const a of assets) {
    const rel = a.path.replace(/\\/g, "/");
    if (rel.includes("..") || path.posix.isAbsolute(rel)) {
      missing.push(`invalid asset path "${a.path}"`);
      continue;
    }
    if (!diskHasStagedPath(pkgDir, rel)) {
      missing.push(`staged asset missing (${a.path})`);
    }
  }
}

function appendRuleSkillInstallViolations(pkgDir: string, manifest: PackageManifest, missing: string[]): void {
  for (const msg of collectCatalogInstallRuleSkillViolations(pkgDir, manifest)) {
    missing.push(msg);
  }
}

function validateCatalogInstallSingle(
  pkgDir: string,
  devLike: DevPackageManifest,
  manifest: PackageManifest
): ValidateResult {
  const missing: string[] = [];
  collectSingleTypeRootFieldGaps(devLike, missing);

  if (!singleTypeHasMandatoryGap(missing)) {
    appendSingleTypeDiskStagingGaps(pkgDir, devLike, missing);
  }

  if (missing.length === 0) {
    appendMissingDeclaredAssetPaths(pkgDir, manifest, missing);
  }

  if (missing.length === 0) {
    appendRuleSkillInstallViolations(pkgDir, manifest, missing);
  }

  if (missing.length === 0) {
    return {
      ok: true,
      exitCode: 0,
      missing: [],
      message: "Package appears complete. Mandatory minimal values are set.",
    };
  }

  const exitCode: 1 | 2 = singleTypeHasMandatoryGap(missing) ? 2 : 1;
  return {
    ok: false,
    exitCode,
    missing,
    message: buildSingleTypeFailureMessage(missing),
  };
}

function validateCatalogInstallMulti(
  pkgDir: string,
  devLike: DevPackageManifest,
  manifest: PackageManifest
): ValidateResult {
  const missing: string[] = [];
  collectMultiRootMetadataGaps(devLike, missing);

  const parts = devLike.parts ?? [];
  collectMultiPartStructureGaps(parts, missing);

  if (parts.length > 0) {
    collectDuplicateComponentBasenameGaps(parts, missing);
  }

  const hasComponentUniquenessGap = missing.some(
    (m) =>
      m.startsWith("duplicate component ") || m.includes("must be unique across parts")
  );

  const hasFatalStructuralGap = missing.some(isFatalMultiFieldMissing);
  if (!hasFatalStructuralGap && parts.length > 0 && !hasComponentUniquenessGap) {
    appendMultiTypeDiskStagingGaps(pkgDir, parts, missing);
  }

  if (missing.length === 0) {
    appendMissingDeclaredAssetPaths(pkgDir, manifest, missing);
  }

  if (missing.length === 0) {
    appendRuleSkillInstallViolations(pkgDir, manifest, missing);
  }

  if (missing.length === 0) {
    if (hasDuplicatePartTypes(parts)) {
      console.warn("Warning: duplicate part types in this package (allowed, but unusual).");
    }
    return {
      ok: true,
      exitCode: 0,
      missing: [],
      message:
        "Package appears complete. Mandatory minimal values are set for Multi layout. " +
        "Each part has usage; staged content matches part components and bundles.",
    };
  }

  const exitCode: 1 | 2 = multiTypeHasMandatoryFailure(missing) ? 2 : 1;
  return {
    ok: false,
    exitCode,
    missing,
    message: "Multi package validation failed.",
  };
}

/**
 * Validate an extracted catalog package directory before install (disk layout, manifest, rule/skill YAML).
 * Aligns with {@link validatePackage} for developers, but checks files on disk instead of `stage.tar`.
 *
 * @param pkgDir - Absolute or relative path to the catalog package root.
 */
export function validateCatalogInstallPackage(pkgDir: string): ValidateResult {
  const root = path.resolve(pkgDir);

  let manifest: PackageManifest | null;
  try {
    manifest = loadPackageManifest(root);
  } catch {
    return manifestParseFailedResult();
  }

  if (!manifest) {
    return manifestFileMissingResult();
  }

  const devLike = packageManifestToDevLike(manifest);

  if (legacyHasPartsConflict(devLike)) {
    return legacyPartsConflictResult();
  }

  if (multiHasRootPayloadConflict(devLike)) {
    return multiRootPayloadConflictResult();
  }

  if (isMultiDevManifest(devLike)) {
    return validateCatalogInstallMulti(root, devLike, manifest);
  }

  return validateCatalogInstallSingle(root, devLike, manifest);
}
