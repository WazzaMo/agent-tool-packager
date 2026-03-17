import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { runAtp, FIXTURE_PKG } from "./test-helpers.js";

describe("Integration: install and list", () => {
  let stationDir: string;
  let projectDir: string;

  beforeEach(() => {
    stationDir = path.join(os.tmpdir(), `atp-inst-st-${Date.now()}`);
    projectDir = path.join(os.tmpdir(), `atp-inst-pj-${Date.now()}`);
    fs.mkdirSync(stationDir, { recursive: true });
    fs.mkdirSync(projectDir, { recursive: true });
    fs.writeFileSync(
      path.join(stationDir, "atp-config.yaml"),
      `configuration:
  version: 0.1.0
  agent-paths:
    cursor:
      project_path: .cursor/
`
    );
    fs.writeFileSync(path.join(stationDir, "safehouse_list.yaml"), "safehouse_paths: []\n");
    const catalogContent = `packages:
  - name: test-package
    version: 1.0.0
    location: file://${FIXTURE_PKG.replace(/\\/g, "/")}
`;
    fs.writeFileSync(path.join(stationDir, "atp-catalog.yaml"), catalogContent);
    fs.mkdirSync(path.join(stationDir, "manifest"), { recursive: true });
    // Add project marker so safehouse init succeeds
    fs.mkdirSync(path.join(projectDir, ".git"), { recursive: true });
    runAtp(["safehouse", "init"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
    runAtp(["agent", "cursor"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
  });

  afterEach(() => {
    try {
      fs.rmSync(stationDir, { recursive: true });
      fs.rmSync(projectDir, { recursive: true });
    } catch {
      /* ignore */
    }
  });

  it("atp install test-package --project installs to safehouse", () => {
    const out = runAtp(["install", "test-package", "--project"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    expect(out).toContain("Installed test-package");
    expect(out).toContain("(prompts:project, bin:user-bin)");
    const skillPath = path.join(projectDir, ".cursor", "skills", "test-skill.md");
    expect(fs.existsSync(skillPath)).toBe(true);
  });

  it("atp install test-package --station installs to station area", () => {
    const out = runAtp(["install", "test-package", "--station"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    expect(out).toContain("Installed test-package");
    expect(out).toContain("(prompts:station, bin:user-bin)");
    // Station list should show it
    const listOut = runAtp(["station", "list"], { env: { STATION_PATH: stationDir } });
    expect(listOut).toContain("test-package");
  });

  it("atp install test-package --user-bin records as user-bin scope", () => {
    const out = runAtp(["install", "test-package", "--user-bin"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    expect(out).toContain("Installed test-package");
    expect(out).toContain("(prompts:project, bin:user-bin)");
  });

  it("atp install test-package --project-bin records as project-bin scope", () => {
    const out = runAtp(["install", "test-package", "--project-bin"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    expect(out).toContain("Installed test-package");
    expect(out).toContain("(prompts:project, bin:project-bin)");
  });
});
