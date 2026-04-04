/**
 * Per-part usage lines for Multi packages.
 */

import { saveDevManifest } from "../save-manifest.js";

import {
  exitUnlessMultiDevManifest,
  getPartAtIndexOrExit,
  loadDevManifestOrExit,
  parsePartIndex1OrExit,
} from "./guards.js";

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
