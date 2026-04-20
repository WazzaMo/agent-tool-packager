/**
 * Guardrails: root-level component/bundle staging applies only to single-type packages.
 */

import { isMultiDevManifest } from "./manifest-layout.js";

import type { DevPackageManifest } from "./types.js";

/**
 * Exit with code 1 when the manifest is Multi (part-scoped commands must be used).
 *
 * @param manifest - Parsed developer manifest.
 * @param commandHint - Subcommand fragment shown in the error (e.g. `component <path>`).
 */
export function exitIfMultiUsesRootStaging(manifest: DevPackageManifest, commandHint: string): void {
  if (!isMultiDevManifest(manifest)) return;
  console.error(
    `Multi-type package: use \`atp package part <n> ${commandHint}\` instead of \`atp package ${commandHint}\`.`
  );
  process.exit(1);
}

/**
 * Exit with code 1 for legacy remove on Multi packages (not yet part-scoped).
 *
 * @param manifest - Parsed developer manifest.
 */
export function exitIfMultiDevManifestForLegacyRemove(manifest: DevPackageManifest): void {
  if (!isMultiDevManifest(manifest)) return;
  console.error(
    "Multi package: use `atp package part <n> component remove <path>` or `part <n> bundle remove <dir>`, or edit atp-package.yaml."
  );
  process.exit(1);
}
