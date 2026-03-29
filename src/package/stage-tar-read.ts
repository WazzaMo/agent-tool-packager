/**
 * Read and query `stage.tar` contents (shared by single-type and multi-type validation).
 */

import { execSync } from "node:child_process";

/** Filename of the developer staging archive in the package root. */
export const STAGE_TAR_FILENAME = "stage.tar";

/**
 * List member paths inside a tar archive, normalised (no leading `./`).
 *
 * @param tarPath - Absolute path to the `.tar` file.
 * @returns Path strings, or an empty array if listing fails.
 */
export function listStageTarEntries(tarPath: string): string[] {
  try {
    const out = execSync(`tar -tf "${tarPath}"`, { encoding: "utf8", stdio: "pipe" });
    return out
      .split("\n")
      .map((l) => l.trim().replace(/^\.\/+/, ""))
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * True if any entry is exactly `prefix` or starts with `prefix/`.
 *
 * @param entries - Normalised tar paths from {@link listStageTarEntries}.
 * @param prefix - Directory prefix (bundle root) without trailing slash.
 */
export function tarEntriesHavePathPrefix(entries: string[], prefix: string): boolean {
  const p = prefix.endsWith("/") ? prefix : `${prefix}/`;
  return entries.some((e) => e === prefix || e.startsWith(p));
}

/**
 * True if any entry is the file `relPath` or lives under `relPath/`.
 *
 * @param entries - Normalised tar paths from {@link listStageTarEntries}.
 * @param relPath - Expected file or tree root inside the archive.
 */
export function tarEntriesHaveFileOrTree(entries: string[], relPath: string): boolean {
  return entries.some((e) => e === relPath || e.startsWith(`${relPath}/`));
}
