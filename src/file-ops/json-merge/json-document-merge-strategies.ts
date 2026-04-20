/**
 * Additional JSON merge strategies from the provider internal DTO note (task 3.8):
 * `deep_assign_paths` and `replace_at_pointer`.
 */

import { isDeepStrictEqual } from "node:util";

import { assertPlainObject, cloneJson, isPlainObject } from "../mcp-merge/mcp-json-helpers.js";
import {
  JsonDocumentMergeInvalidPayloadError,
  JsonDocumentMergeInvalidPointerError,
} from "./errors.js";
import { deepMergePlainObjects } from "./deep-merge-plain-objects.js";
import { parseJsonPointer } from "./json-pointer.js";

export type JsonMergeStrategy =
  | { mode: "deep_assign_paths"; paths: string[][] }
  | { mode: "replace_at_pointer"; jsonPointer: string };

export interface JsonDocumentStrategyMergeResult {
  document: Record<string, unknown>;
  /** True when the merged document differs from the parsed existing root. */
  changed: boolean;
}

function requirePayloadObject(payload: unknown): Record<string, unknown> {
  if (!isPlainObject(payload)) {
    throw new JsonDocumentMergeInvalidPayloadError("Payload must be a plain JSON object.");
  }
  return payload;
}

function mergeDeepAssignAtPath(
  root: Record<string, unknown>,
  pathSegments: string[],
  payload: Record<string, unknown>
): Record<string, unknown> {
  if (pathSegments.length === 0) {
    return deepMergePlainObjects(root, payload);
  }

  const out = structuredClone(root) as Record<string, unknown>;
  let cur = out;
  for (let i = 0; i < pathSegments.length - 1; i++) {
    const k = pathSegments[i]!;
    const next = cur[k];
    if (next === undefined || next === null) {
      cur[k] = {};
    } else if (!isPlainObject(next)) {
      throw new JsonDocumentMergeInvalidPointerError(
        `deep_assign_paths: cannot traverse non-object at segment ${JSON.stringify(k)}`
      );
    }
    cur = cur[k] as Record<string, unknown>;
  }
  const leafKey = pathSegments[pathSegments.length - 1]!;
  const existingLeaf = cur[leafKey];
  const base: Record<string, unknown> = isPlainObject(existingLeaf)
    ? (existingLeaf as Record<string, unknown>)
    : {};
  cur[leafKey] = deepMergePlainObjects(base, payload);
  return out;
}

/**
 * Replace the value at `tokens` (non-empty) inside a clone of `root`.
 */
function replaceAtNonRootPointer(
  root: Record<string, unknown>,
  tokens: string[],
  value: unknown
): Record<string, unknown> {
  const out = structuredClone(root) as Record<string, unknown>;
  let cur: Record<string, unknown> = out;
  for (let i = 0; i < tokens.length - 1; i++) {
    const k = tokens[i]!;
    const next = cur[k];
    if (next === undefined || next === null) {
      cur[k] = {};
    } else if (!isPlainObject(next)) {
      throw new JsonDocumentMergeInvalidPointerError(
        `replace_at_pointer: cannot traverse non-object at segment ${JSON.stringify(k)}`
      );
    }
    cur = cur[k] as Record<string, unknown>;
  }
  const leafKey = tokens[tokens.length - 1]!;
  cur[leafKey] = cloneJson(value);
  return out;
}

/**
 * Merge `payload` into an existing JSON object root using a DTO-style strategy.
 *
 * - `deep_assign_paths`: for each path (segment array), deep-merge `payload`
 *   into that location; `[]` merges into the document root.
 * - `replace_at_pointer`: RFC 6901 pointer; `""` replaces the whole root (payload
 *   must be a plain object). Non-empty pointers replace a single value.
 */
export function mergeJsonDocumentWithStrategy(
  existingDocument: unknown | null | undefined,
  payload: unknown,
  strategy: JsonMergeStrategy
): JsonDocumentStrategyMergeResult {
  const existingRoot =
    existingDocument === null || existingDocument === undefined
      ? {}
      : assertPlainObject("existing document", existingDocument);

  let document: Record<string, unknown>;

  if (strategy.mode === "replace_at_pointer") {
    const tokens = parseJsonPointer(strategy.jsonPointer);
    if (tokens.length === 0) {
      const obj = requirePayloadObject(payload);
      document = structuredClone(obj) as Record<string, unknown>;
    } else {
      document = replaceAtNonRootPointer(existingRoot, tokens, payload);
    }
  } else {
    if (strategy.paths.length === 0) {
      throw new JsonDocumentMergeInvalidPayloadError(
        "deep_assign_paths requires at least one path entry."
      );
    }
    const obj = requirePayloadObject(payload);
    document = existingRoot;
    for (const path of strategy.paths) {
      document = mergeDeepAssignAtPath(document, path, obj);
    }
  }

  const changed = !isDeepStrictEqual(existingRoot, document);
  return { document, changed };
}
