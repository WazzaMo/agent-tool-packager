/**
 * Save atp-package.yaml in Feature 2 format (flat YAML for simplicity).
 */

import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import type { DevPackageManifest } from "./types.js";

const PACKAGE_FILE = "atp-package.yaml";

const FIELD_MAX_LEN = 80;

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max);
}

function sanitizeYaml(s: string): string {
  return truncate(s, FIELD_MAX_LEN);
}

/**
 * Save manifest to atp-package.yaml in flat YAML format.
 * Truncates string fields to 80 chars; omits empty arrays for bundles.
 *
 * @param cwd - Package root directory
 * @param manifest - Manifest to persist
 */
export function saveDevManifest(cwd: string, manifest: DevPackageManifest): void {
  const pkgPath = path.join(cwd, PACKAGE_FILE);
  const out: Record<string, unknown> = {};

  if (manifest.name != null) out.name = sanitizeYaml(manifest.name);
  if (manifest.type != null) out.type = sanitizeYaml(manifest.type);
  if (manifest.developer != null) out.developer = sanitizeYaml(manifest.developer);
  if (manifest.license != null) out.license = sanitizeYaml(manifest.license);
  if (manifest.version != null) out.version = sanitizeYaml(manifest.version);
  if (manifest.copyright != null && manifest.copyright.length > 0) out.copyright = manifest.copyright.map(sanitizeYaml);
  if (manifest.usage != null && manifest.usage.length > 0) out.usage = manifest.usage.map(sanitizeYaml);
  if (manifest.components != null) out.components = manifest.components;
  if (manifest.bundles != null && manifest.bundles.length > 0) out.bundles = manifest.bundles;

  fs.writeFileSync(pkgPath, yaml.dump(out, { lineWidth: 120 }), "utf8");
}
