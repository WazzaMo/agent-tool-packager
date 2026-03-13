import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { runAtp } from "./test-helpers.js";

describe("Integration: station init", () => {
  let stationDir: string;
  let originalStationPath: string | undefined;

  beforeEach(() => {
    stationDir = path.join(os.tmpdir(), `atp-int-${Date.now()}`);
    originalStationPath = process.env.STATION_PATH;
    process.env.STATION_PATH = stationDir;
  });

  afterEach(() => {
    process.env.STATION_PATH = originalStationPath;
    try {
      fs.rmSync(stationDir, { recursive: true });
    } catch {
      /* ignore */
    }
  });

  it("creates station at STATION_PATH (non-default init)", () => {
    runAtp(["station", "init"], { env: { STATION_PATH: stationDir } });
    expect(fs.existsSync(path.join(stationDir, "atp-config.yaml"))).toBe(true);
    expect(fs.existsSync(path.join(stationDir, "atp-catalog.yaml"))).toBe(true);
    expect(fs.existsSync(path.join(stationDir, "safehouse_list.yaml"))).toBe(true);
    expect(fs.existsSync(path.join(stationDir, "manifest"))).toBe(true);
  });

  it("reports station already exists on second init", () => {
    runAtp(["station", "init"], { env: { STATION_PATH: stationDir } });
    const out = runAtp(["station", "init"], { env: { STATION_PATH: stationDir } });
    expect(out).toContain("Station already exists");
  });
});

describe("Integration: safehouse init", () => {
  let stationDir: string;
  let projectDir: string;

  beforeEach(() => {
    stationDir = path.join(os.tmpdir(), `atp-station-${Date.now()}`);
    projectDir = path.join(os.tmpdir(), `atp-proj-${Date.now()}`);
    fs.mkdirSync(stationDir, { recursive: true });
    fs.mkdirSync(projectDir, { recursive: true });
    // Create minimal station first
    fs.writeFileSync(path.join(stationDir, "atp-config.yaml"), "configuration:\n  version: 0.1.0\n  agent-paths: {}\n");
    fs.writeFileSync(path.join(stationDir, "safehouse_list.yaml"), "safehouse_paths: []\n");
    fs.writeFileSync(path.join(stationDir, "atp-catalog.yaml"), "packages: []\n");
    fs.mkdirSync(path.join(stationDir, "manifest"), { recursive: true });
  });

  afterEach(() => {
    try {
      fs.rmSync(stationDir, { recursive: true });
      fs.rmSync(projectDir, { recursive: true });
    } catch {
      /* ignore */
    }
  });

  it("creates safehouse in project directory", () => {
    runAtp(["safehouse", "init"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
    const safehousePath = path.join(projectDir, ".atp_safehouse");
    expect(fs.existsSync(safehousePath)).toBe(true);
    expect(fs.existsSync(path.join(safehousePath, "atp-config.yaml"))).toBe(true);
    expect(fs.existsSync(path.join(safehousePath, "manifest.yaml"))).toBe(true);
  });
});

describe("Integration: agent nomination", () => {
  let stationDir: string;
  let projectDir: string;

  beforeEach(() => {
    stationDir = path.join(os.tmpdir(), `atp-agent-st-${Date.now()}`);
    projectDir = path.join(os.tmpdir(), `atp-agent-pj-${Date.now()}`);
    fs.mkdirSync(stationDir, { recursive: true });
    fs.mkdirSync(projectDir, { recursive: true });
    fs.writeFileSync(
      path.join(stationDir, "atp-config.yaml"),
      `configuration:
  version: 0.1.0
  agent-paths:
    cursor:
      project_path: .cursor/
    claude:
      project_path: .claude/
`
    );
    fs.writeFileSync(path.join(stationDir, "safehouse_list.yaml"), "safehouse_paths: []\n");
    fs.writeFileSync(path.join(stationDir, "atp-catalog.yaml"), "packages: []\n");
    fs.mkdirSync(path.join(stationDir, "manifest"), { recursive: true });
    runAtp(["safehouse", "init"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
  });

  afterEach(() => {
    try {
      fs.rmSync(stationDir, { recursive: true });
      fs.rmSync(projectDir, { recursive: true });
    } catch {
      /* ignore */
    }
  });

  it("atp agent cursor assigns agent and creates agent dir", () => {
    const out = runAtp(["agent", "cursor"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    expect(out).toContain("Assigned cursor");
    expect(out).toContain(".cursor/");
    const configPath = path.join(projectDir, ".atp_safehouse", "atp-config.yaml");
    const config = fs.readFileSync(configPath, "utf8");
    expect(config).toContain("cursor");
  });

  it("atp agent cursor second time reports Q Branch message", () => {
    runAtp(["agent", "cursor"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
    const out = runAtp(["agent", "cursor"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
    expect(out).toContain("Q Branch already knows cursor was assigned");
  });

  it("atp agent handover to claude switches agent", () => {
    runAtp(["agent", "cursor"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
    const out = runAtp(["agent", "handover", "to", "claude"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    expect(out).toContain("Handed over to claude");
  });
});
