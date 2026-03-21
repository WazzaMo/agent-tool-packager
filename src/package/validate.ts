/**
 * Validate package definition. Used by atp validate package and atp catalog add package.
 */

import fs from "node:fs";
import path from "node:path";
import { loadDevManifest } from "./load-manifest.js";

const STAGE_FILE = "stage.tar";

/** Result of package validation. */
export interface ValidateResult {
  ok: boolean;
  exitCode: 0 | 1 | 2;
  missing: string[];
  message: string;
}

/**
 * Validate atp-package.yaml and stage.tar in the package directory.
 *
 * @param cwd - Package root directory
 * @returns Validation result with ok, exitCode, missing fields, and message
 */
export function validatePackage(cwd: string): ValidateResult {
  const pkgPath = path.join(cwd, "atp-package.yaml");
  const stagePath = path.join(cwd, STAGE_FILE);

  const missing: string[] = [];

  if (!fs.existsSync(pkgPath)) {
    return {
      ok: false,
      exitCode: 2,
      missing: ["atp-package.yaml"],
      message: "No atp-package.yaml found. Run 'atp create package skeleton' first.",
    };
  }

  const manifest = loadDevManifest(cwd);
  if (!manifest) {
    return {
      ok: false,
      exitCode: 2,
      missing: ["Valid atp-package.yaml"],
      message: "Could not parse atp-package.yaml.",
    };
  }

  if (!manifest.name || String(manifest.name).trim() === "") missing.push("name");
  if (!manifest.type || String(manifest.type).trim() === "") missing.push("type");
  if (!manifest.version || String(manifest.version).trim() === "") missing.push("version");
  if (!manifest.usage || manifest.usage.length === 0) missing.push("usage");
  const hasComponents = manifest.components && manifest.components.length > 0;
  const hasBundles = manifest.bundles && manifest.bundles.length > 0;
  if (!hasComponents && !hasBundles) missing.push("components or bundles");

  const hasStage = fs.existsSync(stagePath) && fs.statSync(stagePath).size > 0;
  if (!hasStage) missing.push("stage.tar (non-empty)");

  if (missing.length === 0) {
    return {
      ok: true,
      exitCode: 0,
      missing: [],
      message: "Package appears complete. Mandatory minimal values are set.",
    };
  }

  const hasMandatoryMissing = missing.some(
    (m) =>
      m === "name" ||
      m === "type" ||
      m === "version" ||
      m === "usage" ||
      m.includes("atp-package")
  );
  const exitCode: 1 | 2 = hasMandatoryMissing ? 2 : 1;

  let message = "Only package type is set and many properties remain to make the package viable to install, such as:";
  if (missing.includes("name")) message += "\n- name";
  if (missing.includes("usage")) message += "\n- usage (help) information";
  if (missing.includes("components or bundles") || missing.includes("stage.tar (non-empty)")) message += "\n- file components or bundles";

  return {
    ok: false,
    exitCode,
    missing,
    message,
  };
}
