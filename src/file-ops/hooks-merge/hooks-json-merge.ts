/**
 * Merge hook handler maps into agent JSON (e.g. Cursor `hooks.json`, Gemini/Claude `settings.json`):
 * event-keyed handler arrays, append with dedupe, and conflict handling aligned with MCP merges
 * (`--force-config` / `--skip-config`). Uses the Cursor-style top-level `hooks` object shape.
 */

import { isDeepStrictEqual } from "node:util";

import { cloneJson, isPlainObject } from "../mcp-merge/mcp-json-helpers.js";

import { McpMergeInvalidDocumentError } from "../mcp-merge/errors.js";

import { HooksMergeAmbiguousError } from "./errors.js";

export interface HooksMergeOptions {
  /** Overwrite an existing handler when it shares the same dedupe key but differs. */
  forceConfig?: boolean;
  /** Do not change the existing document; return it unchanged (or `{}` when missing). */
  skipConfig?: boolean;
  /** Shown in {@link HooksMergeAmbiguousError} (e.g. `.gemini/settings.json`). */
  mergeTargetLabel?: string;
}

function assertPlainObject(label: string, v: unknown): Record<string, unknown> {
  if (!isPlainObject(v)) {
    throw new McpMergeInvalidDocumentError(`Expected ${label} to be a plain object.`);
  }
  return v;
}

/**
 * Extract the `hooks` event → handler arrays map from a package payload (for journalling).
 *
 * @param incoming - Parsed `hooks.json` root from the package.
 */
export function extractHooksDeltaFromPayload(incoming: unknown): Record<string, unknown[]> {
  const root = assertPlainObject("incoming hooks document", incoming);
  return readHooksEventMap(root, "Incoming document");
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
  incoming: Record<string, unknown[]>,
  options: HooksMergeOptions
): { merged: Record<string, unknown[]>; changed: boolean } {
  const merged: Record<string, unknown[]> = {};
  let changed = false;

  for (const event of new Set([...Object.keys(existing), ...Object.keys(incoming)])) {
    const base = [...(existing[event] ?? [])].map((h) => cloneJson(h));
    for (const h of incoming[event] ?? []) {
      const key = handlerDedupeKey(h);
      const idx = base.findIndex((x) => handlerDedupeKey(x) === key);
      if (idx < 0) {
        base.push(cloneJson(h));
        changed = true;
        continue;
      }
      const existingHandler = base[idx];
      if (isDeepStrictEqual(existingHandler, h)) {
        continue;
      }
      if (options.forceConfig) {
        base[idx] = cloneJson(h);
        changed = true;
        continue;
      }
      throw new HooksMergeAmbiguousError(
        event,
        key,
        existingHandler,
        h,
        options.mergeTargetLabel ?? "the merged configuration file"
      );
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

  const { merged, changed } = mergeEventMaps(existingHooks, incomingHooks, options);
  const nextRoot: Record<string, unknown> = {
    ...existingRoot,
    hooks: merged,
  };

  return { document: nextRoot, changed };
}

/**
 * Remove hook handlers that match the package's `hooks.json` payload (deep equality),
 * undoing a prior {@link mergeHooksJsonDocument} for those entries.
 *
 * @param existingDocument - Current on-disk document root, or null if missing.
 * @param packageHooksPayload - Parsed JSON from the package's staged `hooks.json` asset.
 */
export function removeHookHandlersFromDocument(
  existingDocument: unknown | null | undefined,
  packageHooksPayload: unknown
): { document: Record<string, unknown>; changed: boolean } {
  if (existingDocument === null || existingDocument === undefined) {
    return { document: {}, changed: false };
  }

  const existingRoot = assertPlainObject("existing document", existingDocument);
  const packageRoot = assertPlainObject("package hooks document", packageHooksPayload);
  const existingHooks = readHooksEventMap(existingRoot, "Existing document");
  const packageHooks = readHooksEventMap(packageRoot, "Package document");

  const allEvents = new Set([...Object.keys(existingHooks), ...Object.keys(packageHooks)]);
  const nextHooks: Record<string, unknown[]> = {};
  let changed = false;

  for (const event of allEvents) {
    const base = [...(existingHooks[event] ?? [])];
    for (const h of packageHooks[event] ?? []) {
      const idx = base.findIndex((e) => isDeepStrictEqual(e, h));
      if (idx >= 0) {
        base.splice(idx, 1);
        changed = true;
      }
    }
    if (base.length > 0 || existingHooks[event] !== undefined) {
      nextHooks[event] = base;
    }
  }

  const nextRoot: Record<string, unknown> = {
    ...existingRoot,
    hooks: nextHooks,
  };

  return { document: nextRoot, changed };
}
