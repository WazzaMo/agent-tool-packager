/**
 * Detect Multi vs legacy single-type developer manifests (Feature 4).
 */

import type { DevPackageManifest } from "./types.js";

/**
 * @param manifest - Parsed developer manifest.
 * @returns Root `type` trimmed and lowercased for comparisons.
 */
export function normalisedRootType(manifest: DevPackageManifest): string {
  return String(manifest.type ?? "").trim().toLowerCase();
}

/**
 * @param manifest - Parsed developer manifest.
 * @returns True when root type is Multi (case-insensitive).
 */
export function isMultiDevManifest(manifest: DevPackageManifest): boolean {
  return normalisedRootType(manifest) === "multi";
}

/**
 * Map a CLI keyword to the canonical manifest type name.
 *
 * @param keyword - User token such as `rule` or `mcp`.
 * @returns Canonical type, or null when unknown.
 */
export function keywordToPackageType(keyword: string): string | null {
  const t = keyword.trim().toLowerCase();
  const map: Record<string, string> = {
    rule: "Rule",
    skill: "Skill",
    mcp: "Mcp",
    shell: "Command",
    other: "Experimental",
  };
  return map[t] ?? null;
}

/**
 * Build the directory prefix for one part inside `stage.tar` / catalog paths.
 *
 * @param partIndex1 - 1-based part index.
 * @param canonicalType - Part type as stored in YAML (e.g. `Skill`).
 * @returns String such as `part_1_Skill`.
 */
export function partStagePrefix(partIndex1: number, canonicalType: string): string {
  return `part_${partIndex1}_${canonicalType}`;
}

/**
 * @param manifest - Parsed developer manifest.
 * @returns True when a non-Multi root type is combined with a non-empty `parts` list.
 */
export function legacyHasPartsConflict(manifest: DevPackageManifest): boolean {
  if (isMultiDevManifest(manifest)) return false;
  const t = normalisedRootType(manifest);
  if (t === "" || t === "multi") return false;
  const parts = manifest.parts ?? [];
  return parts.length > 0;
}

/**
 * @param manifest - Parsed developer manifest.
 * @returns True when root type is Multi but usage/components/bundles appear at root.
 */
export function multiHasRootPayloadConflict(manifest: DevPackageManifest): boolean {
  if (!isMultiDevManifest(manifest)) return false;
  const hasUsage = (manifest.usage?.length ?? 0) > 0;
  const hasComponents = (manifest.components?.length ?? 0) > 0;
  const hasBundles = (manifest.bundles?.length ?? 0) > 0;
  return hasUsage || hasComponents || hasBundles;
}
