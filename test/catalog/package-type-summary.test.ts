/**
 * Unit tests for package type summary strings (Feature 4 list output).
 */

import { describe, it, expect } from "vitest";
import { typeSummarySuffixFromRecord } from "../../src/catalog/package-type-summary.js";

describe("typeSummarySuffixFromRecord", () => {
  it("returns part types for Multi manifest", () => {
    expect(
      typeSummarySuffixFromRecord({
        type: "Multi",
        parts: [{ type: "Skill" }, { type: "Mcp" }],
      })
    ).toBe(" (Skill, Mcp)");
  });

  it("returns root type when no parts", () => {
    expect(typeSummarySuffixFromRecord({ type: "Rule" })).toBe(" (Rule)");
  });

  it("returns empty when type missing", () => {
    expect(typeSummarySuffixFromRecord({ name: "x" })).toBe("");
  });
});
