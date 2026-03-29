/**
 * Unit tests: bundle basename uniqueness across Multi-type parts (Feature 4).
 */

import { describe, it, expect } from "vitest";
import { wouldBundleBasenameCollideForPartAdd } from "../../src/package/part-bundle-uniqueness.js";
import type { PackagePart } from "../../src/package/types.js";

function partWithBundles(
  bundles: Array<string | { path: string; "exec-filter"?: string }>
): PackagePart {
  return {
    type: "Skill",
    usage: ["u"],
    components: [],
    bundles,
  };
}

describe("wouldBundleBasenameCollideForPartAdd", () => {
  it("returns false when no parts have bundles", () => {
    expect(wouldBundleBasenameCollideForPartAdd(undefined, "a/bundle", 1)).toBe(false);
    expect(
      wouldBundleBasenameCollideForPartAdd(
        [{ type: "Skill", usage: [], components: [] }],
        "x/foo",
        1
      )
    ).toBe(false);
  });

  it("returns false when same part already has identical path (idempotent)", () => {
    const parts: PackagePart[] = [
      {
        type: "Mcp",
        usage: [],
        components: [],
        bundles: [{ path: "vecfs-ts", "exec-filter": "vecfs-ts/bin/*" }],
      },
    ];
    expect(wouldBundleBasenameCollideForPartAdd(parts, "vecfs-ts", 1)).toBe(false);
  });

  it("returns true when another part already uses the same basename", () => {
    const parts: PackagePart[] = [
      partWithBundles([{ path: "p1/foo", "exec-filter": "p1/foo/bin/*" }]),
      partWithBundles([]),
    ];
    expect(wouldBundleBasenameCollideForPartAdd(parts, "p2/foo", 2)).toBe(true);
  });

  it("returns true when same part has different path with same basename", () => {
    const parts: PackagePart[] = [
      partWithBundles([{ path: "a/foo", "exec-filter": "a/foo/bin/*" }]),
    ];
    expect(wouldBundleBasenameCollideForPartAdd(parts, "b/foo", 1)).toBe(true);
  });
});
