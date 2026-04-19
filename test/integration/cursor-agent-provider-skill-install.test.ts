/**
 * Integration: skill install uses Agent Skills directory layout (dist CLI + CursorAgentProvider).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { runAtp } from "./test-helpers.js";
import {
  atpCwd,
  initPackage,
  createTempPackageEnv,
  cleanupTempPackageEnv,
} from "./package-developer-helpers.js";

describe("Integration: CursorAgentProvider skill layout", () => {
  let base: string;
  let stationDir: string;
  let pkgDir: string;
  let projectDir: string;

  beforeEach(() => {
    const env = createTempPackageEnv("atp-cap-skill");
    base = env.base;
    stationDir = env.stationDir;
    pkgDir = env.pkgDir;

    projectDir = path.join(base, "cursor_skill_proj");
    fs.mkdirSync(path.join(projectDir, ".git"), { recursive: true });

    runAtp(["station", "init"], atpCwd(pkgDir, stationDir));
    fs.writeFileSync(
      path.join(stationDir, "atp-config.yaml"),
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

  it("installs skill.yaml + skill.md bundle under .cursor/skills/{name}/", () => {
    fs.writeFileSync(
      path.join(pkgDir, "skill.yaml"),
      "name: pdf-kit\ndescription: PDF helpers for tests\n"
    );
    fs.writeFileSync(
      path.join(pkgDir, "skill.md"),
      "## Run\n\nUse {skill_scripts}/extract.py.\n"
    );
    fs.writeFileSync(path.join(pkgDir, "helper.py"), "# py\n");

    initPackage(pkgDir, stationDir, {
      type: "skill",
      name: "cap-skill-bundle",
      version: "0.4.0",
      usage: "Skill layout integration",
      components: ["skill.yaml", "skill.md", "helper.py"],
      catalogAdd: true,
    });

    runAtp(["safehouse", "init"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
    runAtp(["agent", "cursor"], { cwd: projectDir, env: { STATION_PATH: stationDir } });

    const out = runAtp(["install", "cap-skill-bundle", "--project"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    expect(out).toContain("Installed cap-skill-bundle");

    const skillMd = path.join(projectDir, ".cursor", "skills", "pdf-kit", "SKILL.md");
    expect(fs.existsSync(skillMd)).toBe(true);
    const text = fs.readFileSync(skillMd, "utf8");
    expect(text).toContain("name: pdf-kit");
    expect(text).toContain("scripts/extract.py");

    const helper = path.join(projectDir, ".cursor", "skills", "pdf-kit", "helper.py");
    expect(fs.readFileSync(helper, "utf8")).toBe("# py\n");

    const agentsMd = path.join(projectDir, "AGENTS.md");
    expect(fs.existsSync(agentsMd)).toBe(true);
    const agentsText = fs.readFileSync(agentsMd, "utf8");
    expect(agentsText).toContain("cap-skill-bundle");
    expect(agentsText).toContain(".cursor/skills/pdf-kit/SKILL.md");
  });

  it("installs bundle program under .cursor/skills/{name}/scripts/ and not into user bin", () => {
    const bundleDir = path.join(pkgDir, "mybundle");
    fs.mkdirSync(path.join(bundleDir, "bin"), { recursive: true });
    fs.writeFileSync(
      path.join(bundleDir, "skill.yaml"),
      "name: script-runner\ndescription: Runs helper script\n"
    );
    fs.writeFileSync(
      path.join(bundleDir, "skill.md"),
      "## Run\n\nInvoke {skill_scripts}/helper.sh.\n"
    );
    const helperPath = path.join(bundleDir, "bin", "helper.sh");
    fs.writeFileSync(helperPath, "#!/bin/sh\necho helper\n");
    if (process.platform !== "win32") {
      fs.chmodSync(helperPath, 0o755);
    }

    initPackage(pkgDir, stationDir, {
      type: "skill",
      name: "skill-with-bin-exec",
      version: "0.5.0",
      usage: "Skill bundle exec integration",
      bundles: [{ path: "mybundle", execFilter: "mybundle/bin/helper.sh" }],
      catalogAdd: true,
    });

    runAtp(["safehouse", "init"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
    runAtp(["agent", "cursor"], { cwd: projectDir, env: { STATION_PATH: stationDir } });

    const out = runAtp(["install", "skill-with-bin-exec", "--project"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    expect(out).toContain("Installed skill-with-bin-exec");

    const scriptDest = path.join(
      projectDir,
      ".cursor",
      "skills",
      "script-runner",
      "scripts",
      "helper.sh"
    );
    expect(fs.existsSync(scriptDest)).toBe(true);
    expect(fs.readFileSync(scriptDest, "utf8")).toContain("echo helper");

    const skillMd = path.join(projectDir, ".cursor", "skills", "script-runner", "SKILL.md");
    const mdText = fs.readFileSync(skillMd, "utf8");
    expect(mdText).toContain("scripts/helper.sh");

    const userBinHelper = path.join(os.homedir(), ".local", "bin", "helper.sh");
    expect(fs.existsSync(userBinHelper)).toBe(false);
  });
});
