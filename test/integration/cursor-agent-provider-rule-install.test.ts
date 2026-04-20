/**
 * Integration: rule-only package install uses CursorAgentProvider path (dist CLI + temp project).
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
import { usesCursorAgentProviderProjectInstall } from "../../src/install/catalog-install-agent-provider-routing.js";

describe("Integration: CursorAgentProvider rule install", () => {
  let base: string;
  let stationDir: string;
  let pkgDir: string;
  let projectDir: string;

  beforeEach(() => {
    const env = createTempPackageEnv("atp-cap-rule");
    base = env.base;
    stationDir = env.stationDir;
    pkgDir = env.pkgDir;

    projectDir = path.join(base, "cursor_proj");
    fs.mkdirSync(path.join(projectDir, ".git"), { recursive: true });

    runAtp(["station", "init"], atpCwd(pkgDir, stationDir));
    const configPath = path.join(stationDir, "atp-config.yaml");
    fs.writeFileSync(
      configPath,
      `configuration:
  version: 0.1.0
  agent-paths:
    cursor:
      project_path: .cursor/
`
    );
    fs.writeFileSync(path.join(stationDir, "atp-safehouse-list.yaml"), "safehouse_paths: []\n");
  });

  afterEach(() => {
    cleanupTempPackageEnv(base);
  });

  it("gate is true for catalog rule-only + cursor project install context", () => {
    const ruleContent = "# Provider path check\n";
    fs.writeFileSync(path.join(pkgDir, "r.md"), ruleContent);

    initPackage(pkgDir, stationDir, {
      type: "rule",
      name: "cap-rule-pkg",
      version: "0.3.0",
      usage: "Cursor provider routing test",
      components: ["r.md"],
      catalogAdd: true,
    });

    runAtp(["safehouse", "init"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
    runAtp(["agent", "cursor"], { cwd: projectDir, env: { STATION_PATH: stationDir } });

    const stationPkg = path.join(stationDir, "user_packages", "cap-rule-pkg");
    const agentBase = path.join(projectDir, ".cursor");
    const manifest = {
      name: "cap-rule-pkg",
      version: "0.3.0",
      type: "Rule",
      assets: [{ path: "r.md", type: "rule" as const, name: "r" }],
    };

    const providerCtx = {
      agent: "cursor" as const,
      layer: "project" as const,
      projectRoot: projectDir,
      layerRoot: agentBase,
      stagingDir: stationPkg,
    };

    expect(
      usesCursorAgentProviderProjectInstall(providerCtx, manifest, {
        promptScope: "project",
        binaryScope: "user-bin",
        dependencies: false,
      })
    ).toBe(true);
  });

  it("atp install places rule under .cursor/rules/ (CursorAgentProvider)", () => {
    const ruleContent = "# CursorAgentProvider e2e\nok\n";
    fs.writeFileSync(path.join(pkgDir, "rule-one.md"), ruleContent);

    initPackage(pkgDir, stationDir, {
      type: "rule",
      name: "cap-e2e-rules",
      version: "1.0.0",
      usage: "E2E Cursor provider",
      components: ["rule-one.md"],
      catalogAdd: true,
    });

    runAtp(["safehouse", "init"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
    runAtp(["agent", "cursor"], { cwd: projectDir, env: { STATION_PATH: stationDir } });

    const out = runAtp(["install", "cap-e2e-rules", "--project"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    expect(out).toContain("Installed cap-e2e-rules");

    const dest = path.join(projectDir, ".cursor", "rules", "rule-one.md");
    expect(fs.existsSync(dest)).toBe(true);
    expect(fs.readFileSync(dest, "utf8")).toBe(ruleContent);
  });
});
