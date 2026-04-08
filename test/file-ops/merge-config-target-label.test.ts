/**
 * Unit tests: {@link mergeConfigTargetLabel}.
 */

import { describe, it, expect } from "vitest";
import path from "node:path";

import { mergeConfigTargetLabel } from "../../src/file-ops/merge-config-target-label.js";

describe("mergeConfigTargetLabel", () => {
  it("joins agent directory basename with relative path", () => {
    const layer = path.join("/tmp", "proj", ".gemini");
    expect(mergeConfigTargetLabel(layer, "settings.json")).toBe(".gemini/settings.json");
  });

  it("works for Cursor mcp.json", () => {
    const layer = path.join("/p", ".cursor");
    expect(mergeConfigTargetLabel(layer, "mcp.json")).toBe(".cursor/mcp.json");
  });
});
