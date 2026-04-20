/**
 * Package-wide component file basename uniqueness for Multi-type parts (Feature 4).
 */

import type { PackagePart } from "./types.js";

export type ComponentBasenameCollision = "same-part" | "other-part";

/**
 * Whether {@link baseName} is already used as a component and cannot be added again
 * to part {@link partIndex1} (1-based).
 *
 * @param parts - Manifest `parts` array.
 * @param partIndex1 - Target part index (1-based).
 * @param baseName - Basename of the file to add (e.g. `doc-guide.md`).
 * @returns `same-part` if already listed on that part, `other-part` if listed on another part, else `null`.
 */
export function componentBasenameCollisionForPartAdd(
  parts: PackagePart[] | undefined,
  partIndex1: number,
  baseName: string
): ComponentBasenameCollision | null {
  const list = parts ?? [];
  const idx = partIndex1 - 1;
  if (idx < 0 || idx >= list.length) return null;

  const currentComps = list[idx].components ?? [];
  if (currentComps.includes(baseName)) {
    return "same-part";
  }

  for (let i = 0; i < list.length; i++) {
    if (i === idx) continue;
    if ((list[i].components ?? []).includes(baseName)) {
      return "other-part";
    }
  }
  return null;
}
