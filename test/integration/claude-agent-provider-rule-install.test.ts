/**
 * Integration: rule-only package install uses ClaudeAgentProvider path (dist CLI + temp project).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";

import { runAtp } from "./test-helpers.js";
import {
  atpCwd,
  initPackage,
  createTempPackageEnv,
  cleanupTempPackageEnv,
} from "./package-developer-helpers.js";
import { usesClaudeAgentProviderCatalogInstall } from "../../src/install/catalog-install-agent-provider-routing.js";

describe("Integration: ClaudeAgentProvider rule install", () => {
  let base: string;
  let stationDir: string;
  let pkgDir: string;
  let projectDir: string;

  beforeEach(() => {
    const env = createTempPackageEnv("atp-claude-rule");
    base = env.base;
    stationDir = env.stationDir;
    pkgDir = env.pkgDir;

    projectDir = path.join(base, "claude_proj");
    fs.mkdirSync(path.join(projectDir, ".git"), { recursive: true });

    runAtp(["station", "init"], atpCwd(pkgDir, stationDir));
    const configPath = path.join(stationDir, "atp-config.yaml");
    fs.writeFileSync(
      configPath,
      `configuration:
  version: 0.1.0
  agent-paths:
    claude:
      project_path: .claude/
`
    );
    fs.writeFileSync(path.join(stationDir, "atp-safehouse-list.yaml"), "safehouse_paths: []\n");
  });

  afterEach(() => {
    cleanupTempPackageEnv(base);
  });

  it("gate is true for catalog rule-only + claude project install context", () => {
    const ruleContent = "# Provider path check\n";
    fs.writeFileSync(path.join(pkgDir, "r.md"), ruleContent);

    initPackage(pkgDir, stationDir, {
      type: "rule",
      name: "claude-cap-rule-pkg",
      version: "0.3.0",
      usage: "Claude provider routing test",
      components: ["r.md"],
      catalogAdd: true,
    });

    runAtp(["safehouse", "init"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
    runAtp(["agent", "claude"], { cwd: projectDir, env: { STATION_PATH: stationDir } });

    const stationPkg = path.join(stationDir, "user_packages", "claude-cap-rule-pkg");
    const agentBase = path.join(projectDir, ".claude");
    const manifest = {
      name: "claude-cap-rule-pkg",
      version: "0.3.0",
      type: "Rule",
      assets: [{ path: "r.md", type: "rule" as const, name: "r" }],
    };

    const providerCtx = {
      agent: "claude" as const,
      layer: "project" as const,
      projectRoot: projectDir,
      layerRoot: agentBase,
      stagingDir: stationPkg,
    };

    expect(
      usesClaudeAgentProviderCatalogInstall(providerCtx, manifest, {
        promptScope: "project",
        binaryScope: "user-bin",
        dependencies: false,
      })
    ).toBe(true);
  });

  it("atp install places rule under .claude/rules/ (ClaudeAgentProvider)", () => {
    const ruleContent = "# ClaudeAgentProvider e2e\nok\n";
    fs.writeFileSync(path.join(pkgDir, "rule-one.md"), ruleContent);

    initPackage(pkgDir, stationDir, {
      type: "rule",
      name: "claude-cap-e2e-rules",
      version: "1.0.0",
      usage: "E2E Claude provider",
      components: ["rule-one.md"],
      catalogAdd: true,
    });

    runAtp(["safehouse", "init"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
    runAtp(["agent", "claude"], { cwd: projectDir, env: { STATION_PATH: stationDir } });

    const out = runAtp(["install", "claude-cap-e2e-rules", "--project"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    expect(out).toContain("Installed claude-cap-e2e-rules");

    const dest = path.join(projectDir, ".claude", "rules", "rule-one.md");
    expect(fs.existsSync(dest)).toBe(true);
    expect(fs.readFileSync(dest, "utf8")).toBe(ruleContent);
  });

  it("atp install --station places rule under $HOME/.claude/rules/ (user layer)", () => {
    const fakeHome = path.join(base, "sim_home");
    fs.mkdirSync(fakeHome, { recursive: true });

    const ruleContent = "# Claude station scope\n";
    fs.writeFileSync(path.join(pkgDir, "station-rule.md"), ruleContent);

    initPackage(pkgDir, stationDir, {
      type: "rule",
      name: "claude-station-rule-pkg",
      version: "0.1.0",
      usage: "Claude user-layer install",
      components: ["station-rule.md"],
      catalogAdd: true,
    });

    runAtp(["safehouse", "init"], { cwd: projectDir, env: { STATION_PATH: stationDir, HOME: fakeHome } });
    runAtp(["agent", "claude"], { cwd: projectDir, env: { STATION_PATH: stationDir, HOME: fakeHome } });

    const out = runAtp(["install", "claude-station-rule-pkg", "--station"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir, HOME: fakeHome },
    });
    expect(out).toContain("Installed claude-station-rule-pkg");

    const dest = path.join(fakeHome, ".claude", "rules", "station-rule.md");
    expect(fs.existsSync(dest)).toBe(true);
    expect(fs.readFileSync(dest, "utf8")).toBe(ruleContent);
  });
});
