/**
 * Unit tests: staged MCP JSON → provider actions (`mcp_json_merge` + optional strategy).
 */

import { describe, it, expect } from "vitest";

import { OperationIds } from "../../src/file-ops/operation-ids.js";
import { StagedPartInstallInput } from "../../src/file-ops/part-install-input.js";
import { providerActionsForStagedMcpJson } from "../../src/provider/provider-mcp-staged-json.js";

function part(): StagedPartInstallInput {
  return new StagedPartInstallInput({
    partIndex: 1,
    partKind: "Mcp",
    stagingRelPaths: ["mcp.json"],
    stagingDir: "/tmp",
  });
}

describe("providerActionsForStagedMcpJson", () => {
  it("returns a single mcp_json_merge when only mcpServers is present", () => {
    const actions = providerActionsForStagedMcpJson({
      providerLabel: "Test",
      payload: { mcpServers: { a: { command: "x" } } },
      part: part(),
      packageName: "p",
      packageVersion: "1",
      defaultRelativeTarget: "mcp.json",
      provenanceFragmentKey: "mcp.json",
    });
    expect(actions.map((a) => a.kind)).toEqual(["mcp_json_merge", "interpolation_policy"]);
    expect(actions[0].kind).toBe("mcp_json_merge");
    if (actions[0].kind === "mcp_json_merge") {
      expect(actions[0].payload).toEqual({ mcpServers: { a: { command: "x" } } });
      expect(actions[0].relativeTargetPath).toBe("mcp.json");
      expect(actions[0].operationId).toBe(OperationIds.ConfigMerge);
    }
  });

  it("strips atpJsonDocumentStrategy from the mcp_json_merge payload", () => {
    const actions = providerActionsForStagedMcpJson({
      providerLabel: "Test",
      payload: {
        mcpServers: { s: { url: "http://h" } },
        atpJsonDocumentStrategy: {
          strategy: { mode: "deep_assign_paths", paths: [[]] },
          payload: { extra: true },
        },
      },
      part: part(),
      packageName: "p",
      packageVersion: undefined,
      defaultRelativeTarget: "settings.json",
      provenanceFragmentKey: "settings.json",
    });
    expect(actions.map((a) => a.kind)).toEqual([
      "mcp_json_merge",
      "interpolation_policy",
      "json_document_strategy_merge",
      "interpolation_policy",
    ]);
    const mcp = actions[0];
    expect(mcp.kind).toBe("mcp_json_merge");
    if (mcp.kind === "mcp_json_merge") {
      expect(mcp.payload).toEqual({ mcpServers: { s: { url: "http://h" } } });
      expect("atpJsonDocumentStrategy" in (mcp.payload as object)).toBe(false);
    }
    const st = actions[2];
    expect(st.kind).toBe("json_document_strategy_merge");
    if (st.kind === "json_document_strategy_merge") {
      expect(st.strategy).toEqual({ mode: "deep_assign_paths", paths: [[]] });
      expect(st.payload).toEqual({ extra: true });
      expect(st.relativeTargetPath).toBe("settings.json");
    }
  });

  it("supports strategy-only payload", () => {
    const actions = providerActionsForStagedMcpJson({
      providerLabel: "Test",
      payload: {
        atpJsonDocumentStrategy: {
          strategy: { mode: "replace_at_pointer", jsonPointer: "/x" },
          payload: 1,
        },
      },
      part: part(),
      packageName: "p",
      packageVersion: undefined,
      defaultRelativeTarget: "mcp.json",
      provenanceFragmentKey: "mcp.json",
    });
    expect(actions.map((a) => a.kind)).toEqual([
      "json_document_strategy_merge",
      "interpolation_policy",
    ]);
    expect(actions[0].kind).toBe("json_document_strategy_merge");
  });

  it("uses targetRelativePath from the strategy block when set", () => {
    const actions = providerActionsForStagedMcpJson({
      providerLabel: "Test",
      payload: {
        atpJsonDocumentStrategy: {
          strategy: { mode: "deep_assign_paths", paths: [["a"]] },
          payload: { b: 2 },
          targetRelativePath: "other.json",
        },
      },
      part: part(),
      packageName: "p",
      packageVersion: undefined,
      defaultRelativeTarget: "mcp.json",
      provenanceFragmentKey: "mcp.json",
    });
    expect(actions[0].kind).toBe("json_document_strategy_merge");
    if (actions[0].kind === "json_document_strategy_merge") {
      expect(actions[0].relativeTargetPath).toBe("other.json");
    }
  });

  it("passes mergeBase through to both actions", () => {
    const actions = providerActionsForStagedMcpJson({
      providerLabel: "Test",
      payload: {
        mcpServers: {},
        atpJsonDocumentStrategy: {
          strategy: { mode: "deep_assign_paths", paths: [[]] },
          payload: { onlyFromStrategy: 1 },
        },
      },
      part: part(),
      packageName: "p",
      packageVersion: undefined,
      mergeBase: "project",
      defaultRelativeTarget: ".mcp.json",
      provenanceFragmentKey: ".mcp.json",
    });
    expect(actions.map((a) => a.kind)).toEqual([
      "mcp_json_merge",
      "interpolation_policy",
      "json_document_strategy_merge",
      "interpolation_policy",
    ]);
    expect(actions[0].kind).toBe("mcp_json_merge");
    expect(actions[2].kind).toBe("json_document_strategy_merge");
    if (actions[0].kind === "mcp_json_merge" && actions[2].kind === "json_document_strategy_merge") {
      expect(actions[0].mergeBase).toBe("project");
      expect(actions[2].mergeBase).toBe("project");
    }
  });

  it("throws when payload is empty object", () => {
    expect(() =>
      providerActionsForStagedMcpJson({
        providerLabel: "Test",
        payload: {},
        part: part(),
        packageName: "p",
        packageVersion: undefined,
        defaultRelativeTarget: "mcp.json",
        provenanceFragmentKey: "mcp.json",
      })
    ).toThrow(/must include mcpServers/);
  });

  it("throws when strategy block is invalid", () => {
    expect(() =>
      providerActionsForStagedMcpJson({
        providerLabel: "Test",
        payload: {
          atpJsonDocumentStrategy: { strategy: { mode: "nope" }, payload: {} },
        },
        part: part(),
        packageName: "p",
        packageVersion: undefined,
        defaultRelativeTarget: "mcp.json",
        provenanceFragmentKey: "mcp.json",
      })
    ).toThrow(/JsonMergeStrategy/);
  });
});
