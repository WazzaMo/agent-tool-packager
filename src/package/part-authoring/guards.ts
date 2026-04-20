/**
 * Shared manifest checks and part index parsing for multi-part package authoring.
 */

import { loadDevManifest } from "../load-manifest.js";
import {
  isMultiDevManifest,
  legacyHasPartsConflict,
} from "../manifest-layout.js";
import { validatePackage } from "../validate.js";

import type { DevPackageManifest, PackagePart } from "../types.js";

/**
 * @param cwd - Package root directory.
 * @returns Loaded manifest or exits when `atp-package.yaml` is missing.
 */
export function loadDevManifestOrExit(cwd: string): DevPackageManifest {
  const m = loadDevManifest(cwd);
  if (!m) {
    console.error("No atp-package.yaml found. Run `atp create package skeleton` first.");
    process.exit(1);
  }
  return m;
}

/**
 * @param m - Parsed manifest.
 * Exits when root type is not Multi.
 */
export function exitUnlessMultiDevManifest(m: DevPackageManifest): void {
  if (!isMultiDevManifest(m)) {
    console.error(
      "Not a Multi-type package. Use `atp create package skeleton` (default) or add parts only when type is Multi."
    );
    process.exit(1);
  }
}

/**
 * @param m - Parsed manifest.
 * Exits when a non-Multi root has a non-empty `parts` list.
 */
export function exitIfLegacyRootHasParts(m: DevPackageManifest): void {
  if (legacyHasPartsConflict(m)) {
    console.error("Legacy single-type package cannot contain parts. Use Multi layout or remove parts.");
    process.exit(1);
  }
}

/**
 * Ensure existing parts validate before appending another (Feature 4).
 *
 * @param cwd - Package root directory.
 * @param m - Current manifest.
 */
export function exitIfIncompletePriorParts(cwd: string, m: DevPackageManifest): void {
  const parts = m.parts ?? [];
  if (parts.length === 0) return;
  const v = validatePackage(cwd);
  if (!v.ok) {
    console.error("Complete or fix existing parts before adding a new part.");
    console.error(v.message);
    for (const line of v.missing) {
      console.error(`  - ${line}`);
    }
    process.exit(1);
  }
}

/**
 * @param s - User-supplied 1-based index string.
 * @returns Parsed positive integer.
 */
export function parsePartIndex1OrExit(s: string): number {
  const n = Number.parseInt(s, 10);
  if (!Number.isFinite(n) || n < 1) {
    console.error(`Invalid part index: ${s}`);
    process.exit(1);
  }
  return n;
}

/**
 * @param m - Parsed manifest.
 * @param index1 - 1-based part index.
 * @returns The referenced part or exits when out of range.
 */
export function getPartAtIndexOrExit(m: DevPackageManifest, index1: number): PackagePart {
  const parts = m.parts ?? [];
  const p = parts[index1 - 1];
  if (!p) {
    console.error(`Part ${index1} not found.`);
    process.exit(1);
  }
  return p;
}
