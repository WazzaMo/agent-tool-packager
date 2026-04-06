/**
 * Merge Cursor-style `hooks.json`: event-keyed handler arrays, append-only with dedupe.
 */

import { cloneJson, isPlainObject } from "../mcp-merge/mcp-json-helpers.js";

import { McpMergeInvalidDocumentError } from "../mcp-merge/errors.js";

export interface HooksMergeOptions {
  /** Do not change the existing document; return it unchanged (or `{}` when missing). */
  skipConfig?: boolean;
}

function assertPlainObject(label: string, v: unknown): Record<string, unknown> {
  if (!isPlainObject(v)) {
    throw new McpMergeInvalidDocumentError(`Expected ${label} to be a plain JSON object.`);
  }
  return v;
}

function readHooksEventMap(root: Record<string, unknown>, label: string): Record<string, unknown[]> {
  if (!("hooks" in root)) {
    return {};
  }
  const hooks = root.hooks;
  if (hooks === undefined) {
    return {};
  }
  if (!isPlainObject(hooks)) {
    throw new McpMergeInvalidDocumentError(`${label}: "hooks" must be a plain object when present.`);
  }
  const out: Record<string, unknown[]> = {};
  for (const [event, handlers] of Object.entries(hooks)) {
    if (!Array.isArray(handlers)) {
      throw new McpMergeInvalidDocumentError(
        `${label}: hooks["${event}"] must be an array when present.`
      );
    }
    out[event] = handlers;
  }
  return out;
}

function handlerDedupeKey(handler: unknown): string {
  if (handler !== null && typeof handler === "object") {
    const h = handler as Record<string, unknown>;
    if (typeof h.id === "string" && h.id.length > 0) {
      return `id:${h.id}`;
    }
  }
  try {
    return JSON.stringify(handler);
  } catch {
    return String(handler);
  }
}

function mergeEventMaps(
  existing: Record<string, unknown[]>,
  incoming: Record<string, unknown[]>
): { merged: Record<string, unknown[]>; changed: boolean } {
  const merged: Record<string, unknown[]> = {};
  let changed = false;

  for (const event of new Set([...Object.keys(existing), ...Object.keys(incoming)])) {
    const base = [...(existing[event] ?? [])];
    const seen = new Set(base.map(handlerDedupeKey));
    for (const h of incoming[event] ?? []) {
      const key = handlerDedupeKey(h);
      if (!seen.has(key)) {
        base.push(cloneJson(h));
        seen.add(key);
        changed = true;
      }
    }
    merged[event] = base;
  }

  return { merged, changed };
}

/**
 * Merge `incoming` hooks into an existing hooks document (top-level keys preserved).
 *
 * @param existingDocument - Parsed root object, or null / undefined if the file is missing.
 * @param incoming - Parsed JSON root (typically includes a `hooks` object).
 */
export function mergeHooksJsonDocument(
  existingDocument: unknown | null | undefined,
  incoming: unknown,
  options: HooksMergeOptions = {}
): { document: Record<string, unknown>; changed: boolean } {
  if (options.skipConfig) {
    if (existingDocument === null || existingDocument === undefined) {
      return { document: {}, changed: false };
    }
    return { document: cloneJson(assertPlainObject("existing document", existingDocument)), changed: false };
  }

  const incomingRoot = assertPlainObject("incoming hooks document", incoming);
  const incomingHooks = readHooksEventMap(incomingRoot, "Incoming document");

  const existingRoot =
    existingDocument === null || existingDocument === undefined
      ? {}
      : assertPlainObject("existing document", existingDocument);
  const existingHooks = readHooksEventMap(existingRoot, "Existing document");

  const { merged, changed } = mergeEventMaps(existingHooks, incomingHooks);
  const nextRoot: Record<string, unknown> = {
    ...existingRoot,
    hooks: merged,
  };

  return { document: nextRoot, changed };
}
