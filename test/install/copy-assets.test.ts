/**
 * Unit tests for copyPackageAssets.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { parseCodexConfigTomlRoot } from "../../src/file-ops/mcp-merge/mcp-codex-toml-merge.js";
import {
  agentDestinationForAsset,
  agentProviderRemovalDestination,
  copyPackageAssets,
  patchMarkdownBundlePlaceholders,
} from "../../src/install/copy-assets.js";

function createTempDir(): string {
  const dir = path.join(os.tmpdir(), `atp-copy-assets-${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

describe("copyPackageAssets", () => {
  let pkgDir: string;
  let agentBase: string;

  beforeEach(() => {
    const base = createTempDir();
    pkgDir = path.join(base, "pkg");
    agentBase = path.join(base, "agent");
    fs.mkdirSync(pkgDir, { recursive: true });
  });

  afterEach(() => {
    try {
      fs.rmSync(path.dirname(pkgDir), { recursive: true });
    } catch {
      /* ignore */
    }
  });

  it("copies skill asset to agent skills/ directory", () => {
    fs.writeFileSync(path.join(pkgDir, "SKILL.md"), "# Test Skill");
    copyPackageAssets(pkgDir, {
      name: "test",
      assets: [{ path: "SKILL.md", type: "skill", name: "SKILL" }],
    }, agentBase);

    const dest = path.join(agentBase, "skills", "SKILL.md");
    expect(fs.existsSync(dest)).toBe(true);
    expect(fs.readFileSync(dest, "utf8")).toBe("# Test Skill");
  });

  it("copies rule asset to agent rules/ directory", () => {
    fs.writeFileSync(path.join(pkgDir, "RULE.md"), "# Rule");
    copyPackageAssets(pkgDir, {
      name: "test",
      assets: [{ path: "RULE.md", type: "rule", name: "RULE" }],
    }, agentBase);

    const dest = path.join(agentBase, "rules", "RULE.md");
    expect(fs.existsSync(dest)).toBe(true);
  });

  it("places hook hooks.json at agent root and other hook files under hooks/", () => {
    fs.writeFileSync(path.join(pkgDir, "hooks.json"), '{"version":1}');
    fs.writeFileSync(path.join(pkgDir, "audit.sh"), "#!/bin/sh\n");
    copyPackageAssets(pkgDir, {
      name: "test",
      assets: [
        { path: "hooks.json", type: "hook", name: "hooks" },
        { path: "audit.sh", type: "hook", name: "audit" },
      ],
    }, agentBase);

    expect(fs.existsSync(path.join(agentBase, "hooks.json"))).toBe(true);
    expect(fs.readFileSync(path.join(agentBase, "hooks.json"), "utf8")).toBe('{"version":1}');
    expect(fs.existsSync(path.join(agentBase, "hooks", "audit.sh"))).toBe(true);
  });

  it("agentDestinationForAsset matches Hook layout", () => {
    const base = path.join(os.tmpdir(), "atp-dest-hook");
    expect(
      agentDestinationForAsset(base, { type: "hook", path: "hooks.json" }).filePath
    ).toBe(path.join(base, "hooks.json"));
    expect(
      agentDestinationForAsset(base, { type: "hook", path: "fmt.sh" }).filePath
    ).toBe(path.join(base, "hooks", "fmt.sh"));
  });

  it("agentProviderRemovalDestination maps Gemini MCP and hooks to settings.json", () => {
    const base = path.join(os.tmpdir(), "atp-gem-rem");
    expect(
      agentProviderRemovalDestination("gemini", base, { type: "mcp", path: "x.json" }).filePath
    ).toBe(path.join(base, "settings.json"));
    expect(
      agentProviderRemovalDestination("gemini", base, { type: "hook", path: "hooks.json" }).filePath
    ).toBe(path.join(base, "settings.json"));
    expect(
      agentProviderRemovalDestination("gemini", base, { type: "rule", path: "c.toml" }).filePath
    ).toBe(path.join(base, "commands", "c.toml"));
  });

  it("agentProviderRemovalDestination maps Claude MCP to repo-root .mcp.json and hooks to settings.json", () => {
    const claudeDir = path.join(os.tmpdir(), "atp-claude-rem", "proj", ".claude");
    expect(
      path.normalize(agentProviderRemovalDestination("claude", claudeDir, { type: "mcp", path: "x.json" }).filePath)
    ).toBe(path.normalize(path.join(claudeDir, "..", ".mcp.json")));
    expect(
      agentProviderRemovalDestination("claude", claudeDir, { type: "hook", path: "hooks.json" }).filePath
    ).toBe(path.join(claudeDir, "settings.json"));
  });

  it("agentDestinationForAsset and agentProviderRemovalDestination use config.toml for Codex MCP under .codex/", () => {
    const codexDir = path.join(os.tmpdir(), "atp-codex-rem", ".codex");
    expect(agentDestinationForAsset(codexDir, { type: "mcp", path: "m.json" }).filePath).toBe(
      path.join(codexDir, "config.toml")
    );
    expect(agentProviderRemovalDestination("codex", codexDir, { type: "mcp", path: "m.json" }).filePath).toBe(
      path.join(codexDir, "config.toml")
    );
  });

  it("merges MCP asset into Codex config.toml when agent base is .codex/", () => {
    const base = createTempDir();
    const pkg = path.join(base, "pkg");
    const codex = path.join(base, "proj", ".codex");
    fs.mkdirSync(pkg, { recursive: true });
    fs.mkdirSync(codex, { recursive: true });
    fs.writeFileSync(
      path.join(pkg, "packaged-mcp.json"),
      JSON.stringify({ mcpServers: { atp_test_srv: { command: "echo" } } })
    );
    copyPackageAssets(
      pkg,
      { name: "t", assets: [{ path: "packaged-mcp.json", type: "mcp", name: "m" }] },
      codex
    );
    const dest = path.join(codex, "config.toml");
    expect(fs.existsSync(dest)).toBe(true);
    const root = parseCodexConfigTomlRoot(fs.readFileSync(dest, "utf8"));
    expect((root.mcp_servers as Record<string, unknown>).atp_test_srv).toEqual({ command: "echo" });
    try {
      fs.rmSync(base, { recursive: true });
    } catch {
      /* ignore */
    }
  });

  it("copies prompt asset to agent prompts/ directory", () => {
    fs.writeFileSync(path.join(pkgDir, "review.md"), "# Review prompt");
    copyPackageAssets(pkgDir, {
      name: "test",
      assets: [{ path: "review.md", type: "prompt", name: "review" }],
    }, agentBase);

    const dest = path.join(agentBase, "prompts", "review.md");
    expect(fs.existsSync(dest)).toBe(true);
    expect(fs.readFileSync(dest, "utf8")).toBe("# Review prompt");
  });

  it("skips missing source files", () => {
    copyPackageAssets(pkgDir, {
      name: "test",
      assets: [{ path: "missing.md", type: "skill", name: "missing" }],
    }, agentBase);

    const dest = path.join(agentBase, "skills", "missing.md");
    expect(fs.existsSync(dest)).toBe(false);
  });

  it("copies program assets to installBinDir when provided (Feature 3)", () => {
    const binDir = path.join(path.dirname(pkgDir), "bin");
    fs.mkdirSync(path.join(pkgDir, "patch_tool", "bin"), { recursive: true });
    const scriptPath = path.join(pkgDir, "patch_tool", "bin", "file-patch.sh");
    fs.writeFileSync(scriptPath, "#!/bin/sh\necho patching");
    copyPackageAssets(
      pkgDir,
      {
        name: "copyrighter",
        assets: [{ path: "patch_tool/bin/file-patch.sh", type: "program", name: "file-patch" }],
      },
      agentBase,
      undefined,
      binDir
    );

    const dest = path.join(binDir, "file-patch.sh");
    expect(fs.existsSync(dest)).toBe(true);
    expect(fs.readFileSync(dest, "utf8")).toBe("#!/bin/sh\necho patching");
    if (process.platform !== "win32") {
      expect(fs.statSync(dest).mode & 0o777).toBe(0o755);
    }
  });

  it("preserves restrictive executable mode from source program asset when u+x is set", () => {
    const binDir = path.join(path.dirname(pkgDir), "bin2");
    fs.mkdirSync(path.join(pkgDir, "tools"), { recursive: true });
    const scriptPath = path.join(pkgDir, "tools", "secret.sh");
    fs.writeFileSync(scriptPath, "#!/bin/sh\necho x");
    fs.chmodSync(scriptPath, 0o700);
    copyPackageAssets(
      pkgDir,
      {
        name: "p",
        assets: [{ path: "tools/secret.sh", type: "program", name: "secret" }],
      },
      agentBase,
      undefined,
      binDir
    );
    const dest = path.join(binDir, "secret.sh");
    expect(fs.existsSync(dest)).toBe(true);
    if (process.platform !== "win32") {
      expect(fs.statSync(dest).mode & 0o777).toBe(0o700);
    }
  });

  it("skips program assets when installBinDir not provided", () => {
    fs.mkdirSync(path.join(pkgDir, "bin"), { recursive: true });
    fs.writeFileSync(path.join(pkgDir, "bin", "cmd"), "#!/bin/sh");
    copyPackageAssets(
      pkgDir,
      { name: "test", assets: [{ path: "bin/cmd", type: "program", name: "cmd" }] },
      agentBase
    );

    const dest = path.join(agentBase, "bin", "cmd");
    expect(fs.existsSync(dest)).toBe(false);
  });

  it("copies multiple assets", () => {
    fs.writeFileSync(path.join(pkgDir, "a.md"), "a");
    fs.writeFileSync(path.join(pkgDir, "b.md"), "b");
    copyPackageAssets(pkgDir, {
      name: "test",
      assets: [
        { path: "a.md", type: "rule", name: "a" },
        { path: "b.md", type: "skill", name: "b" },
      ],
    }, agentBase);

    expect(fs.existsSync(path.join(agentBase, "rules", "a.md"))).toBe(true);
    expect(fs.existsSync(path.join(agentBase, "skills", "b.md"))).toBe(true);
  });

  it("handles empty assets array", () => {
    copyPackageAssets(pkgDir, { name: "test", assets: [] }, agentBase);
    expect(fs.existsSync(agentBase)).toBe(false);
  });

  it("legacy Claude MCP merges into projectRoot/.mcp.json", () => {
    const projRoot = path.join(path.dirname(pkgDir), "claude-proj");
    const claudeDir = path.join(projRoot, ".claude");
    fs.mkdirSync(claudeDir, { recursive: true });
    fs.writeFileSync(
      path.join(pkgDir, "mcp.json"),
      JSON.stringify({ mcpServers: { pkgSrv: { command: "tool" } } })
    );
    copyPackageAssets(
      pkgDir,
      { name: "lm", assets: [{ path: "mcp.json", type: "mcp", name: "m" }] },
      claudeDir,
      undefined,
      undefined,
      undefined,
      { forceConfig: false, skipConfig: false },
      { projectRoot: projRoot, claudeAgentDir: claudeDir }
    );
    const dest = path.join(projRoot, ".mcp.json");
    expect(fs.existsSync(dest)).toBe(true);
    const doc = JSON.parse(fs.readFileSync(dest, "utf8")) as { mcpServers: Record<string, unknown> };
    expect(doc.mcpServers.pkgSrv).toEqual({ command: "tool" });
  });

  it("legacy Claude hooks.json merges into .claude/settings.json", () => {
    const projRoot = path.join(path.dirname(pkgDir), "claude-proj2");
    const claudeDir = path.join(projRoot, ".claude");
    fs.mkdirSync(claudeDir, { recursive: true });
    fs.writeFileSync(
      path.join(pkgDir, "hooks.json"),
      JSON.stringify({ hooks: { SessionStart: [{ id: "p", command: "echo" }] } })
    );
    copyPackageAssets(
      pkgDir,
      { name: "lh", assets: [{ path: "hooks.json", type: "hook", name: "h" }] },
      claudeDir,
      undefined,
      undefined,
      undefined,
      { forceConfig: false, skipConfig: false },
      { projectRoot: projRoot, claudeAgentDir: claudeDir }
    );
    const settingsPath = path.join(claudeDir, "settings.json");
    expect(fs.existsSync(settingsPath)).toBe(true);
    const doc = JSON.parse(fs.readFileSync(settingsPath, "utf8")) as {
      hooks: Record<string, unknown[]>;
    };
    expect(doc.hooks.SessionStart).toEqual([{ id: "p", command: "echo" }]);
  });

  describe("text patching (Feature 3: {bundle_name} placeholder)", () => {
    it("replaces {bundle_name} with install path in skill when bundlePathMap provided", () => {
      const skillContent = `---
name: copyrighter
---
Run {patch_tool}/file-patch.sh {filepath} {target} {message}
`;
      fs.writeFileSync(path.join(pkgDir, "SKILL.md"), skillContent);
      copyPackageAssets(
        pkgDir,
        { name: "copyrighter", assets: [{ path: "SKILL.md", type: "skill", name: "SKILL" }] },
        agentBase,
        { patch_tool: "/home/user/.local/bin" }
      );
      const dest = path.join(agentBase, "skills", "SKILL.md");
      expect(fs.existsSync(dest)).toBe(true);
      const patched = fs.readFileSync(dest, "utf8");
      expect(patched).toContain("/home/user/.local/bin/file-patch.sh");
      expect(patched).not.toContain("{patch_tool}");
    });

    it("replaces {bundle_name} in rule when bundlePathMap provided", () => {
      const ruleContent = `# Rule
Use {my_util} to process files.
`;
      fs.writeFileSync(path.join(pkgDir, "RULE.md"), ruleContent);
      copyPackageAssets(
        pkgDir,
        { name: "test", assets: [{ path: "RULE.md", type: "rule", name: "RULE" }] },
        agentBase,
        { my_util: "/project/.atp_safehouse/pkg-exec/bin" }
      );
      const dest = path.join(agentBase, "rules", "RULE.md");
      const patched = fs.readFileSync(dest, "utf8");
      expect(patched).toContain("/project/.atp_safehouse/pkg-exec/bin");
      expect(patched).not.toContain("{my_util}");
    });

    it("leaves placeholders unchanged when bundlePathMap is empty or not provided", () => {
      const skillContent = "Run {patch_tool}/script.sh";
      fs.writeFileSync(path.join(pkgDir, "SKILL.md"), skillContent);
      copyPackageAssets(
        pkgDir,
        { name: "test", assets: [{ path: "SKILL.md", type: "skill", name: "SKILL" }] },
        agentBase
      );
      const dest = path.join(agentBase, "skills", "SKILL.md");
      expect(fs.readFileSync(dest, "utf8")).toBe("Run {patch_tool}/script.sh");
    });

    it("replaces multiple bundle placeholders in one file", () => {
      const content = "Tool A: {tool_a}, Tool B: {tool_b}";
      fs.writeFileSync(path.join(pkgDir, "SKILL.md"), content);
      copyPackageAssets(
        pkgDir,
        { name: "test", assets: [{ path: "SKILL.md", type: "skill", name: "SKILL" }] },
        agentBase,
        { tool_a: "/path/a", tool_b: "/path/b" }
      );
      const patched = fs.readFileSync(path.join(agentBase, "skills", "SKILL.md"), "utf8");
      expect(patched).toBe("Tool A: /path/a, Tool B: /path/b");
    });
  });
});

describe("patchMarkdownBundlePlaceholders", () => {
  it("returns input unchanged when map missing or empty", () => {
    expect(patchMarkdownBundlePlaceholders("x {a}", undefined)).toBe("x {a}");
    expect(patchMarkdownBundlePlaceholders("x {a}", {})).toBe("x {a}");
  });

  it("replaces placeholders like copyPackageAssets", () => {
    expect(patchMarkdownBundlePlaceholders("p {myb}/x", { myb: "/bin" })).toBe("p /bin/x");
  });
});
