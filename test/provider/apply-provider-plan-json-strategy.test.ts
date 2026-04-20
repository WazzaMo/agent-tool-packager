/**
 * Unit tests: {@link applyProviderPlan} with {@link JsonDocumentStrategyMergeAction}.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import type { ConfigMergeJournalEntryV1 } from "../../src/config/config-merge-journal.js";
import { OperationIds } from "../../src/file-ops/operation-ids.js";
import { applyProviderPlan } from "../../src/provider/apply-provider-plan.js";
import type { ProviderPlan } from "../../src/provider/provider-dtos.js";

describe("applyProviderPlan json_document_strategy_merge", () => {
  let tmp: string;
  let layerRoot: string;
  let projectRoot: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "atp-apply-strat-"));
    projectRoot = path.join(tmp, "proj");
    layerRoot = path.join(projectRoot, ".cursor");
    fs.mkdirSync(layerRoot, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  function basePlan(): ProviderPlan {
    return {
      context: {
        agent: "cursor",
        layer: "project",
        projectRoot,
        layerRoot,
        stagingDir: path.join(tmp, "st"),
      },
      provenanceBase: { packageName: "x", packageVersion: "1" },
      actions: [],
    };
  }

  it("writes merged JSON under layerRoot", () => {
    const plan = basePlan();
    plan.actions = [
      {
        kind: "json_document_strategy_merge",
        operationId: OperationIds.ConfigMerge,
        provenance: { packageName: "x", fragmentKey: "mcp.json" },
        relativeTargetPath: "mcp.json",
        strategy: { mode: "deep_assign_paths", paths: [[]] },
        payload: { mcpServers: { z: { command: "z" } } },
      },
    ];
    applyProviderPlan(plan, { forceConfig: false, skipConfig: false });
    const doc = JSON.parse(fs.readFileSync(path.join(layerRoot, "mcp.json"), "utf8")) as Record<
      string,
      unknown
    >;
    expect(doc.mcpServers).toEqual({ z: { command: "z" } });
  });

  it("honours skipConfig (no file created)", () => {
    const plan = basePlan();
    plan.actions = [
      {
        kind: "json_document_strategy_merge",
        operationId: OperationIds.ConfigMerge,
        provenance: { packageName: "x", fragmentKey: "mcp.json" },
        relativeTargetPath: "mcp.json",
        strategy: { mode: "deep_assign_paths", paths: [[]] },
        payload: { a: 1 },
      },
    ];
    applyProviderPlan(plan, { forceConfig: false, skipConfig: true });
    expect(fs.existsSync(path.join(layerRoot, "mcp.json"))).toBe(false);
  });

  it("records journal entries when journal array is provided", () => {
    const plan = basePlan();
    plan.actions = [
      {
        kind: "json_document_strategy_merge",
        operationId: OperationIds.ConfigMerge,
        provenance: { packageName: "x", fragmentKey: "mcp.json" },
        relativeTargetPath: "mcp.json",
        strategy: { mode: "deep_assign_paths", paths: [[]] },
        payload: { mcpServers: { j: { command: "j" } } },
      },
    ];
    const journal: ConfigMergeJournalEntryV1[] = [];
    applyProviderPlan(plan, { forceConfig: false, skipConfig: false }, undefined, journal);
    expect(journal).toHaveLength(1);
    expect(journal[0].kind).toBe("mcp");
    expect(journal[0].agent_relative_path).toBe("mcp.json");
    if (journal[0].fragments.type === "mcp") {
      expect(journal[0].fragments.server_names).toContain("j");
    }
  });
});
