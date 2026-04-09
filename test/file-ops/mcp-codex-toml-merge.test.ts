/**
 * Unit tests: Codex `config.toml` MCP merge.
 */

import { describe, it, expect } from "vitest";

import {
  mergeCodexConfigTomlMcp,
  parseCodexConfigTomlRoot,
  removeMcpServerNamesFromCodexConfigToml,
  stringifyCodexConfigTomlRoot,
} from "../../src/file-ops/mcp-merge/mcp-codex-toml-merge.js";

describe("mergeCodexConfigTomlMcp", () => {
  it("creates mcp_servers from empty file", () => {
    const out = mergeCodexConfigTomlMcp(null, { mcpServers: { a: { command: "c" } } }, {});
    expect(out.status).toBe("applied");
    const root = parseCodexConfigTomlRoot(out.content);
    expect(root.mcp_servers).toEqual({ a: { command: "c" } });
  });

  it("preserves unrelated top-level keys", () => {
    const before = stringifyCodexConfigTomlRoot({
      features: { codex_hooks: true },
      mcp_servers: { old: { command: "o" } },
    });
    const out = mergeCodexConfigTomlMcp(before, { mcpServers: { new: { url: "http://x" } } }, {});
    expect(out.status).toBe("applied");
    const root = parseCodexConfigTomlRoot(out.content);
    expect(root.features).toEqual({ codex_hooks: true });
    expect(root.mcp_servers).toEqual({
      old: { command: "o" },
      new: { url: "http://x" },
    });
  });

  it("removeMcpServerNamesFromCodexConfigToml strips named servers", () => {
    const raw = stringifyCodexConfigTomlRoot({
      mcp_servers: { a: { command: "1" }, b: { command: "2" } },
    });
    const { content, changed } = removeMcpServerNamesFromCodexConfigToml(raw, ["a"]);
    expect(changed).toBe(true);
    expect(parseCodexConfigTomlRoot(content).mcp_servers).toEqual({ b: { command: "2" } });
  });
});
