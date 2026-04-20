/**
 * Build the YAML-ready object for atp-package.yaml (single-type vs multi-type bodies).
 */

import { isMultiDevManifest } from "./manifest-layout.js";

import type { DevPackageManifest, PackagePart } from "./types.js";

const FIELD_MAX_LEN = 80;

/**
 * @param s - Input string.
 * @param max - Maximum length.
 * @returns `s` truncated to `max` characters when longer.
 */
function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max);
}

/**
 * @param s - Raw string from manifest fields.
 * @returns Sanitised string safe for YAML scalar length.
 */
function sanitizeYaml(s: string): string {
  return truncate(s, FIELD_MAX_LEN);
}

/**
 * @param parts - In-memory part definitions.
 * @returns Plain objects suitable for `js-yaml` dump under `parts`.
 */
function serialiseParts(parts: PackagePart[]): unknown[] {
  return parts.map((p) => {
    const row: Record<string, unknown> = {
      type: sanitizeYaml(p.type),
      usage: (p.usage ?? []).map(sanitizeYaml),
    };
    if (p.components != null && p.components.length > 0) {
      row.components = p.components;
    }
    if (p.bundles != null && p.bundles.length > 0) {
      row.bundles = p.bundles;
    }
    return row;
  });
}

/**
 * Root metadata fields shared by both single-type and multi-type layouts.
 *
 * @param manifest - Parsed developer manifest.
 * @returns Record with name, type, developer, license, version, copyright when set.
 */
function serialiseSharedRootFields(manifest: DevPackageManifest): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (manifest.name != null) out.name = sanitizeYaml(manifest.name);
  if (manifest.type != null) out.type = sanitizeYaml(manifest.type);
  if (manifest.developer != null) out.developer = sanitizeYaml(manifest.developer);
  if (manifest.license != null) out.license = sanitizeYaml(manifest.license);
  if (manifest.version != null) out.version = sanitizeYaml(manifest.version);
  if (manifest.copyright != null && manifest.copyright.length > 0) {
    out.copyright = manifest.copyright.map(sanitizeYaml);
  }
  return out;
}

/**
 * Multi-type body: root metadata plus `parts` only (no root usage/components/bundles).
 *
 * @param manifest - Parsed multi-type manifest.
 * @returns Object to pass to `yaml.dump`.
 */
export function buildMultiTypeYamlRecord(manifest: DevPackageManifest): Record<string, unknown> {
  const out = serialiseSharedRootFields(manifest);
  out.parts = serialiseParts(manifest.parts ?? []);
  return out;
}

/**
 * Single-type body: root metadata plus root usage, components, bundles.
 *
 * @param manifest - Parsed single-type manifest.
 * @returns Object to pass to `yaml.dump`.
 */
export function buildSingleTypeYamlRecord(manifest: DevPackageManifest): Record<string, unknown> {
  const out = serialiseSharedRootFields(manifest);
  if (manifest.usage != null && manifest.usage.length > 0) {
    out.usage = manifest.usage.map(sanitizeYaml);
  }
  if (manifest.components != null) out.components = manifest.components;
  if (manifest.bundles != null && manifest.bundles.length > 0) out.bundles = manifest.bundles;
  return out;
}

/**
 * Build the full document object for the current manifest layout.
 *
 * @param manifest - Parsed developer manifest.
 * @returns YAML-ready root record for `atp-package.yaml`.
 */
export function buildDevManifestYamlRecord(manifest: DevPackageManifest): Record<string, unknown> {
  if (isMultiDevManifest(manifest)) {
    return buildMultiTypeYamlRecord(manifest);
  }
  return buildSingleTypeYamlRecord(manifest);
}
