/**
 * Unit tests for component basename uniqueness across Multi-type parts.
 */

import { describe, it, expect } from "vitest";
import { componentBasenameCollisionForPartAdd } from "../../src/package/part-component-uniqueness.js";
import type { PackagePart } from "../../src/package/types.js";

describe("componentBasenameCollisionForPartAdd", () => {
  const parts: PackagePart[] = [
    { type: "Prompt", usage: ["a"], components: ["doc-guide.md"] },
    { type: "Rule", usage: ["b"], components: ["other.md"] },
  ];

  it("returns same-part when basename already on target part", () => {
    const one: PackagePart[] = [{ type: "Prompt", usage: ["x"], components: ["doc-guide.md"] }];
    expect(componentBasenameCollisionForPartAdd(one, 1, "doc-guide.md")).toBe("same-part");
  });

  it("returns other-part when basename used on a different part", () => {
    expect(componentBasenameCollisionForPartAdd(parts, 2, "doc-guide.md")).toBe("other-part");
  });

  it("returns null when basename is new for this part and others", () => {
    expect(componentBasenameCollisionForPartAdd(parts, 2, "new.md")).toBe(null);
  });

  it("returns null for first component on empty part", () => {
    const empty: PackagePart[] = [{ type: "Prompt", usage: ["x"], components: [] }];
    expect(componentBasenameCollisionForPartAdd(empty, 1, "first.md")).toBe(null);
  });
});
