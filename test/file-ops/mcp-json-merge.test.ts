/**
 * Unit tests: MCP `mcpServers` merge (pure, in-memory).
 */

import { describe, it, expect } from "vitest";

import { mergeMcpJsonDocument } from "../../src/file-ops/mcp-merge/mcp-json-merge.js";
import {
  McpMergeAmbiguousError,
  McpMergeInvalidPayloadError,
} from "../../src/file-ops/mcp-merge/errors.js";

const sample = {
  mcpServers: {
    "my-pkg": {
      command: "npx",
      args: ["-y", "@scope/mcp"],
    },
  },
};

describe("mergeMcpJsonDocument", () => {
  it("creates mcpServers when the document is missing", () => {
    const r = mergeMcpJsonDocument(null, sample, {});
    expect(r.status).toBe("applied");
    expect(r.mcpServersTouched).toBe(true);
    expect(r.document).toEqual(sample);
  });

  it("amends an existing file, preserving unrelated keys", () => {
    const existing = {
      editor: { tabSize: 2 },
      mcpServers: {
        other: { command: "node", args: ["other.js"] },
      },
    };
    const r = mergeMcpJsonDocument(existing, sample, {});
    expect(r.status).toBe("applied");
    expect(r.document).toEqual({
      editor: { tabSize: 2 },
      mcpServers: {
        other: { command: "node", args: ["other.js"] },
        "my-pkg": sample.mcpServers["my-pkg"],
      },
    });
  });

  it("is idempotent when the same payload is merged twice", () => {
    const first = mergeMcpJsonDocument(null, sample, {});
    expect(first.status).toBe("applied");
    const second = mergeMcpJsonDocument(first.document, sample, {});
    expect(second.status).toBe("noop");
    expect(second.mcpServersTouched).toBe(false);
    expect(second.document).toEqual(first.document);
  });

  it("throws when an entry exists with different config (user must choose)", () => {
    const existing = {
      mcpServers: {
        "my-pkg": { command: "npx", args: ["-y", "other"] },
      },
    };
    expect(() => mergeMcpJsonDocument(existing, sample, {})).toThrow(McpMergeAmbiguousError);
    try {
      mergeMcpJsonDocument(existing, sample, {});
    } catch (e) {
      expect(e).toBeInstanceOf(McpMergeAmbiguousError);
      const a = e as McpMergeAmbiguousError;
      expect(a.serverName).toBe("my-pkg");
      expect(a.code).toBe("MCP_MERGE_AMBIGUOUS");
      expect(a.mergeTargetLabel).toBe("the merged configuration file");
      expect(a.message).toBe(
        'MCP server "my-pkg" conflicts with existing entry in the merged configuration file; ' +
          "use --force-config to replace it or --skip-config to skip this merge."
      );
    }
  });

  it("includes mergeTargetLabel in ambiguity error message", () => {
    const existing = {
      mcpServers: {
        "my-pkg": { command: "npx", args: ["-y", "other"] },
      },
    };
    try {
      mergeMcpJsonDocument(existing, sample, { mergeTargetLabel: ".gemini/settings.json" });
    } catch (e) {
      const a = e as McpMergeAmbiguousError;
      expect(a.mergeTargetLabel).toBe(".gemini/settings.json");
      expect(a.message).toBe(
        'MCP server "my-pkg" conflicts with existing entry in .gemini/settings.json; ' +
          "use --force-config to replace it or --skip-config to skip this merge."
      );
    }
  });

  it("overwrites on conflict when forceConfig is set", () => {
    const existing = {
      mcpServers: {
        "my-pkg": { command: "npx", args: ["-y", "other"] },
      },
    };
    const r = mergeMcpJsonDocument(existing, sample, { forceConfig: true });
    expect(r.status).toBe("applied");
    expect(r.document.mcpServers).toEqual(sample.mcpServers);
  });

  it("skipConfig returns skipped and does not apply payload", () => {
    const existing = { mcpServers: { a: 1 } };
    const r = mergeMcpJsonDocument(existing, sample, { skipConfig: true });
    expect(r.status).toBe("skipped");
    expect(r.document).toEqual(existing);
  });

  it("skipConfig with missing document yields empty object", () => {
    const r = mergeMcpJsonDocument(null, sample, { skipConfig: true });
    expect(r.status).toBe("skipped");
    expect(r.document).toEqual({});
  });

  it("rejects payload without mcpServers", () => {
    expect(() => mergeMcpJsonDocument({}, { foo: 1 } as unknown as object, {})).toThrow(
      McpMergeInvalidPayloadError
    );
  });

  it("rejects non-object mcpServers in payload", () => {
    expect(() =>
      mergeMcpJsonDocument({}, { mcpServers: [] as unknown as Record<string, unknown> }, {})
    ).toThrow(McpMergeInvalidPayloadError);
  });

  it("rejects existing document when mcpServers is not an object", () => {
    expect(() =>
      mergeMcpJsonDocument({ mcpServers: [] }, sample, {})
    ).toThrowError(/mcpServers.*plain object/);
  });
});
