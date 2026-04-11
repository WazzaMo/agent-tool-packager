/**
 * Unit tests: {@link CodexAgentProvider} plan + apply (rules under `.codex/`, skills under `.agents/skills/`).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import { StagedPartInstallInput } from "../../src/file-ops/part-install-input.js";
import { CodexHooksFeatureConflictError } from "../../src/file-ops/mcp-merge/errors.js";
import { parseCodexConfigTomlRoot } from "../../src/file-ops/mcp-merge/mcp-codex-toml-merge.js";
import { createCodexAgentProvider } from "../../src/provider/codex-agent-provider.js";

describe("CodexAgentProvider", () => {
  let tmp: string;
  let staging: string;
  let layerRoot: string;
  let projectRoot: string;

  beforeEach(() => {
    tmp = path.join(os.tmpdir(), `atp-codex-${Date.now()}`);
    staging = path.join(tmp, "pkg");
    projectRoot = path.join(tmp, "proj");
    layerRoot = path.join(projectRoot, ".codex");
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
      agent: "codex" as const,
      layer: "project" as const,
      projectRoot,
      layerRoot,
      stagingDir: staging,
    };
  }

  it("planInstall emits plain_markdown_write under rules/ plus AGENTS.md managed block", () => {
    fs.writeFileSync(path.join(staging, "alpha.md"), "# A\n");
    const manifest = {
      name: "pkg-a",
      version: "1.0.0",
      assets: [{ path: "alpha.md", type: "rule" as const, name: "alpha" }],
    };
    const provider = createCodexAgentProvider(manifest);
    const part = new StagedPartInstallInput({
      partIndex: 1,
      partKind: "Rule",
      stagingRelPaths: ["alpha.md"],
      stagingDir: staging,
    });
    const plan = provider.planInstall(installCtx(), part, { forceConfig: false, skipConfig: false });
    expect(plan.actions).toHaveLength(2);
    expect(plan.actions[0].kind).toBe("plain_markdown_write");
    if (plan.actions[0].kind === "plain_markdown_write") {
      expect(plan.actions[0].relativeTargetPath).toBe("rules/alpha.md");
      expect(plan.actions[0].destinationRoot).toBeUndefined();
    }
    expect(plan.actions[1].kind).toBe("markdown_managed_block_patch");
    if (plan.actions[1].kind === "markdown_managed_block_patch") {
      expect(plan.actions[1].relativeTargetPath).toBe("AGENTS.md");
      expect(plan.actions[1].body).toContain("./.codex/rules/alpha.md");
    }
  });

  it("applyPlan writes skill SKILL.md under project .agents/skills/", () => {
    fs.writeFileSync(
      path.join(staging, "SKILL.md"),
      "---\nname: my-codex-skill\ndescription: D\n---\n\n# Body\n"
    );
    const manifest = {
      name: "sk-pkg",
      assets: [{ path: "SKILL.md", type: "skill" as const, name: "s" }],
    };
    const provider = createCodexAgentProvider(manifest);
    const part = new StagedPartInstallInput({
      partIndex: 1,
      partKind: "Skill",
      stagingRelPaths: ["SKILL.md"],
      stagingDir: staging,
    });
    const plan = provider.planInstall(installCtx(), part, { forceConfig: false, skipConfig: false });
    expect(plan.actions).toHaveLength(1);
    const a0 = plan.actions[0];
    expect(a0.kind).toBe("plain_markdown_write");
    if (a0.kind === "plain_markdown_write") {
      expect(a0.relativeTargetPath).toBe(".agents/skills/my-codex-skill/SKILL.md");
      expect(a0.destinationRoot).toBe("project");
    }
    provider.applyPlan(plan, { forceConfig: false, skipConfig: false });
    const dest = path.join(projectRoot, ".agents", "skills", "my-codex-skill", "SKILL.md");
    expect(fs.existsSync(dest)).toBe(true);
    expect(fs.readFileSync(dest, "utf8")).toContain("# Body");
  });

  it("planInstall prepends codex hooks feature merge before hooks_json_merge for hooks.json", () => {
    fs.writeFileSync(
      path.join(staging, "hooks.json"),
      JSON.stringify({ hooks: { SessionStart: [{ command: "echo" }] } })
    );
    const manifest = {
      name: "h",
      assets: [{ path: "hooks.json", type: "hook" as const, name: "h" }],
    };
    const provider = createCodexAgentProvider(manifest);
    const part = new StagedPartInstallInput({
      partIndex: 1,
      partKind: "Hook",
      stagingRelPaths: ["hooks.json"],
      stagingDir: staging,
    });
    const plan = provider.planInstall(installCtx(), part, { forceConfig: false, skipConfig: false });
    expect(plan.actions.map((a) => a.kind)).toEqual([
      "codex_config_toml_hooks_feature_merge",
      "hooks_json_merge",
      "interpolation_policy",
    ]);
    provider.applyPlan(plan, { forceConfig: false, skipConfig: false });
    const root = parseCodexConfigTomlRoot(fs.readFileSync(path.join(layerRoot, "config.toml"), "utf8"));
    expect((root.features as { codex_hooks: boolean }).codex_hooks).toBe(true);
  });

  it("applyPlan refuses hooks when config.toml sets codex_hooks false without forceConfig", () => {
    fs.writeFileSync(
      path.join(layerRoot, "config.toml"),
      '[features]\ncodex_hooks = false\n'
    );
    fs.writeFileSync(
      path.join(staging, "hooks.json"),
      JSON.stringify({ hooks: { SessionStart: [{ command: "echo" }] } })
    );
    const manifest = {
      name: "h2",
      assets: [{ path: "hooks.json", type: "hook" as const, name: "h" }],
    };
    const provider = createCodexAgentProvider(manifest);
    const part = new StagedPartInstallInput({
      partIndex: 1,
      partKind: "Hook",
      stagingRelPaths: ["hooks.json"],
      stagingDir: staging,
    });
    const plan = provider.planInstall(installCtx(), part, { forceConfig: false, skipConfig: false });
    expect(() =>
      provider.applyPlan(plan, { forceConfig: false, skipConfig: false })
    ).toThrow(CodexHooksFeatureConflictError);
  });

  it("planInstall emits mcp_codex_config_toml_merge for config.toml under layerRoot", () => {
    fs.writeFileSync(path.join(staging, "m.json"), JSON.stringify({ mcpServers: { x: { command: "c" } } }));
    const manifest = {
      name: "m",
      assets: [{ path: "m.json", type: "mcp" as const, name: "m" }],
    };
    const provider = createCodexAgentProvider(manifest);
    const part = new StagedPartInstallInput({
      partIndex: 1,
      partKind: "Mcp",
      stagingRelPaths: ["m.json"],
      stagingDir: staging,
    });
    const plan = provider.planInstall(installCtx(), part, { forceConfig: false, skipConfig: false });
    expect(plan.actions[0].kind).toBe("mcp_codex_config_toml_merge");
    provider.applyPlan(plan, { forceConfig: false, skipConfig: false });
    const tomlPath = path.join(layerRoot, "config.toml");
    expect(fs.existsSync(tomlPath)).toBe(true);
    const root = parseCodexConfigTomlRoot(fs.readFileSync(tomlPath, "utf8"));
    expect(root.mcp_servers).toBeDefined();
    expect((root.mcp_servers as Record<string, unknown>).x).toEqual({ command: "c" });
  });

  it("planRemove uses project root for .agents/ fragment keys", () => {
    const skillFile = path.join(projectRoot, ".agents", "skills", "t", "SKILL.md");
    fs.mkdirSync(path.dirname(skillFile), { recursive: true });
    fs.writeFileSync(skillFile, "x");
    const manifest = { name: "p", assets: [] };
    const provider = createCodexAgentProvider(manifest);
    const removePlan = provider.planRemove(installCtx(), {
      packageName: "p",
      fragmentKey: ".agents/skills/t/SKILL.md",
    });
    expect(removePlan.actions).toHaveLength(1);
    provider.applyPlan(removePlan, { forceConfig: false, skipConfig: false });
    expect(fs.existsSync(skillFile)).toBe(false);
  });

  it("planRemove does not delete config.toml", () => {
    const cfgPath = path.join(layerRoot, "config.toml");
    fs.writeFileSync(cfgPath, "");
    const manifest = { name: "p", assets: [] };
    const provider = createCodexAgentProvider(manifest);
    const removePlan = provider.planRemove(installCtx(), {
      packageName: "p",
      fragmentKey: "config.toml",
    });
    expect(removePlan.actions).toHaveLength(0);
    expect(fs.existsSync(cfgPath)).toBe(true);
  });
});
