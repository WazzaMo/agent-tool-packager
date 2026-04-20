/**
 * Unit tests: canonical JSON + SHA-256 for config journalling.
 */

import { describe, it, expect } from "vitest";

import {
  canonicalJsonStringify,
  sha256HexCanonicalJson,
} from "../../src/config/canonical-json.js";

describe("canonicalJsonStringify", () => {
  it("sorts object keys at each depth", () => {
    const a = canonicalJsonStringify({ z: 1, a: { y: 2, b: 3 } });
    const b = canonicalJsonStringify({ a: { b: 3, y: 2 }, z: 1 });
    expect(a).toBe(b);
  });

  it("handles arrays and primitives", () => {
    expect(canonicalJsonStringify([3, 1, 2])).toBe("[3,1,2]");
    expect(canonicalJsonStringify(null)).toBe("null");
  });
});

describe("sha256HexCanonicalJson", () => {
  it("is stable for equivalent objects", () => {
    expect(sha256HexCanonicalJson({ b: 1, a: 2 })).toBe(
      sha256HexCanonicalJson({ a: 2, b: 1 })
    );
  });

  it("produces 64-char hex", () => {
    const h = sha256HexCanonicalJson({});
    expect(h).toMatch(/^[a-f0-9]{64}$/);
  });
});
