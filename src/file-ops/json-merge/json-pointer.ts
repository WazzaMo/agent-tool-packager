/**
 * RFC 6901 JSON Pointer parsing (subset used by config merges).
 */

import { JsonDocumentMergeInvalidPointerError } from "./errors.js";

function unescapeToken(t: string): string {
  return t.replace(/~1/g, "/").replace(/~0/g, "~");
}

/**
 * @returns Token list; empty pointer yields `[]` (whole-document reference).
 */
export function parseJsonPointer(pointer: string): string[] {
  if (pointer === "") {
    return [];
  }
  if (pointer[0] !== "/") {
    throw new JsonDocumentMergeInvalidPointerError(
      `JSON Pointer must be "" or start with "/": ${JSON.stringify(pointer)}`
    );
  }
  const rest = pointer.slice(1);
  if (rest === "") {
    return [""];
  }
  return rest.split("/").map(unescapeToken);
}
