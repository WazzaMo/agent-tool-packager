/**
 * Integration tests for Feature 3: Package Install Process.
 * See docs/features/3-package-install-process.md.
 *
 * Test Approach (lines 177-204): Create rule-only package, install to safehouse,
 * verify rule appears in .cursor.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { runAtp, runAtpExpectExit } from "./test-helpers.js";
import {
  atpCwd,
  initPackage,
  createTempPackageEnv,
  cleanupTempPackageEnv,
} from "./package-developer-helpers.js";

describe("Integration: Feature 3 - Package Install Process", () => {
  let base: string;
  let stationDir: string;
  let pkgDir: string;
  let projectDir: string;
  let origStationPath: string | undefined;

  beforeEach(() => {
    const env = createTempPackageEnv("atp-f3");
    base = env.base;
    stationDir = env.stationDir;
    pkgDir = env.pkgDir;
    origStationPath = env.origStationPath;

    projectDir = path.join(base, "sdl_c++_game");
    fs.mkdirSync(projectDir, { recursive: true });
    // Add project marker so safehouse init succeeds
    fs.mkdirSync(path.join(projectDir, ".git"), { recursive: true });

    // Station needs agent-paths for cursor (Feature 3 workflow)
    runAtp(["station", "init"], atpCwd(pkgDir, stationDir));
    const configPath = path.join(stationDir, "atp-config.yaml");
    const config = fs.readFileSync(configPath, "utf8");
    if (!config.includes("agent-paths")) {
      fs.writeFileSync(
        configPath,
        config.replace(
          "configuration:",
          `configuration:
  agent-paths:
    cursor:
      project_path: .cursor/`
        )
      );
    } else {
      // Ensure cursor has project_path
      fs.writeFileSync(
        configPath,
        `configuration:
  version: 0.1.0
  agent-paths:
    cursor:
      project_path: .cursor/
`
      );
    }
    fs.writeFileSync(
      path.join(stationDir, "atp-safehouse-list.yaml"),
      "safehouse_paths: []\n"
    );
  });

  afterEach(() => {
    cleanupTempPackageEnv(base, origStationPath);
  });

  it("Feature 3 Test Approach: rule-only package installs and rule appears in .cursor", () => {
    const ruleContent = `# Rule Test Package

Being able to install this, means success.
`;
    fs.writeFileSync(path.join(pkgDir, "test-rule.md"), ruleContent);

    initPackage(pkgDir, stationDir, {
      type: "rule",
      name: "test-package-1",
      version: "0.1.0",
      usage: "Test rule for Feature 3",
      components: ["test-rule.md"],
      catalogAdd: true,
    });

    runAtp(["safehouse", "init"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
    runAtp(["agent", "cursor"], { cwd: projectDir, env: { STATION_PATH: stationDir } });

    const out = runAtp(["install", "test-package-1", "--project"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    expect(out).toContain("Installed test-package-1");
    expect(out).toMatch(/success|installed/i);

    const rulePath = path.join(projectDir, ".cursor", "rules", "test-rule.md");
    expect(fs.existsSync(rulePath)).toBe(true);
    expect(fs.readFileSync(rulePath, "utf8")).toBe(ruleContent);
  });

  it("atp safehouse list shows no packages when manifest empty", () => {
    runAtp(["safehouse", "init"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
    const out = runAtp(["safehouse", "list"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    expect(out).toMatch(/No packages|no packages|empty/i);
  });

  it("atp agent fails when Safehouse not initialised (Feature 3 acceptance criteria)", () => {
    const res = runAtpExpectExit(["agent", "cursor"], 1, {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    expect(res.stdout + res.stderr).toMatch(/No Safehouse|safehouse init/i);
  });

  it("package with bundle installs executables to .atp_safehouse/pkg-exec/bin (Feature 3 step 4)", () => {
    const skillContent = "Run {my_tool}/run.sh";
    fs.writeFileSync(path.join(pkgDir, "SKILL.md"), skillContent);
    fs.mkdirSync(path.join(pkgDir, "my_tool", "bin"), { recursive: true });
    fs.writeFileSync(path.join(pkgDir, "my_tool", "bin", "run.sh"), "#!/bin/sh\necho run");

    initPackage(pkgDir, stationDir, {
      type: "skill",
      name: "exec-pkg",
      usage: "Exec test",
      components: ["SKILL.md"],
      bundles: [{ path: "my_tool" }],
      catalogAdd: true,
    });

    runAtp(["safehouse", "init"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
    runAtp(["agent", "cursor"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
    runAtp(["install", "exec-pkg", "--project-bin"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });

    const execBin = path.join(projectDir, ".atp_safehouse", "exec-pkg-exec", "bin");
    expect(fs.existsSync(path.join(execBin, "run.sh"))).toBe(true);
    expect(fs.readFileSync(path.join(execBin, "run.sh"), "utf8")).toBe("#!/bin/sh\necho run");

    const skillPath = path.join(projectDir, ".cursor", "skills", "SKILL.md");
    const patched = fs.readFileSync(skillPath, "utf8");
    expect(patched).toContain(execBin);
    expect(patched).not.toContain("{my_tool}");
  });

  it("atp safehouse list shows installed package after install", () => {
    fs.writeFileSync(path.join(pkgDir, "test-rule.md"), "# Rule\n");
    initPackage(pkgDir, stationDir, {
      type: "rule",
      name: "list-test-pkg",
      usage: "List test",
      components: ["test-rule.md"],
      catalogAdd: true,
    });
    runAtp(["safehouse", "init"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
    runAtp(["agent", "cursor"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
    runAtp(["install", "list-test-pkg", "--project"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });

    const out = runAtp(["safehouse", "list"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    expect(out).toContain("list-test-pkg");
  });

  it("text patching: {bundle_name} in skill replaced with install path (Feature 3)", () => {
    fs.mkdirSync(path.join(pkgDir, "patch_tool"), { recursive: true });
    fs.writeFileSync(path.join(pkgDir, "patch_tool", "file-patch.sh"), "#!/bin/sh\necho patch\n");
    const skillContent = `---
name: copyrighter
---
Run {patch_tool}/file-patch.sh to patch files.
`;
    fs.writeFileSync(path.join(pkgDir, "SKILL.md"), skillContent);

    initPackage(pkgDir, stationDir, {
      type: "skill",
      name: "copyrighter-pkg",
      usage: "Copyright patcher",
      components: ["SKILL.md"],
      bundles: [{ path: "patch_tool", execFilter: "patch_tool/*.sh" }],
      catalogAdd: true,
    });

    runAtp(["safehouse", "init"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
    runAtp(["agent", "cursor"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
    runAtp(["install", "copyrighter-pkg", "--project", "--project-bin"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });

    const skillPath = path.join(projectDir, ".cursor", "skills", "SKILL.md");
    expect(fs.existsSync(skillPath)).toBe(true);
    const patched = fs.readFileSync(skillPath, "utf8");
    expect(patched).not.toContain("{patch_tool}");
    expect(patched).toMatch(/\.atp_safehouse.*copyrighter-pkg-exec/);
  });
});
