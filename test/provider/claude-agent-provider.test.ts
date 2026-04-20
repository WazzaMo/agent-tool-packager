/**
 * Unit tests: {@link ClaudeAgentProvider} plan + apply.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import { HooksMergeAmbiguousError } from "../../src/file-ops/hooks-merge/errors.js";
import { McpMergeAmbiguousError } from "../../src/file-ops/mcp-merge/errors.js";
import { StagedPartInstallInput } from "../../src/file-ops/part-install-input.js";
import { createClaudeAgentProvider } from "../../src/provider/claude-agent-provider.js";

describe("ClaudeAgentProvider", () => {
  let tmp: string;
  let staging: string;
  let layerRoot: string;
  let projectRoot: string;

  beforeEach(() => {
    tmp = path.join(os.tmpdir(), `atp-claude-${Date.now()}`);
    staging = path.join(tmp, "pkg");
    projectRoot = path.join(tmp, "proj");
    layerRoot = path.join(projectRoot, ".claude");
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
      agent: "claude" as const,
      layer: "project" as const,
      projectRoot,
      layerRoot,
      stagingDir: staging,
    };
  }

  it("planInstall emits plain_markdown_write under rules/ plus CLAUDE.md managed block", () => {
    fs.writeFileSync(path.join(staging, "c.md"), "# C\n");
    const manifest = {
      name: "pkg-c",
      version: "1.0.0",
      assets: [{ path: "c.md", type: "rule" as const, name: "c" }],
    };
    const provider = createClaudeAgentProvider(manifest);
    const part = new StagedPartInstallInput({
      partIndex: 1,
      partKind: "Rule",
      stagingRelPaths: ["c.md"],
      stagingDir: staging,
    });
    const plan = provider.planInstall(installCtx(), part, { forceConfig: false, skipConfig: false });
    expect(plan.actions).toHaveLength(2);
    expect(plan.actions[0].kind).toBe("plain_markdown_write");
    expect(plan.actions[0].relativeTargetPath).toBe("rules/c.md");
    expect(plan.actions[1].kind).toBe("markdown_managed_block_patch");
    if (plan.actions[1].kind === "markdown_managed_block_patch") {
      expect(plan.actions[1].relativeTargetPath).toBe("CLAUDE.md");
      expect(plan.actions[1].destinationRoot).toBe("project");
      expect(plan.actions[1].body).toContain("./.claude/rules/c.md");
    }
  });

  it("applyPlan MCP conflict cites .mcp.json in error", () => {
    fs.writeFileSync(
      path.join(staging, "mcp.json"),
      JSON.stringify({ mcpServers: { dup: { command: "from-pkg" } } })
    );
    fs.writeFileSync(
      path.join(projectRoot, ".mcp.json"),
      JSON.stringify({ mcpServers: { dup: { command: "existing" } } }),
      "utf8"
    );
    const manifest = {
      name: "m",
      assets: [{ path: "mcp.json", type: "mcp" as const, name: "m" }],
    };
    const provider = createClaudeAgentProvider(manifest);
    const part = new StagedPartInstallInput({
      partIndex: 1,
      partKind: "Mcp",
      stagingRelPaths: ["mcp.json"],
      stagingDir: staging,
    });
    const plan = provider.planInstall(installCtx(), part, { forceConfig: false, skipConfig: false });
    const mcpAction = plan.actions[0];
    expect(mcpAction.kind).toBe("mcp_json_merge");
    if (mcpAction.kind !== "mcp_json_merge") {
      throw new Error("expected mcp_json_merge");
    }
    expect(mcpAction.mergeBase).toBe("project");
    expect(mcpAction.relativeTargetPath).toBe(".mcp.json");
    expect(() => provider.applyPlan(plan, { forceConfig: false, skipConfig: false })).toThrow(
      McpMergeAmbiguousError
    );
    try {
      provider.applyPlan(plan, { forceConfig: false, skipConfig: false });
    } catch (e) {
      expect((e as Error).message).toBe(
        'MCP server "dup" conflicts with existing entry in .mcp.json; ' +
          "use --force-config to replace it or --skip-config to skip this merge."
      );
    }
  });

  it("applyPlan hooks conflict cites .claude/settings.json in error", () => {
    fs.writeFileSync(
      path.join(staging, "hooks.json"),
      JSON.stringify({ hooks: { Ev: [{ id: "h", command: "./pkg.sh" }] } })
    );
    fs.writeFileSync(
      path.join(layerRoot, "settings.json"),
      JSON.stringify({ hooks: { Ev: [{ id: "h", command: "./user.sh" }] } }),
      "utf8"
    );
    const manifest = {
      name: "h",
      assets: [{ path: "hooks.json", type: "hook" as const, name: "h" }],
    };
    const provider = createClaudeAgentProvider(manifest);
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
        'Hook handler for event "Ev" (id:h) conflicts with existing entry in .claude/settings.json; ' +
          "use --force-config to replace it or --skip-config to skip this merge."
      );
    }
  });

  it("merges MCP into repo-root .mcp.json", () => {
    fs.writeFileSync(
      path.join(staging, "mcp.json"),
      JSON.stringify({ mcpServers: { srv: { url: "http://x" } } })
    );
    const manifest = {
      name: "m",
      assets: [{ path: "mcp.json", type: "mcp" as const, name: "m" }],
    };
    const provider = createClaudeAgentProvider(manifest);
    const part = new StagedPartInstallInput({
      partIndex: 1,
      partKind: "Mcp",
      stagingRelPaths: ["mcp.json"],
      stagingDir: staging,
    });
    const plan = provider.planInstall(installCtx(), part, { forceConfig: false, skipConfig: false });
    provider.applyPlan(plan, { forceConfig: false, skipConfig: false });
    const doc = JSON.parse(fs.readFileSync(path.join(projectRoot, ".mcp.json"), "utf8")) as {
      mcpServers: Record<string, unknown>;
    };
    expect(doc.mcpServers.srv).toEqual({ url: "http://x" });
  });

  it("merges hooks into .claude/settings.json alongside mcpServers in .mcp.json", () => {
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
    const provider = createClaudeAgentProvider(manifest);
    const part = new StagedPartInstallInput({
      partIndex: 1,
      partKind: "Mcp",
      stagingRelPaths: ["mcp.json", "hooks.json"],
      stagingDir: staging,
    });
    const plan = provider.planInstall(installCtx(), part, { forceConfig: false, skipConfig: false });
    expect(plan.actions.map((a) => a.kind)).toEqual([
      "mcp_json_merge",
      "interpolation_policy",
      "hooks_json_merge",
      "interpolation_policy",
    ]);
    provider.applyPlan(plan, { forceConfig: false, skipConfig: false });
    const mcpDoc = JSON.parse(fs.readFileSync(path.join(projectRoot, ".mcp.json"), "utf8")) as {
      mcpServers: Record<string, unknown>;
    };
    expect(mcpDoc.mcpServers.a).toEqual({ url: "http://a" });
    const settings = JSON.parse(fs.readFileSync(path.join(layerRoot, "settings.json"), "utf8")) as {
      hooks: Record<string, unknown[]>;
    };
    expect(settings.hooks.SessionStart).toEqual([{ command: "echo hi" }]);
  });

  it("applies atpJsonDocumentStrategy into project .mcp.json after mcp merge", () => {
    fs.writeFileSync(
      path.join(staging, "mcp.json"),
      JSON.stringify({
        mcpServers: { cl: { command: "cl" } },
        atpJsonDocumentStrategy: {
          strategy: { mode: "deep_assign_paths", paths: [[]] },
          payload: { atp_claude_flag: true },
        },
      })
    );
    const manifest = {
      name: "cl-strat",
      assets: [{ path: "mcp.json", type: "mcp" as const, name: "m" }],
    };
    const provider = createClaudeAgentProvider(manifest);
    const part = new StagedPartInstallInput({
      partIndex: 1,
      partKind: "Mcp",
      stagingRelPaths: ["mcp.json"],
      stagingDir: staging,
    });
    const plan = provider.planInstall(installCtx(), part, { forceConfig: false, skipConfig: false });
    expect(plan.actions.map((a) => a.kind)).toEqual([
      "mcp_json_merge",
      "interpolation_policy",
      "json_document_strategy_merge",
      "interpolation_policy",
    ]);
    provider.applyPlan(plan, { forceConfig: false, skipConfig: false });
    const dest = path.join(projectRoot, ".mcp.json");
    const doc = JSON.parse(fs.readFileSync(dest, "utf8")) as Record<string, unknown>;
    expect((doc.mcpServers as Record<string, unknown>).cl).toEqual({ command: "cl" });
    expect(doc.atp_claude_flag).toBe(true);
  });

  it("planRemove does not delete settings.json or .mcp.json", () => {
    const provider = createClaudeAgentProvider({ name: "p", assets: [] });
    expect(
      provider.planRemove(installCtx(), { packageName: "p", fragmentKey: "settings.json" }).actions
    ).toHaveLength(0);
    expect(
      provider.planRemove(installCtx(), { packageName: "p", fragmentKey: ".mcp.json" }).actions
    ).toHaveLength(0);
    expect(
      provider.planRemove(installCtx(), { packageName: "p", fragmentKey: ".claude.json" }).actions
    ).toHaveLength(0);
  });

  it("user layer merges MCP into ~/.claude.json (os.homedir override)", () => {
    const fakeHome = path.join(tmp, "fake-home");
    const homedirSpy = vi.spyOn(os, "homedir").mockReturnValue(fakeHome);
    try {
      fs.writeFileSync(
        path.join(staging, "mcp.json"),
        JSON.stringify({ mcpServers: { u: { command: "c" } } })
      );
      const userLayerRoot = path.join(fakeHome, ".claude");
      fs.mkdirSync(userLayerRoot, { recursive: true });
      const ctx = {
        agent: "claude" as const,
        layer: "user" as const,
        projectRoot: path.join(tmp, "unused-proj"),
        layerRoot: userLayerRoot,
        stagingDir: staging,
      };
      const manifest = {
        name: "u",
        assets: [{ path: "mcp.json", type: "mcp" as const, name: "m" }],
      };
      const provider = createClaudeAgentProvider(manifest);
      const part = new StagedPartInstallInput({
        partIndex: 1,
        partKind: "Mcp",
        stagingRelPaths: ["mcp.json"],
        stagingDir: staging,
      });
      const plan = provider.planInstall(ctx, part, { forceConfig: false, skipConfig: false });
      const act = plan.actions[0];
      expect(act.kind).toBe("mcp_json_merge");
      if (act.kind !== "mcp_json_merge") throw new Error("expected mcp");
      expect(act.mergeBase).toBe("user_home");
      expect(act.relativeTargetPath).toBe(".claude.json");
      provider.applyPlan(plan, { forceConfig: false, skipConfig: false });
      const dest = path.join(fakeHome, ".claude.json");
      const doc = JSON.parse(fs.readFileSync(dest, "utf8")) as { mcpServers: Record<string, unknown> };
      expect(doc.mcpServers.u).toEqual({ command: "c" });
    } finally {
      homedirSpy.mockRestore();
    }
  });

  it("user layer MCP conflict cites ~/.claude.json in error", () => {
    const fakeHome = path.join(tmp, "fake-home2");
    const homedirSpy = vi.spyOn(os, "homedir").mockReturnValue(fakeHome);
    try {
      fs.mkdirSync(fakeHome, { recursive: true });
      fs.writeFileSync(
        path.join(fakeHome, ".claude.json"),
        JSON.stringify({ mcpServers: { dup: { command: "old" } } }),
        "utf8"
      );
      fs.writeFileSync(
        path.join(staging, "mcp.json"),
        JSON.stringify({ mcpServers: { dup: { command: "new" } } })
      );
      const userLayerRoot = path.join(fakeHome, ".claude");
      fs.mkdirSync(userLayerRoot, { recursive: true });
      const ctx = {
        agent: "claude" as const,
        layer: "user" as const,
        projectRoot: path.join(tmp, "unused"),
        layerRoot: userLayerRoot,
        stagingDir: staging,
      };
      const provider = createClaudeAgentProvider({
        name: "x",
        assets: [{ path: "mcp.json", type: "mcp" as const, name: "m" }],
      });
      const part = new StagedPartInstallInput({
        partIndex: 1,
        partKind: "Mcp",
        stagingRelPaths: ["mcp.json"],
        stagingDir: staging,
      });
      const plan = provider.planInstall(ctx, part, { forceConfig: false, skipConfig: false });
      expect(() => provider.applyPlan(plan, { forceConfig: false, skipConfig: false })).toThrow(
        McpMergeAmbiguousError
      );
      try {
        provider.applyPlan(plan, { forceConfig: false, skipConfig: false });
      } catch (e) {
        expect((e as Error).message).toContain("~/.claude.json");
      }
    } finally {
      homedirSpy.mockRestore();
    }
  });
});
