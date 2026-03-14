/**
 * Unit tests for copyPackageAssets.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { copyPackageAssets } from "../../src/install/copy-assets.js";

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

  it("skips missing source files", () => {
    copyPackageAssets(pkgDir, {
      name: "test",
      assets: [{ path: "missing.md", type: "skill", name: "missing" }],
    }, agentBase);

    const dest = path.join(agentBase, "skills", "missing.md");
    expect(fs.existsSync(dest)).toBe(false);
  });

  it("skips program assets (TODO)", () => {
    fs.mkdirSync(path.join(pkgDir, "bin"), { recursive: true });
    fs.writeFileSync(path.join(pkgDir, "bin", "cmd"), "#!/bin/sh");
    copyPackageAssets(pkgDir, {
      name: "test",
      assets: [{ path: "bin/cmd", type: "program", name: "cmd" }],
    }, agentBase);

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
});
