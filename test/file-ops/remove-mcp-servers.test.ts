/**
 * Unit tests: MCP server removal helper (safe uninstall).
 */

import { describe, it, expect } from "vitest";

import { removeMcpServersByNamesFromDocument } from "../../src/file-ops/mcp-merge/remove-mcp-servers.js";

describe("removeMcpServersByNamesFromDocument", () => {
  it("removes named servers and preserves other keys", () => {
    const existing = {
      mcpServers: { a: { x: 1 }, b: { y: 2 } },
      other: true,
    };
    const { document, changed } = removeMcpServersByNamesFromDocument(existing, ["a"]);
    expect(changed).toBe(true);
    expect(document.mcpServers).toEqual({ b: { y: 2 } });
    expect(document.other).toBe(true);
  });

  it("returns unchanged when document missing", () => {
    const { document, changed } = removeMcpServersByNamesFromDocument(null, ["a"]);
    expect(changed).toBe(false);
    expect(document).toEqual({});
  });

  it("returns unchanged when names not present", () => {
    const existing = { mcpServers: { a: {} } };
    const { document, changed } = removeMcpServersByNamesFromDocument(existing, ["missing"]);
    expect(changed).toBe(false);
    expect(document.mcpServers).toEqual({ a: {} });
  });
});
