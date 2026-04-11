/**
 * Integration: rule package install uses CodexAgentProvider path (dist CLI + temp project).
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
import { usesCodexAgentProviderProjectInstall } from "../../src/install/catalog-install-agent-provider-routing.js";

describe("Integration: CodexAgentProvider rule install", () => {
  let base: string;
  let stationDir: string;
  let pkgDir: string;
  let projectDir: string;

  beforeEach(() => {
    const env = createTempPackageEnv("atp-codex-rule");
    base = env.base;
    stationDir = env.stationDir;
    pkgDir = env.pkgDir;

    projectDir = path.join(base, "codex_proj");
    fs.mkdirSync(path.join(projectDir, ".git"), { recursive: true });

    runAtp(["station", "init"], atpCwd(pkgDir, stationDir));
    const configPath = path.join(stationDir, "atp-config.yaml");
    fs.writeFileSync(
      configPath,
      `configuration:
  version: 0.1.0
  agent-paths:
    codex:
      project_path: .codex/
`
    );
    fs.writeFileSync(path.join(stationDir, "atp-safehouse-list.yaml"), "safehouse_paths: []\n");
  });

  afterEach(() => {
    cleanupTempPackageEnv(base);
  });

  it("gate is true for catalog rule-only + codex project install context", () => {
    const ruleContent = "# Provider path check\n";
    fs.writeFileSync(path.join(pkgDir, "r.md"), ruleContent);

    initPackage(pkgDir, stationDir, {
      type: "rule",
      name: "codex-cap-rule-pkg",
      version: "0.3.0",
      usage: "Codex provider routing test",
      components: ["r.md"],
      catalogAdd: true,
    });

    runAtp(["safehouse", "init"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
    runAtp(["agent", "codex"], { cwd: projectDir, env: { STATION_PATH: stationDir } });

    const stationPkg = path.join(stationDir, "user_packages", "codex-cap-rule-pkg");
    const agentBase = path.join(projectDir, ".codex");
    const manifest = {
      name: "codex-cap-rule-pkg",
      version: "0.3.0",
      type: "Rule",
      assets: [{ path: "r.md", type: "rule" as const, name: "r" }],
    };

    const providerCtx = {
      agent: "codex" as const,
      layer: "project" as const,
      projectRoot: projectDir,
      layerRoot: agentBase,
      stagingDir: stationPkg,
    };

    expect(
      usesCodexAgentProviderProjectInstall(providerCtx, manifest, {
        promptScope: "project",
        binaryScope: "user-bin",
        dependencies: false,
      })
    ).toBe(true);
  });

  it("atp install places rule under .codex/rules/ (CodexAgentProvider)", () => {
    const ruleContent = "# CodexAgentProvider e2e\nok\n";
    fs.writeFileSync(path.join(pkgDir, "rule-one.md"), ruleContent);

    initPackage(pkgDir, stationDir, {
      type: "rule",
      name: "codex-cap-e2e-rules",
      version: "1.0.0",
      usage: "E2E Codex provider",
      components: ["rule-one.md"],
      catalogAdd: true,
    });

    runAtp(["safehouse", "init"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
    runAtp(["agent", "codex"], { cwd: projectDir, env: { STATION_PATH: stationDir } });

    const out = runAtp(["install", "codex-cap-e2e-rules", "--project"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    expect(out).toContain("Installed codex-cap-e2e-rules");

    const dest = path.join(projectDir, ".codex", "rules", "rule-one.md");
    expect(fs.existsSync(dest)).toBe(true);
    expect(fs.readFileSync(dest, "utf8")).toBe(ruleContent);

    const agentsMd = path.join(projectDir, "AGENTS.md");
    expect(fs.existsSync(agentsMd)).toBe(true);
    const agg = fs.readFileSync(agentsMd, "utf8");
    expect(agg).toMatch(/ATP_MGR_[a-f0-9]+_BEGIN/);
    expect(agg).toContain("codex-cap-e2e-rules");
    expect(agg).toContain("./.codex/rules/rule-one.md");
  });
});
