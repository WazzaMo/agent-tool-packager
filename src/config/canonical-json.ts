/**
 * Stable JSON serialisation and content hashing for config merge journalling.
 */

import { createHash } from "node:crypto";

/**
 * Deterministic JSON text: sorted object keys at every depth (UTF-8).
 *
 * @param value - JSON-serialisable value.
 * @returns Canonical string for hashing and equality checks.
 */
export function canonicalJsonStringify(value: unknown): string {
  if (value === null) {
    return "null";
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return JSON.stringify(null);
    }
    return JSON.stringify(value);
  }
  if (typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalJsonStringify(v)).join(",")}]`;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    return `{${keys
      .map((k) => `${JSON.stringify(k)}:${canonicalJsonStringify(obj[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(String(value));
}

/**
 * SHA-256 hex digest of UTF-8 canonical JSON.
 *
 * @param value - Value to canonicalise then hash.
 * @returns Lowercase hex string (64 chars).
 */
export function sha256HexCanonicalJson(value: unknown): string {
  const text = canonicalJsonStringify(value);
  return createHash("sha256").update(text, "utf8").digest("hex");
}
