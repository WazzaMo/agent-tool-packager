/**
 * Replace or append a delimiter-bounded region in markdown (op **4** Markdown aggregate).
 */

/** Policy when begin/end markers are absent in an existing file. */
export type ManagedBlockIfMissing = "append_to_file" | "create_file" | "fail";

function countOccurrences(haystack: string, needle: string): number {
  if (needle === "") {
    return 0;
  }
  let n = 0;
  let i = 0;
  while (true) {
    const j = haystack.indexOf(needle, i);
    if (j === -1) {
      return n;
    }
    n += 1;
    i = j + needle.length;
  }
}

/**
 * Produce full file text after applying a managed block.
 *
 * @param existing - Current file UTF-8 text, or `null` if the file does not exist.
 * @param beginMarker - Opening delimiter (must be unique in the file when present).
 * @param endMarker - Closing delimiter (must be unique in the file when present).
 * @param body - Markdown body placed between markers (markers not included in `body`).
 * @param ifMissing - Behaviour when markers are missing in an existing file, or when `existing` is null with `fail`.
 * @returns New file contents.
 */
export function applyManagedBlockToText(
  existing: string | null,
  beginMarker: string,
  endMarker: string,
  body: string,
  ifMissing: ManagedBlockIfMissing
): string {
  const block = `${beginMarker}\n${body}\n${endMarker}\n`;

  if (existing === null) {
    if (ifMissing === "fail") {
      throw new Error("Managed block patch: target file is missing and ifMissing is fail.");
    }
    return block;
  }

  const begins = countOccurrences(existing, beginMarker);
  const ends = countOccurrences(existing, endMarker);
  if (begins > 1 || ends > 1) {
    throw new Error(
      `Managed block patch: begin/end markers must appear at most once (found ${begins} / ${ends}).`
    );
  }

  const i = existing.indexOf(beginMarker);
  if (i === -1) {
    if (ifMissing === "fail") {
      throw new Error("Managed block patch: begin marker not found and ifMissing is fail.");
    }
    if (ifMissing === "create_file") {
      throw new Error(
        "Managed block patch: file exists but begin marker is absent (ifMissing create_file is only for new files)."
      );
    }
    const sep = existing.length === 0 || existing.endsWith("\n") ? "" : "\n";
    return `${existing}${sep}${block}`;
  }

  const j = existing.indexOf(endMarker, i + beginMarker.length);
  if (j === -1) {
    throw new Error("Managed block patch: end marker not found after begin marker.");
  }

  const before = existing.slice(0, i);
  const after = existing.slice(j + endMarker.length);
  return `${before}${block}${after}`;
}
