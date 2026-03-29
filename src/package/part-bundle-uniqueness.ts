/**
 * Package-global bundle directory basename uniqueness for Multi-type parts (Feature 4).
 */

import path from "node:path";

import type { PackagePart } from "./types.js";

/**
 * Whether adding `relBase` to part `partIndex1` would collide with another part’s bundle basename.
 * The same part’s **identical** `relBase` is not a collision (idempotent re-add).
 *
 * @param parts - Manifest `parts` array.
 * @param relBase - Bundle path relative to package root.
 * @param partIndex1 - 1-based target part index.
 * @returns `true` when basename matches another bundle elsewhere or another path in the same part.
 */
export function wouldBundleBasenameCollideForPartAdd(
  parts: PackagePart[] | undefined,
  relBase: string,
  partIndex1: number
): boolean {
  const targetBasename = path.basename(relBase) || relBase;
  const list = parts ?? [];

  for (let i = 0; i < list.length; i++) {
    const idx = i + 1;
    for (const b of list[i].bundles ?? []) {
      const p = typeof b === "string" ? b : b.path;
      const bn = path.basename(p) || p;
      if (bn !== targetBasename) {
        continue;
      }
      if (idx === partIndex1 && p === relBase) {
        continue;
      }
      return true;
    }
  }
  return false;
}
