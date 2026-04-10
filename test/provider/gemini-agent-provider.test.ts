/**
 * Unit tests: {@link GeminiAgentProvider} plan + apply.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import { HooksMergeAmbiguousError } from "../../src/file-ops/hooks-merge/errors.js";
import { McpMergeAmbiguousError } from "../../src/file-ops/mcp-merge/errors.js";
import { StagedPartInstallInput } from "../../src/file-ops/part-install-input.js";
import { createGeminiAgentProvider } from "../../src/provider/gemini-agent-provider.js";

describe("GeminiAgentProvider", () => {
  let tmp: string;
  let staging: string;
  let layerRoot: string;

  beforeEach(() => {
    tmp = path.join(os.tmpdir(), `atp-gem-${Date.now()}`);
    staging = path.join(tmp, "pkg");
    layerRoot = path.join(tmp, "proj", ".gemini");
    fs.mkdirSync(staging, { recursive: true });
    fs.mkdirSync(layerRoot, { recursive: true });
  });

  afterEach(() => {
    try {
      fs.rmSync(tmp, { recursive: true });
    } catch {
      /* ignore */
    }
  });

  function installCtx() {
    return {
      agent: "gemini" as const,
      layer: "project" as const,
      projectRoot: path.join(tmp, "proj"),
      layerRoot,
      stagingDir: staging,
    };
  }

  it("planInstall emits plain_markdown_write under rules/", () => {
    fs.writeFileSync(path.join(staging, "g.md"), "# G\n");
    const manifest = {
      name: "pkg-g",
      version: "1.0.0",
      assets: [{ path: "g.md", type: "rule" as const, name: "g" }],
    };
    const provider = createGeminiAgentProvider(manifest);
    const part = new StagedPartInstallInput({
      partIndex: 1,
      partKind: "Rule",
      stagingRelPaths: ["g.md"],
      stagingDir: staging,
    });
    const plan = provider.planInstall(installCtx(), part, { forceConfig: false, skipConfig: false });
    expect(plan.actions).toHaveLength(1);
    expect(plan.actions[0].kind).toBe("plain_markdown_write");
    expect(plan.actions[0].relativeTargetPath).toBe("rules/g.md");
    expect(plan.actions[0].provenance.fragmentKey).toBe("rules/g.md");
  });

  it("places Gemini custom command .toml under commands/", () => {
    fs.writeFileSync(path.join(staging, "do.toml"), 'prompt = "hi"\n');
    const manifest = {
      name: "cmd-pkg",
      assets: [{ path: "do.toml", type: "rule" as const, name: "do" }],
    };
    const provider = createGeminiAgentProvider(manifest);
    const part = new StagedPartInstallInput({
      partIndex: 1,
      partKind: "Rule",
      stagingRelPaths: ["do.toml"],
      stagingDir: staging,
    });
    const plan = provider.planInstall(installCtx(), part, { forceConfig: false, skipConfig: false });
    expect(plan.actions[0].kind).toBe("raw_file_copy");
    expect(plan.actions[0].relativeTargetPath).toBe("commands/do.toml");
    provider.applyPlan(plan, { forceConfig: false, skipConfig: false });
    expect(fs.readFileSync(path.join(layerRoot, "commands", "do.toml"), "utf8")).toBe('prompt = "hi"\n');
  });

  it("applyPlan MCP conflict cites .gemini/settings.json in error", () => {
    fs.writeFileSync(
      path.join(staging, "mcp.json"),
      JSON.stringify({ mcpServers: { dup: { command: "from-pkg" } } })
    );
    fs.mkdirSync(layerRoot, { recursive: true });
    fs.writeFileSync(
      path.join(layerRoot, "settings.json"),
      JSON.stringify({ mcpServers: { dup: { command: "existing" } } }),
      "utf8"
    );
    const manifest = {
      name: "m",
      assets: [{ path: "mcp.json", type: "mcp" as const, name: "m" }],
    };
    const provider = createGeminiAgentProvider(manifest);
    const part = new StagedPartInstallInput({
      partIndex: 1,
      partKind: "Mcp",
      stagingRelPaths: ["mcp.json"],
      stagingDir: staging,
    });
    const plan = provider.planInstall(installCtx(), part, { forceConfig: false, skipConfig: false });
    expect(() => provider.applyPlan(plan, { forceConfig: false, skipConfig: false })).toThrow(
      McpMergeAmbiguousError
    );
    try {
      provider.applyPlan(plan, { forceConfig: false, skipConfig: false });
    } catch (e) {
      expect((e as Error).message).toBe(
        'MCP server "dup" conflicts with existing entry in .gemini/settings.json; ' +
          "use --force-config to replace it or --skip-config to skip this merge."
      );
    }
  });

  it("applyPlan hooks conflict cites .gemini/settings.json in error", () => {
    fs.writeFileSync(
      path.join(staging, "hooks.json"),
      JSON.stringify({ hooks: { Ev: [{ id: "h", command: "./pkg.sh" }] } })
    );
    fs.mkdirSync(layerRoot, { recursive: true });
    fs.writeFileSync(
      path.join(layerRoot, "settings.json"),
      JSON.stringify({ hooks: { Ev: [{ id: "h", command: "./user.sh" }] } }),
      "utf8"
    );
    const manifest = {
      name: "h",
      assets: [{ path: "hooks.json", type: "hook" as const, name: "h" }],
    };
    const provider = createGeminiAgentProvider(manifest);
    const part = new StagedPartInstallInput({
      partIndex: 1,
      partKind: "Hook",
      stagingRelPaths: ["hooks.json"],
      stagingDir: staging,
    });
    const plan = provider.planInstall(installCtx(), part, { forceConfig: false, skipConfig: false });
    expect(() => provider.applyPlan(plan, { forceConfig: false, skipConfig: false })).toThrow(
      HooksMergeAmbiguousError
    );
    try {
      provider.applyPlan(plan, { forceConfig: false, skipConfig: false });
    } catch (e) {
      expect((e as Error).message).toBe(
        'Hook handler for event "Ev" (id:h) conflicts with existing entry in .gemini/settings.json; ' +
          "use --force-config to replace it or --skip-config to skip this merge."
      );
    }
  });

  it("merges atpJsonDocumentStrategy into settings.json alongside mcpServers", () => {
    fs.writeFileSync(
      path.join(staging, "mcp.json"),
      JSON.stringify({
        mcpServers: { g: { url: "http://g" } },
        atpJsonDocumentStrategy: {
          strategy: { mode: "deep_assign_paths", paths: [[]] },
          payload: { trust: { sandbox: true } },
        },
      })
    );
    const manifest = {
      name: "mg",
      assets: [{ path: "mcp.json", type: "mcp" as const, name: "m" }],
    };
    const provider = createGeminiAgentProvider(manifest);
    const part = new StagedPartInstallInput({
      partIndex: 1,
      partKind: "Mcp",
      stagingRelPaths: ["mcp.json"],
      stagingDir: staging,
    });
    const plan = provider.planInstall(installCtx(), part, { forceConfig: false, skipConfig: false });
    expect(plan.actions.map((a) => a.kind)).toEqual(["mcp_json_merge", "json_document_strategy_merge"]);
    provider.applyPlan(plan, { forceConfig: false, skipConfig: false });
    const doc = JSON.parse(fs.readFileSync(path.join(layerRoot, "settings.json"), "utf8")) as {
      mcpServers: Record<string, unknown>;
      trust: { sandbox: boolean };
    };
    expect(doc.mcpServers.g).toEqual({ url: "http://g" });
    expect(doc.trust).toEqual({ sandbox: true });
  });

  it("merges MCP payload into settings.json", () => {
    fs.writeFileSync(
      path.join(staging, "mcp.json"),
      JSON.stringify({ mcpServers: { srv: { url: "http://x" } } })
    );
    const manifest = {
      name: "m",
      assets: [{ path: "mcp.json", type: "mcp" as const, name: "m" }],
    };
    const provider = createGeminiAgentProvider(manifest);
    const part = new StagedPartInstallInput({
      partIndex: 1,
      partKind: "Mcp",
      stagingRelPaths: ["mcp.json"],
      stagingDir: staging,
    });
    const plan = provider.planInstall(installCtx(), part, { forceConfig: false, skipConfig: false });
    expect(plan.actions[0].kind).toBe("mcp_json_merge");
    expect(plan.actions[0].relativeTargetPath).toBe("settings.json");
    provider.applyPlan(plan, { forceConfig: false, skipConfig: false });
    const doc = JSON.parse(fs.readFileSync(path.join(layerRoot, "settings.json"), "utf8")) as {
      mcpServers: Record<string, unknown>;
    };
    expect(doc.mcpServers.srv).toEqual({ url: "http://x" });
  });

  it("merges hooks.json payload into settings.json alongside mcpServers", () => {
    fs.writeFileSync(
      path.join(staging, "mcp.json"),
      JSON.stringify({ mcpServers: { a: { url: "http://a" } } })
    );
    fs.writeFileSync(
      path.join(staging, "hooks.json"),
      JSON.stringify({ hooks: { SessionStart: [{ command: "echo hi" }] } })
    );
    const manifest = {
      name: "mh",
      assets: [
        { path: "mcp.json", type: "mcp" as const, name: "m" },
        { path: "hooks.json", type: "hook" as const, name: "h" },
      ],
    };
    const provider = createGeminiAgentProvider(manifest);
    const part = new StagedPartInstallInput({
      partIndex: 1,
      partKind: "Mcp",
      stagingRelPaths: ["mcp.json", "hooks.json"],
      stagingDir: staging,
    });
    const plan = provider.planInstall(installCtx(), part, { forceConfig: false, skipConfig: false });
    expect(plan.actions).toHaveLength(2);
    provider.applyPlan(plan, { forceConfig: false, skipConfig: false });
    const doc = JSON.parse(fs.readFileSync(path.join(layerRoot, "settings.json"), "utf8")) as {
      mcpServers: Record<string, unknown>;
      hooks: Record<string, unknown[]>;
    };
    expect(doc.mcpServers.a).toEqual({ url: "http://a" });
    expect(doc.hooks.SessionStart).toEqual([{ command: "echo hi" }]);
  });

  it("planRemove does not delete settings.json", () => {
    const manifest = { name: "p", assets: [] };
    const provider = createGeminiAgentProvider(manifest);
    const removePlan = provider.planRemove(installCtx(), {
      packageName: "p",
      fragmentKey: "settings.json",
    });
    expect(removePlan.actions).toHaveLength(0);
  });

  it("planRemove deletes a managed file under rules/", () => {
    const dest = path.join(layerRoot, "rules", "zap.md");
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, "z");
    const provider = createGeminiAgentProvider({ name: "p", assets: [] });
    const removePlan = provider.planRemove(installCtx(), {
      packageName: "p",
      fragmentKey: "rules/zap.md",
    });
    provider.applyPlan(removePlan, { forceConfig: false, skipConfig: false });
    expect(fs.existsSync(dest)).toBe(false);
  });
});
