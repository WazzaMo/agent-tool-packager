/**
 * Per-part components: add/remove manifest entries and stage.tar paths.
 */

import fs from "node:fs";
import path from "node:path";

import { partStagePrefix } from "../manifest-layout.js";
import { componentBasenameCollisionForPartAdd } from "../part-component-uniqueness.js";
import { resolveComponentSourcePath } from "../resolve-component-source.js";
import { saveDevManifest } from "../save-manifest.js";
import { stageMultiComponentFile } from "../stage-multi.js";
import { mutateStageTarContents, removePathUnderExtractRoot } from "../stage-tar-mutate.js";

import {
  exitUnlessMultiDevManifest,
  getPartAtIndexOrExit,
  loadDevManifestOrExit,
  parsePartIndex1OrExit,
} from "./guards.js";

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
