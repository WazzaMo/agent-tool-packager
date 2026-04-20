/**
 * Remove one Multi package part and reindex stage.tar prefixes.
 */

import path from "node:path";

import { partStagePrefix } from "../manifest-layout.js";
import { saveDevManifest } from "../save-manifest.js";
import {
  mutateStageTarContents,
  removePathUnderExtractRoot,
  renameDirectoryUnderExtractRoot,
} from "../stage-tar-mutate.js";

import {
  exitUnlessMultiDevManifest,
  loadDevManifestOrExit,
  parsePartIndex1OrExit,
} from "./guards.js";

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
