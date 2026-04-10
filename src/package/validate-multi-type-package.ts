/**
 * Validation for Multi-type developer manifests (Feature 4 layout).
 */

import fs from "node:fs";
import path from "node:path";

import { partStagePrefix } from "./manifest-layout.js";
import {
  STAGE_TAR_FILENAME,
  listStageTarEntries,
  tarEntriesHaveFileOrTree,
  tarEntriesHavePathPrefix,
} from "./stage-tar-read.js";

import type { DevPackageManifest, PackagePart } from "./types.js";
import type { ValidateResult } from "./validate-types.js";
import { appendDevPackageRuleSkillFrontmatterViolations } from "./validate-rule-skill-frontmatter.js";

/**
 * @param manifest - Parsed developer manifest.
 * @param missing - List to append into.
 */
export function collectMultiRootMetadataGaps(manifest: DevPackageManifest, missing: string[]): void {
  if (!manifest.name || String(manifest.name).trim() === "") missing.push("name");
  if (!manifest.version || String(manifest.version).trim() === "") missing.push("version");
  if (!manifest.type || String(manifest.type).trim() === "") missing.push("type");
}

/**
 * @param parts - Parts list from the manifest (may be empty).
 * @param missing - List to append into.
 */
export function collectMultiPartStructureGaps(parts: PackagePart[], missing: string[]): void {
  if (parts.length === 0) {
    missing.push("parts (at least one required for Multi)");
    return;
  }

  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const n = i + 1;
    if (!p.type || String(p.type).trim() === "") missing.push(`part ${n}: type`);
    if (!p.usage || p.usage.length === 0 || !String(p.usage[0] ?? "").trim()) {
      missing.push(`part ${n}: usage`);
    }
    const comps = p.components ?? [];
    const bundles = p.bundles ?? [];
    if (comps.length === 0 && bundles.length === 0) {
      missing.push(`part ${n}: components or bundles`);
    }
  }
}

/**
 * Append gaps when the same component basename appears more than once in one part
 * or in more than one part (install/catalog layout requires unique basenames).
 *
 * @param parts - Declared parts.
 * @param missing - List to append into.
 */
export function collectDuplicateComponentBasenameGaps(parts: PackagePart[], missing: string[]): void {
  const basenameToParts = new Map<string, Set<number>>();
  for (let i = 0; i < parts.length; i++) {
    const partComps = parts[i].components ?? [];
    const seenInPart = new Set<string>();
    for (const c of partComps) {
      if (seenInPart.has(c)) {
        missing.push(`duplicate component "${c}" in part ${i + 1} components list`);
      }
      seenInPart.add(c);
      let set = basenameToParts.get(c);
      if (!set) {
        set = new Set();
        basenameToParts.set(c, set);
      }
      set.add(i + 1);
    }
  }
  for (const [bn, partNums] of basenameToParts) {
    if (partNums.size > 1) {
      const ordered = [...partNums].sort((a, b) => a - b);
      missing.push(
        `component basename "${bn}" must be unique across parts (used in parts ${ordered.join(", ")})`
      );
    }
  }
}

/**
 * Compare staged tar paths to each part’s declared components and bundles.
 *
 * @param cwd - Package root directory.
 * @param parts - Declared parts (non-empty).
 * @param missing - List to append staging mismatches into.
 */
function appendMultiTypeStagingGaps(cwd: string, parts: PackagePart[], missing: string[]): void {
  const stagePath = path.join(cwd, STAGE_TAR_FILENAME);
  if (!fs.existsSync(stagePath) || fs.statSync(stagePath).size === 0) {
    missing.push("stage.tar (non-empty)");
    return;
  }

  const entries = listStageTarEntries(stagePath);

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const index1 = i + 1;
    const prefix = partStagePrefix(index1, part.type);
    appendComponentStagingGaps(entries, part.components ?? [], prefix, index1, missing);
    appendBundleStagingGaps(entries, part.bundles ?? [], prefix, index1, missing);
  }
}

/**
 * @param entries - Tar member paths.
 * @param components - Basenames listed on the part.
 * @param prefix - `part_N_Type` prefix inside the archive.
 * @param partIndex1 - 1-based part index (for messages).
 * @param missing - Output list.
 */
