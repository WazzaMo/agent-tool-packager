/**
 * Deep-merge plain JSON objects; non-object values from `source` replace targets.
 */

import { cloneJson, isPlainObject } from "../mcp-merge/mcp-json-helpers.js";

export function deepMergePlainObjects(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...target };
  for (const [k, v] of Object.entries(source)) {
    if (isPlainObject(v) && isPlainObject(out[k])) {
      out[k] = deepMergePlainObjects(out[k] as Record<string, unknown>, v);
    } else {
      out[k] = cloneJson(v);
    }
  }
  return out;
}
