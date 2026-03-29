/**
 * Feature 4: Multi-type package part authoring (newpart, per-part usage/components/bundles).
 */

import fs from "node:fs";
import path from "node:path";
import type { BundleDefinition, DevPackageManifest, PackagePart } from "./types.js";
import { loadDevManifest } from "./load-manifest.js";
import { saveDevManifest } from "./save-manifest.js";
import {
  isMultiDevManifest,
  keywordToPackageType,
  legacyHasPartsConflict,
  partStagePrefix,
} from "./manifest-layout.js";
import { validatePackage } from "./validate.js";
import { wouldBundleBasenameCollideForPartAdd } from "./part-bundle-uniqueness.js";
import { componentBasenameCollisionForPartAdd } from "./part-component-uniqueness.js";
import {
  mutateStageTarContents,
  removePathUnderExtractRoot,
  renameDirectoryUnderExtractRoot,
} from "./stage-tar-mutate.js";
import { stageMultiBundleTree, stageMultiComponentFile } from "./stage-multi.js";
import { resolveComponentSourcePath } from "./resolve-component-source.js";

/**
 * @param cwd - Package root directory.
 * @returns Loaded manifest or exits when `atp-package.yaml` is missing.
 */
function loadDevManifestOrExit(cwd: string): DevPackageManifest {
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
function exitUnlessMultiDevManifest(m: DevPackageManifest): void {
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
function exitIfLegacyRootHasParts(m: DevPackageManifest): void {
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
function exitIfIncompletePriorParts(cwd: string, m: DevPackageManifest): void {
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
function parsePartIndex1OrExit(s: string): number {
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
function getPartAtIndexOrExit(m: DevPackageManifest, index1: number): PackagePart {
  const parts = m.parts ?? [];
  const p = parts[index1 - 1];
  if (!p) {
    console.error(`Part ${index1} not found.`);
    process.exit(1);
  }
  return p;
}

/**
 * `atp package newpart <keyword>` — append a typed part to a Multi package.
 *
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
  const dup = parts.some((p) => String(p.type).toLowerCase() === canonical.toLowerCase());
  if (dup) {
    console.warn(`Warning: another part already uses type ${canonical}.`);
  }
  parts.push({ type: canonical, usage: [], components: [], bundles: [] });
  m.parts = parts;
  saveDevManifest(cwd, m);

  const idx = parts.length;
  console.log(`Part ${idx} of ${canonical} type added to package.`);
}

/**
 * @param filePath - Path relative to package root or absolute (same rules as `cp` source).
 * @param pkgRoot - Resolved package root (CLI cwd).
 * Exits when the path is not an existing file.
 */
function assertComponentSourceExistsOrExit(filePath: string, pkgRoot: string): void {
  const resolved = resolveComponentSourcePath(pkgRoot, filePath);
  if (!fs.existsSync(resolved)) {
    console.error("Nominated path or file does not exist.");
    process.exit(1);
  }
  if (!fs.statSync(resolved).isFile()) {
    console.error(`Path is not a file: ${filePath}`);
    process.exit(1);
  }
}

/**
 * `atp package part <n> usage <text...>` — set usage for one part.
 *
 * @param cwd - Package root directory.
 * @param indexStr - 1-based part index.
 * @param textParts - Words joined into a single usage line (max 80 chars).
 */
export function packagePartUsage(cwd: string, indexStr: string, textParts: string[]): void {
  const index1 = parsePartIndex1OrExit(indexStr);
  const m = loadDevManifestOrExit(cwd);
  exitUnlessMultiDevManifest(m);
  const part = getPartAtIndexOrExit(m, index1);
  const text = textParts.join(" ").trim().slice(0, 80);
  if (!text) {
    console.error("Usage text is required.");
    process.exit(1);
  }
  part.usage = [text];
  saveDevManifest(cwd, m);
}

/**
 * `atp package part <n> add usage <text...>` — append one usage line (max 80 chars) for a part.
 *
 * @param cwd - Package root directory.
 * @param indexStr - 1-based part index.
 * @param textParts - Words joined into a single new usage line.
 */
export function packagePartAddUsage(cwd: string, indexStr: string, textParts: string[]): void {
  const index1 = parsePartIndex1OrExit(indexStr);
  const m = loadDevManifestOrExit(cwd);
  exitUnlessMultiDevManifest(m);
  const part = getPartAtIndexOrExit(m, index1);
  const text = textParts.join(" ").trim().slice(0, 80);
  if (!text) {
    console.error("Usage text is required.");
    process.exit(1);
  }
  const existing = part.usage ?? [];
  part.usage = [...existing, text];
  saveDevManifest(cwd, m);
}

/**
 * `atp package part <n> component <path>` — register component and stage under part prefix.
 *
 * @param cwd - Package root directory.
 * @param indexStr - 1-based part index.
 * @param filePath - Path to file relative to `cwd`.
 */
export function packagePartComponentAdd(cwd: string, indexStr: string, filePath: string): void {
  const index1 = parsePartIndex1OrExit(indexStr);
  const pkgRoot = path.resolve(cwd);
  assertComponentSourceExistsOrExit(filePath, pkgRoot);
  const sourceAbs = resolveComponentSourcePath(pkgRoot, filePath);

  const m = loadDevManifestOrExit(cwd);
  exitUnlessMultiDevManifest(m);
  const part = getPartAtIndexOrExit(m, index1);
  const canonical = part.type;
  const prefix = partStagePrefix(index1, canonical);
  const baseName = path.basename(sourceAbs);

  const collision = componentBasenameCollisionForPartAdd(m.parts, index1, baseName);
  if (collision === "same-part") {
    console.error(`Component ${baseName} is already listed for part ${index1}.`);
    process.exit(1);
  }
  if (collision === "other-part") {
    console.error(
      `Component basename "${baseName}" must be unique across all parts in the package.`
    );
    process.exit(1);
  }

  const components = part.components ?? [];
  components.push(baseName);
  part.components = components;
  saveDevManifest(cwd, m);

  stageMultiComponentFile(pkgRoot, prefix, sourceAbs);
  console.log(`Component ${baseName} added to part ${index1}.`);
}

/**
 * @param execBase - Bundle path relative to package root.
 * @param pkgRoot - Resolved package root.
 * Exits when path escapes the package or is not an existing directory.
 */
function assertBundleDirectoryUnderPackageOrExit(execBase: string, pkgRoot: string): void {
  const bundlePath = path.resolve(pkgRoot, execBase);
  const rel = path.relative(pkgRoot, bundlePath);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    console.error(`Invalid path to bundle given: ${execBase}`);
    process.exit(1);
  }
  if (!fs.existsSync(bundlePath)) {
    console.error("Nominated path or directory does not exist.");
    process.exit(1);
  }
  if (!fs.statSync(bundlePath).isDirectory()) {
    console.error(`Path is not a directory: ${execBase}`);
    process.exit(1);
  }
}

/**
 * `atp package part <n> bundle add <execBase> [--exec-filter]` — register bundle and stage tree.
 *
 * @param cwd - Package root directory.
 * @param indexStr - 1-based part index.
 * @param execBase - Bundle directory relative to `cwd`.
 * @param opts - Optional `exec-filter` when there is no `bin/` layout.
 */
export function packagePartBundleAdd(
  cwd: string,
  indexStr: string,
  execBase: string,
  opts?: { execFilter?: string }
): void {
  const index1 = parsePartIndex1OrExit(indexStr);
  const pkgRoot = path.resolve(cwd);
  assertBundleDirectoryUnderPackageOrExit(execBase, pkgRoot);
  const relBase = path.relative(pkgRoot, path.resolve(pkgRoot, execBase));

  const m = loadDevManifestOrExit(cwd);
  exitUnlessMultiDevManifest(m);
  const part = getPartAtIndexOrExit(m, index1);
  const bundlePath = path.resolve(pkgRoot, execBase);

  const hasBin = fs.existsSync(path.join(bundlePath, "bin"));
  if (!hasBin && !opts?.execFilter) {
    console.error(
      "Bundle does not have bin/ directory. Either provide --exec-filter option so " +
        "installation can setup the executables correctly, or place them in a bin/ directory in the bundle."
    );
    process.exit(1);
  }

  const bundles = part.bundles ?? [];
  const existing = bundles.find((b) => {
    if (typeof b === "string") return b === relBase;
    return b.path === relBase;
  });
  if (existing) {
    return;
  }

  if (wouldBundleBasenameCollideForPartAdd(m.parts, relBase, index1)) {
    console.error("Bundle name must be unique across all parts in the package.");
    process.exit(2);
  }

  const def: BundleDefinition = {
    path: relBase,
    "exec-filter": opts?.execFilter ?? `${relBase}/bin/*`,
  };
  bundles.push(def);
  part.bundles = bundles;
  saveDevManifest(cwd, m);

  const prefix = partStagePrefix(index1, part.type);
  stageMultiBundleTree(pkgRoot, prefix, relBase, bundlePath);
}

/**
 * Split a manifest-relative path into segments for the extract root.
 *
 * @param rel - Path using `/` or platform separators.
 */
function archivePathSegments(rel: string): string[] {
  return rel.split(/[/\\]/).filter(Boolean);
}

/**
 * `atp package part <n> component remove <path>` — drop component from manifest and `stage.tar`.
 *
 * @param cwd - Package root directory.
 * @param indexStr - 1-based part index.
 * @param filePath - Component path (basename matched against manifest list).
 */
export function packagePartComponentRemove(
  cwd: string,
  indexStr: string,
  filePath: string
): void {
  const index1 = parsePartIndex1OrExit(indexStr);
  const pkgRoot = path.resolve(cwd);
  const baseName = path.basename(filePath.trim());

  const m = loadDevManifestOrExit(cwd);
  exitUnlessMultiDevManifest(m);
  const part = getPartAtIndexOrExit(m, index1);
  const components = part.components ?? [];
  if (!components.includes(baseName)) {
    console.error("Component had not been included in this part.");
    process.exit(1);
  }

  const prefix = partStagePrefix(index1, part.type);
  try {
    mutateStageTarContents(pkgRoot, (extractRoot) => {
      removePathUnderExtractRoot(extractRoot, [prefix, baseName]);
    });
  } catch (err) {
    console.error(String(err));
    process.exit(1);
  }

  part.components = components.filter((c) => c !== baseName);
  saveDevManifest(cwd, m);
}

/**
 * `atp package part <n> bundle remove <execBase>` — drop bundle from manifest and `stage.tar`.
 *
 * @param cwd - Package root directory.
 * @param indexStr - 1-based part index.
 * @param execBase - Bundle directory relative to package root.
 */
export function packagePartBundleRemove(
  cwd: string,
  indexStr: string,
  execBase: string
): void {
  const index1 = parsePartIndex1OrExit(indexStr);
  const pkgRoot = path.resolve(cwd);
  const bundlePath = path.resolve(pkgRoot, execBase);
  const relBase = path.relative(pkgRoot, bundlePath);
  if (relBase.startsWith("..") || path.isAbsolute(relBase)) {
    console.error(`Invalid path to bundle given: ${execBase}`);
    process.exit(1);
  }

  const m = loadDevManifestOrExit(cwd);
  exitUnlessMultiDevManifest(m);
  const part = getPartAtIndexOrExit(m, index1);
  const bundles = part.bundles ?? [];
  const found = bundles.find((b) => {
    if (typeof b === "string") return b === relBase;
    return b.path === relBase;
  });
  if (!found) {
    console.error("Bundle had not been included in this part.");
    process.exit(1);
  }

  const prefix = partStagePrefix(index1, part.type);
  const bundleSegments = archivePathSegments(relBase);

  try {
    mutateStageTarContents(pkgRoot, (extractRoot) => {
      removePathUnderExtractRoot(extractRoot, [prefix, ...bundleSegments]);
    });
  } catch (err) {
    console.error(String(err));
    process.exit(1);
  }

  part.bundles = bundles.filter((b) => {
    if (typeof b === "string") return b !== relBase;
    return b.path !== relBase;
  });
  saveDevManifest(cwd, m);
}

/**
 * `atp package part <n> remove` — remove one part, delete its staging prefix, reindex later parts.
 *
 * @param cwd - Package root directory.
 * @param indexStr - 1-based part index to remove.
 */
export function packagePartRemove(cwd: string, indexStr: string): void {
  const r = parsePartIndex1OrExit(indexStr);
  const m = loadDevManifestOrExit(cwd);
  exitUnlessMultiDevManifest(m);
  const oldParts = m.parts ?? [];
  if (r < 1 || r > oldParts.length) {
    console.error(`Part ${r} not found.`);
    process.exit(1);
  }

  const removed = oldParts[r - 1];
  const newParts = [...oldParts.slice(0, r - 1), ...oldParts.slice(r)];
  const pkgRoot = path.resolve(cwd);

  try {
    mutateStageTarContents(pkgRoot, (extractRoot) => {
      removePathUnderExtractRoot(extractRoot, [partStagePrefix(r, removed.type)]);
      for (let i = r + 1; i <= oldParts.length; i++) {
        const oldPrefix = partStagePrefix(i, oldParts[i - 1].type);
        const newPrefix = partStagePrefix(i - 1, newParts[i - 2].type);
        if (oldPrefix === newPrefix) {
          continue;
        }
        renameDirectoryUnderExtractRoot(extractRoot, [oldPrefix], [newPrefix]);
      }
    });
  } catch (err) {
    console.error(String(err));
    process.exit(1);
  }

  m.parts = newParts;
  saveDevManifest(cwd, m);
  console.log(`Removed part ${r}. ${newParts.length} part(s) remain.`);
}
