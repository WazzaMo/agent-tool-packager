/**
 * Integration tests: MCP JSON merge against real files.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import {
  applyMcpJsonMergeToFile,
  readJsonObjectFile,
  mergeMcpJsonDocument,
  McpMergeAmbiguousError,
} from "../../src/provider/mcp-merge/index.js";

describe("applyMcpJsonMergeToFile", () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "atp-mcp-merge-"));
  });

  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  it("creates mcp.json when missing", async () => {
    const file = path.join(tmp, ".cursor", "mcp.json");
    const incoming = {
      mcpServers: {
        srv: { command: "echo", args: ["hi"] },
      },
    };
    const r = await applyMcpJsonMergeToFile(file, incoming, {});
    expect(r).toEqual({ status: "applied", wrote: true });
    const parsed = await readJsonObjectFile(file);
    expect(parsed).toEqual(incoming);
  });

  it("amends an existing file and preserves other keys", async () => {
    const file = path.join(tmp, "settings.json");
    const initial = {
      "window.title": "x",
      mcpServers: {
        a: { command: "a" },
      },
    };
    await fs.writeFile(file, JSON.stringify(initial), "utf8");

    const r = await applyMcpJsonMergeToFile(file, {
      mcpServers: {
        b: { command: "b" },
      },
    });
    expect(r).toEqual({ status: "applied", wrote: true });

    const parsed = (await readJsonObjectFile(file)) as Record<string, unknown>;
    expect(parsed["window.title"]).toBe("x");
    expect(parsed.mcpServers).toEqual({
      a: { command: "a" },
      b: { command: "b" },
    });
  });

  it("does not write on noop (idempotent second install)", async () => {
    const file = path.join(tmp, "mcp.json");
    const incoming = { mcpServers: { x: { command: "c" } } };
    await applyMcpJsonMergeToFile(file, incoming, {});
    const stat1 = await fs.stat(file);
    await new Promise((r) => setTimeout(r, 15));
    const r2 = await applyMcpJsonMergeToFile(file, incoming, {});
    expect(r2).toEqual({ status: "noop", wrote: false });
    const stat2 = await fs.stat(file);
    expect(stat2.mtimeMs).toBe(stat1.mtimeMs);
  });

  it("fails on ambiguous server without force", async () => {
    const file = path.join(tmp, "mcp.json");
    await fs.writeFile(
      file,
      JSON.stringify({
        mcpServers: { srv: { command: "old" } },
      }),
      "utf8"
    );

    await expect(
      applyMcpJsonMergeToFile(file, {
        mcpServers: { srv: { command: "new" } },
      })
    ).rejects.toThrow(McpMergeAmbiguousError);
  });

  it("resolves ambiguity with forceConfig", async () => {
    const file = path.join(tmp, "mcp.json");
    await fs.writeFile(
      file,
      JSON.stringify({
        mcpServers: { srv: { command: "old" } },
      }),
      "utf8"
    );

    const incoming = { mcpServers: { srv: { command: "new" } } };
    const r = await applyMcpJsonMergeToFile(file, incoming, { forceConfig: true });
    expect(r.status).toBe("applied");
    const parsed = await readJsonObjectFile(file);
    expect(parsed).toEqual(incoming);
  });

  it("skipConfig does not create or modify the file", async () => {
    const file = path.join(tmp, "missing.json");
    const r = await applyMcpJsonMergeToFile(
      file,
      { mcpServers: { a: { command: "x" } } },
      { skipConfig: true }
    );
    expect(r).toEqual({ status: "skipped", wrote: false });
    await expect(fs.access(file)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("throws on invalid JSON in an existing file", async () => {
    const file = path.join(tmp, "bad.json");
    await fs.writeFile(file, "{ not json", "utf8");
    await expect(
      applyMcpJsonMergeToFile(file, { mcpServers: {} }, {})
    ).rejects.toThrowError(/Invalid JSON/);
  });
});

describe("mergeMcpJsonDocument (settings.json parity)", () => {
  it("matches file merge semantics for nested settings root", () => {
    const settings = {
      hooks: { foo: [] },
      mcpServers: { one: { url: "http://a" } },
    };
    const out = mergeMcpJsonDocument(settings, {
      mcpServers: { two: { url: "http://b" } },
    });
    expect(out.document.hooks).toEqual(settings.hooks);
    expect(out.document.mcpServers).toEqual({
      one: { url: "http://a" },
      two: { url: "http://b" },
    });
  });
});
