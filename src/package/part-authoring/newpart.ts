/**
 * `atp package newpart` — append a typed part to a Multi package.
 */

import { keywordToPackageType } from "../manifest-layout.js";
import { saveDevManifest } from "../save-manifest.js";

import {
  exitIfIncompletePriorParts,
  exitIfLegacyRootHasParts,
  exitUnlessMultiDevManifest,
  loadDevManifestOrExit,
} from "./guards.js";

/**
 * @param cwd - Package root directory.
 * @param keyword - CLI token (`rule`, `skill`, …).
 */
export function packageNewpart(cwd: string, keyword: string): void {
  const k = keyword.trim().toLowerCase();
  if (k === "multi") {
    console.error("'multi' is reserved for the package root type, not a part type.");
    process.exit(1);
  }
  const canonical = keywordToPackageType(keyword);
  if (!canonical) {
    console.error(
      `Unknown part type keyword: ${keyword}. Use rule, prompt, skill, hook, mcp, shell, or other.`
    );
    process.exit(1);
  }

  const m = loadDevManifestOrExit(cwd);
  exitIfLegacyRootHasParts(m);
  exitUnlessMultiDevManifest(m);
  exitIfIncompletePriorParts(cwd, m);

  const parts = m.parts ?? [];
  parts.push({ type: canonical, usage: [], components: [], bundles: [] });
  m.parts = parts;
  saveDevManifest(cwd, m);

  const idx = parts.length;
  console.log(`Part ${idx} of ${canonical} type added to package.`);
}