function appendComponentStagingGaps(
  entries: string[],
  components: string[],
  prefix: string,
  partIndex1: number,
  missing: string[]
): void {
  for (const c of components) {
    const rel = `${prefix}/${c}`;
    if (!tarEntriesHaveFileOrTree(entries, rel)) {
      missing.push(`part ${partIndex1}: staged file missing (${rel})`);
    }
  }
}

/**
 * @param entries - Tar member paths.
 * @param bundles - Bundle specs for the part.
 * @param prefix - `part_N_Type` prefix inside the archive.
 * @param partIndex1 - 1-based part index (for messages).
 * @param missing - Output list.
 */
function appendBundleStagingGaps(
  entries: string[],
  bundles: Array<string | { path: string }>,
  prefix: string,
  partIndex1: number,
  missing: string[]
): void {
  for (const b of bundles) {
    const bp = typeof b === "string" ? b : b.path;
    const rel = `${prefix}/${bp}`;
    if (!tarEntriesHavePathPrefix(entries, rel)) {
      missing.push(`part ${partIndex1}: staged bundle missing (${rel})`);
    }
  }
}

/**
 * @param parts - Declared parts.
 * @returns True when two or more parts share the same normalised type string.
 */
export function hasDuplicatePartTypes(parts: PackagePart[]): boolean {
  const types = parts.map((p) => String(p.type ?? "").trim().toLowerCase());
  return new Set(types).size !== types.length;
}

/**
 * @param m - A single missing-field label.
 * @returns True when this label should block staging checks (fatal structural gap).
 */
export function isFatalMultiFieldMissing(m: string): boolean {
  if (m === "name" || m === "version" || m === "type" || m.includes("at least one")) {
    return true;
  }
  return (
    m.startsWith("part ") &&
    (m.includes("type") || m.includes("usage") || m.includes("components or bundles"))
  );
}

/**
 * @param missing - All collected gaps.
 * @returns True when exit code should be 2 (mandatory).
 */
export function multiTypeHasMandatoryFailure(missing: string[]): boolean {
  return missing.some(
    (m) =>
      m === "name" ||
      m === "version" ||
      m === "type" ||
      m.includes("at least one") ||
      (m.startsWith("part ") && (m.includes("type") || m.includes("usage")))
  );
}

/**
 * Validate a Multi-type developer manifest and per-part `stage.tar` layout.
 * Caller must have already ruled out root payload conflicts on Multi.
 *
 * @param cwd - Package root directory.
 * @param manifest - Parsed `atp-package.yaml`.
 * @returns Validation outcome with exit tier and messages.
 */
export function validateMultiTypePackage(
  cwd: string,
  manifest: DevPackageManifest
): ValidateResult {
  const missing: string[] = [];
  collectMultiRootMetadataGaps(manifest, missing);

  const parts = manifest.parts ?? [];
  collectMultiPartStructureGaps(parts, missing);

  if (parts.length > 0) {
    collectDuplicateComponentBasenameGaps(parts, missing);
  }

  const hasComponentUniquenessGap = missing.some(
    (m) =>
      m.startsWith("duplicate component ") ||
      m.includes("must be unique across parts")
  );

  const hasFatalStructuralGap = missing.some(isFatalMultiFieldMissing);
  if (!hasFatalStructuralGap && parts.length > 0 && !hasComponentUniquenessGap) {
    appendMultiTypeStagingGaps(cwd, parts, missing);
  }

  if (missing.length === 0) {
    appendDevPackageRuleSkillFrontmatterViolations(cwd, manifest, missing);
  }

  if (missing.length === 0) {
    if (hasDuplicatePartTypes(parts)) {
      console.warn("Warning: duplicate part types in this package (allowed, but unusual).");
    }
    return {
      ok: true,
      exitCode: 0,
      missing: [],
      message:
        "Package appears complete. Mandatory minimal values are set for Multi layout. " +
        "Each part has usage; staged content matches part components and bundles.",
    };
  }

  const exitCode: 1 | 2 = multiTypeHasMandatoryFailure(missing) ? 2 : 1;
  return {
    ok: false,
    exitCode,
    missing,
    message: "Multi package validation failed.",
  };
}
