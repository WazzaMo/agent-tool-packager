/**
 * Validation for legacy single-root-type packages (Feature 2 layout).
 * See docs/features/4-multi-type-packages.md (legacy path).
 */

import fs from "node:fs";
import path from "node:path";

import { normalisedRootType } from "./manifest-layout.js";
import { STAGE_TAR_FILENAME } from "./stage-tar-read.js";

import type { DevPackageManifest } from "./types.js";
import type { ValidateResult } from "./validate-types.js";
import { appendDevPackageRuleSkillFrontmatterViolations } from "./validate-rule-skill-frontmatter.js";

/**
 * @param manifest - Parsed developer manifest.
 * @param missing - List to append field names / phrases into.
 */
export function collectSingleTypeRootFieldGaps(manifest: DevPackageManifest, missing: string[]): void {
  if (!manifest.name || String(manifest.name).trim() === "") missing.push("name");
  if (!manifest.version || String(manifest.version).trim() === "") missing.push("version");

  const rt = normalisedRootType(manifest);
  if (rt === "" || rt === "multi") {
    missing.push("type");
  } else if (!manifest.type || String(manifest.type).trim() === "") {
    missing.push("type");
  }

  if (!manifest.usage || manifest.usage.length === 0) missing.push("usage");

  const hasComponents = manifest.components && manifest.components.length > 0;
  const hasBundles = manifest.bundles && manifest.bundles.length > 0;
  if (!hasComponents && !hasBundles) missing.push("components or bundles");
}

/**
 * @param cwd - Package root directory.
 * @returns True when `stage.tar` exists and is non-empty.
 */
function hasNonEmptyStageTar(cwd: string): boolean {
  const stagePath = path.join(cwd, STAGE_TAR_FILENAME);
  return fs.existsSync(stagePath) && fs.statSync(stagePath).size > 0;
}

/**
 * @param missing - Collected gap labels from validation.
 * @returns Whether any gap is treated as mandatory (exit code 2).
 */
export function singleTypeHasMandatoryGap(missing: string[]): boolean {
  return missing.some(
    (m) =>
      m === "name" ||
      m === "type" ||
      m === "version" ||
      m === "usage" ||
      m.includes("atp-package")
  );
}

/**
 * @param missing - Collected gap labels.
 * @returns User-facing multi-line hint for incomplete packages.
 */
export function buildSingleTypeFailureMessage(missing: string[]): string {
  let message =
    "Only package type is set and many properties remain to make the package viable to install, such as:";
  if (missing.includes("name")) message += "\n- name";
  if (missing.includes("usage")) message += "\n- usage (help) information";
  if (missing.includes("components or bundles") || missing.includes("stage.tar (non-empty)")) {
    message += "\n- file components or bundles";
  }
  return message;
}

/**
 * Validate a single-type developer manifest and its flat `stage.tar` layout.
 * Caller must have already ruled out Multi layout and cross-layout conflicts.
 *
 * @param cwd - Package root directory.
 * @param manifest - Parsed `atp-package.yaml`.
 * @returns Validation outcome with exit tier and messages.
 */
export function validateSingleTypePackage(
  cwd: string,
  manifest: DevPackageManifest
): ValidateResult {
  const missing: string[] = [];
  collectSingleTypeRootFieldGaps(manifest, missing);

  if (!hasNonEmptyStageTar(cwd)) {
    missing.push("stage.tar (non-empty)");
  }

  if (missing.length === 0) {
    appendDevPackageRuleSkillFrontmatterViolations(cwd, manifest, missing);
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
