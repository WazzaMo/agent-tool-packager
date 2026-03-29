/**
 * Console output sections for `atp package summary` (shared vs layout-specific).
 */

import type { DevPackageManifest } from "./types.js";

/**
 * Print name, type, developer, license, version, copyright (all layouts).
 *
 * @param manifest - Parsed developer manifest.
 */
export function printManifestCommonHeader(manifest: DevPackageManifest): void {
  if (manifest.name) console.log(`  Name: ${manifest.name}`);
  if (manifest.type) console.log(`  Type: ${manifest.type}`);
  if (manifest.developer) console.log(`  Developer: ${manifest.developer}`);
  if (manifest.license) console.log(`  License: ${manifest.license}`);
  if (manifest.version) console.log(`  Version: ${manifest.version}`);
  if (manifest.copyright?.length) {
    console.log(`  Copyright: ${manifest.copyright.join(", ")}`);
  }
}

/**
 * Print root usage, components, bundles (single-type only).
 *
 * @param manifest - Parsed single-type manifest.
 */
export function printSingleTypePayloadSection(manifest: DevPackageManifest): void {
  if (manifest.usage?.length) console.log(`  Usage: ${manifest.usage.join(" ")}`);
  if (manifest.components?.length) {
    console.log(`  Components: ${manifest.components.join(", ")}`);
  }
  if (manifest.bundles?.length) {
    const paths = manifest.bundles.map((b) => (typeof b === "string" ? b : b.path));
    console.log(`  Bundles: ${paths.join(", ")}`);
  }
}

/**
 * Print per-part breakdown (multi-type).
 *
 * @param manifest - Parsed multi-type manifest.
 */
export function printMultiTypePartsSection(manifest: DevPackageManifest): void {
  const parts = manifest.parts ?? [];
  if (parts.length === 0) return;
  console.log(`  Parts (${parts.length}):`);
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const n = i + 1;
    console.log(`    Part ${n}: type ${p.type}`);
    if (p.usage?.length) console.log(`      Usage: ${p.usage.join(" | ")}`);
    if (p.components?.length) console.log(`      Components: ${p.components.join(", ")}`);
    if (p.bundles?.length) {
      const bp = p.bundles.map((b) => (typeof b === "string" ? b : b.path));
      console.log(`      Bundles: ${bp.join(", ")}`);
    }
  }
}
