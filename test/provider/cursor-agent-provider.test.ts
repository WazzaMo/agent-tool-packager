/**
 * Unit tests: {@link CursorAgentProvider} plan + apply for Cursor rules and related assets.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import { OperationIds } from "../../src/file-ops/operation-ids.js";
import { StagedPartInstallInput } from "../../src/file-ops/part-install-input.js";
import { createCursorAgentProvider } from "../../src/provider/cursor-agent-provider.js";

describe("CursorAgentProvider", () => {
  let tmp: string;
  let staging: string;
  let layerRoot: string;

  beforeEach(() => {
    tmp = path.join(os.tmpdir(), `atp-cap-${Date.now()}`);
    staging = path.join(tmp, "pkg");
    layerRoot = path.join(tmp, "proj", ".cursor");
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
      agent: "cursor" as const,
      layer: "project" as const,
      projectRoot: path.join(tmp, "proj"),
      layerRoot,
      stagingDir: staging,
    };
  }

  it("planInstall emits plain_markdown_write actions under rules/", () => {
    fs.writeFileSync(path.join(staging, "alpha.md"), "# A\n");
    const manifest = {
      name: "pkg-a",
      version: "1.0.0",
      assets: [{ path: "alpha.md", type: "rule" as const, name: "alpha" }],
    };
    const provider = createCursorAgentProvider(manifest);
    const part = new StagedPartInstallInput({
      partIndex: 1,
      partKind: "Rule",
      stagingRelPaths: ["alpha.md"],
      stagingDir: staging,
    });
    const plan = provider.planInstall(installCtx(), part, { forceConfig: false, skipConfig: false });
    expect(plan.actions).toHaveLength(1);
    expect(plan.actions[0].kind).toBe("plain_markdown_write");
    expect(plan.actions[0].operationId).toBe(OperationIds.PlainMarkdownEmit);
    expect(plan.actions[0].relativeTargetPath).toBe("rules/alpha.md");
    expect(plan.actions[0].provenance.fragmentKey).toBe("rules/alpha.md");
    expect(plan.actions[0].content).toBe("# A\n");
  });

  it("applyPlan writes rules file to layerRoot", () => {
    fs.writeFileSync(path.join(staging, "beta.md"), "body");
    const manifest = {
      name: "pkg-b",
      assets: [{ path: "beta.md", type: "rule" as const, name: "b" }],
    };
    const provider = createCursorAgentProvider(manifest);
    const part = new StagedPartInstallInput({
      partIndex: 1,
      partKind: "Rule",
      stagingRelPaths: ["beta.md"],
      stagingDir: staging,
    });
    const plan = provider.planInstall(installCtx(), part, { forceConfig: false, skipConfig: false });
    const written: string[] = [];
    provider.applyPlan(plan, { forceConfig: false, skipConfig: false }, (p) => written.push(p));
    const dest = path.join(layerRoot, "rules", "beta.md");
    expect(written).toEqual([dest]);
    expect(fs.readFileSync(dest, "utf8")).toBe("body");
  });

  it("applies {bundle} placeholder when bundlePathMap is set", () => {
    fs.writeFileSync(path.join(staging, "x.md"), "Use {tool}");
    const manifest = {
      name: "pkg-c",
      assets: [{ path: "x.md", type: "rule" as const, name: "x" }],
    };
    const provider = createCursorAgentProvider(manifest, { tool: "/opt/tool" });
    const part = new StagedPartInstallInput({
      partIndex: 1,
      partKind: "Rule",
      stagingRelPaths: ["x.md"],
      stagingDir: staging,
    });
    const plan = provider.planInstall(installCtx(), part, { forceConfig: false, skipConfig: false });
    expect(plan.actions[0].content).toBe("Use /opt/tool");
  });

  it("planInstall places Skill under skills/{name}/SKILL.md (Agent Skills layout)", () => {
    fs.writeFileSync(path.join(staging, "s.md"), "# S\n");
    const manifest = {
      name: "sk",
      assets: [{ path: "s.md", type: "skill" as const, name: "s" }],
    };
    const provider = createCursorAgentProvider(manifest);
    const part = new StagedPartInstallInput({
      partIndex: 1,
      partKind: "Skill",
      stagingRelPaths: ["s.md"],
      stagingDir: staging,
    });
    const plan = provider.planInstall(installCtx(), part, { forceConfig: false, skipConfig: false });
    expect(plan.actions[0].relativeTargetPath).toBe("skills/s/SKILL.md");
    expect(plan.actions[0].provenance.fragmentKey).toBe("skills/s/SKILL.md");
    expect(plan.actions[0].kind).toBe("plain_markdown_write");
    expect(plan.actions[0].content).toContain("# S");
    expect(plan.actions[0].content).toContain("name: s");
  });

  it("assembles .mdc with YAML frontmatter using RuleAssembly op id", () => {
    const body = `---\ndescription: D\nglobs:\n  - "*.ts"\n---\n\n# Hi\n`;
    fs.writeFileSync(path.join(staging, "r.mdc"), body);
    const manifest = {
      name: "mdc",
      assets: [{ path: "r.mdc", type: "rule" as const, name: "r" }],
    };
    const provider = createCursorAgentProvider(manifest);
    const part = new StagedPartInstallInput({
      partIndex: 1,
      partKind: "Rule",
      stagingRelPaths: ["r.mdc"],
      stagingDir: staging,
    });
    const plan = provider.planInstall(installCtx(), part, { forceConfig: false, skipConfig: false });
    expect(plan.actions[0].operationId).toBe(OperationIds.RuleAssembly);
    expect(plan.actions[0].content).toContain("description: D");
    expect(plan.actions[0].content.trimEnd().endsWith("# Hi")).toBe(true);
  });

  it("merges mcp.json from staged MCP asset", () => {
    fs.writeFileSync(
      path.join(staging, "mcp.json"),
      JSON.stringify({ mcpServers: { a: { url: "http://a" } } })
    );
    const manifest = {
      name: "m",
      assets: [{ path: "mcp.json", type: "mcp" as const, name: "m" }],
    };
    const provider = createCursorAgentProvider(manifest);
    const part = new StagedPartInstallInput({
      partIndex: 1,
      partKind: "Mcp",
      stagingRelPaths: ["mcp.json"],
      stagingDir: staging,
    });
    const plan = provider.planInstall(installCtx(), part, { forceConfig: false, skipConfig: false });
    expect(plan.actions[0].kind).toBe("mcp_json_merge");
    provider.applyPlan(plan, { forceConfig: false, skipConfig: false });
    const dest = path.join(layerRoot, "mcp.json");
    const doc = JSON.parse(fs.readFileSync(dest, "utf8")) as { mcpServers: Record<string, unknown> };
    expect(doc.mcpServers.a).toEqual({ url: "http://a" });
  });

  it("planRemove deletes a managed rules file by fragmentKey", () => {
    const dest = path.join(layerRoot, "rules", "gone.md");
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, "x");
    const manifest = { name: "p", assets: [] };
    const provider = createCursorAgentProvider(manifest);
    const removePlan = provider.planRemove(installCtx(), {
      packageName: "p",
      fragmentKey: "rules/gone.md",
    });
    expect(removePlan.actions).toHaveLength(1);
    expect(removePlan.actions[0].kind).toBe("delete_managed_file");
    provider.applyPlan(removePlan, { forceConfig: false, skipConfig: false });
    expect(fs.existsSync(dest)).toBe(false);
  });

  it("planRemove does not delete mcp.json", () => {
    const manifest = { name: "p", assets: [] };
    const provider = createCursorAgentProvider(manifest);
    const removePlan = provider.planRemove(installCtx(), {
      packageName: "p",
      fragmentKey: "mcp.json",
    });
    expect(removePlan.actions).toHaveLength(0);
  });
});
