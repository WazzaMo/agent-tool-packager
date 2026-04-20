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

/**
 * Read one member from a tar archive as UTF-8 text (for validation without extracting).
 *
 * @param tarPath - Absolute path to the archive.
 * @param memberPath - Member path as listed by {@link listStageTarEntries} (posix, no leading `./`).
 * @returns File text, or `null` when missing or `tar` fails.
 */
export function readStageTarMemberUtf8(tarPath: string, memberPath: string): string | null {
  const norm = memberPath.replace(/^\.\/+/, "").replace(/\\/g, "/");
  const candidates = [norm, `./${norm}`];
  for (const member of candidates) {
    try {
      const out = execSync(`tar -xOf "${tarPath}" "${member}"`, {
        encoding: "utf8",
        maxBuffer: 20 * 1024 * 1024,
        stdio: ["pipe", "pipe", "pipe"],
      });
      return out as string;
    } catch {
      /* try next */
    }
  }
  const entries = listStageTarEntries(tarPath);
  const hit =
    entries.find((e) => e === norm) ??
    entries.find((e) => e.replace(/^\.\/+/, "") === norm) ??
    entries.find((e) => e.endsWith(`/${norm}`));
  if (!hit) {
    return null;
  }
  for (const member of [hit, `./${hit}`]) {
    try {
      return execSync(`tar -xOf "${tarPath}" "${member}"`, {
        encoding: "utf8",
        maxBuffer: 20 * 1024 * 1024,
        stdio: ["pipe", "pipe", "pipe"],
      }) as string;
    } catch {
      /* try next */
    }
  }
  return null;
}
