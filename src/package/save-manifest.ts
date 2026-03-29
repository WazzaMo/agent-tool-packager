/**
 * Save atp-package.yaml in Feature 2 / Feature 4 format (flat YAML).
 */

import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import type { DevPackageManifest } from "./types.js";
import { buildDevManifestYamlRecord } from "./manifest-yaml-serialise.js";

const PACKAGE_FILE = "atp-package.yaml";

/**
 * Persist manifest to `atp-package.yaml`. Single-type vs multi-type body shape is
 * delegated to {@link buildDevManifestYamlRecord}.
 *
 * @param cwd - Package root directory.
 * @param manifest - In-memory manifest to serialise.
 */
export function saveDevManifest(cwd: string, manifest: DevPackageManifest): void {
  const pkgPath = path.join(cwd, PACKAGE_FILE);
  const out = buildDevManifestYamlRecord(manifest);
  fs.writeFileSync(pkgPath, yaml.dump(out, { lineWidth: 120 }), "utf8");
}
