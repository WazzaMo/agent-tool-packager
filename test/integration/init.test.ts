import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  runAtp,
  runAtpExpectExit,
  runAtpSpawn,
  makeStationCatalogYaml,
} from "./test-helpers.js";

describe("Integration: station init", () => {
  let stationDir: string;

  beforeEach(() => {
    stationDir = path.join(os.tmpdir(), `atp-int-${Date.now()}`);
  });

  afterEach(() => {
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
    expect(fs.existsSync(path.join(stationDir, "atp-safehouse-list.yaml"))).toBe(true);
    expect(fs.existsSync(path.join(stationDir, "manifest"))).toBe(true);
  });

  it("reports station already exists on second init", () => {
    runAtp(["station", "init"], { env: { STATION_PATH: stationDir } });
    const out = runAtp(["station", "init"], { env: { STATION_PATH: stationDir } });
    expect(out).toContain("Station already exists");
  });

  it("finishes initialization if station directory exists but is empty", () => {
    fs.mkdirSync(stationDir, { recursive: true });
    runAtp(["station", "init"], { env: { STATION_PATH: stationDir } });
    expect(fs.existsSync(path.join(stationDir, "atp-config.yaml"))).toBe(true);
    expect(fs.existsSync(path.join(stationDir, "atp-catalog.yaml"))).toBe(true);
    expect(fs.existsSync(path.join(stationDir, "atp-safehouse-list.yaml"))).toBe(true);
    expect(fs.existsSync(path.join(stationDir, "manifest"))).toBe(true);
  });

  it("finishes initialization if some files are missing", () => {
    fs.mkdirSync(stationDir, { recursive: true });
    // Only create config
    fs.writeFileSync(path.join(stationDir, "atp-config.yaml"), "{}");
    
    runAtp(["station", "init"], { env: { STATION_PATH: stationDir } });
    
    expect(fs.existsSync(path.join(stationDir, "atp-catalog.yaml"))).toBe(true);
    expect(fs.existsSync(path.join(stationDir, "atp-safehouse-list.yaml"))).toBe(true);
    expect(fs.existsSync(path.join(stationDir, "manifest"))).toBe(true);
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
    fs.writeFileSync(path.join(stationDir, "atp-safehouse-list.yaml"), "safehouse_paths: []\n");
    fs.writeFileSync(
      path.join(stationDir, "atp-catalog.yaml"),
      makeStationCatalogYaml([])
    );
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

  it("fails to create safehouse when no project markers present", () => {
    // Should fail with exit code 1
    const { stderr } = runAtpExpectExit(["safehouse", "init"], 1, {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    expect(stderr).toContain("Could not confirm this is a project directory");
  });

  it("creates safehouse when .git marker is present", () => {
    fs.mkdirSync(path.join(projectDir, ".git"), { recursive: true });
    runAtp(["safehouse", "init"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
    const safehousePath = path.join(projectDir, ".atp_safehouse");
    expect(fs.existsSync(safehousePath)).toBe(true);
  });

  it("creates safehouse when .vscode marker is present", () => {
    fs.mkdirSync(path.join(projectDir, ".vscode"), { recursive: true });
    runAtp(["safehouse", "init"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
    const safehousePath = path.join(projectDir, ".atp_safehouse");
    expect(fs.existsSync(safehousePath)).toBe(true);
  });

  it("creates safehouse when SAFEHOUSE_PROJECT_PATH is set", () => {
    runAtp(["safehouse", "init"], {
      cwd: os.tmpdir(), // Run from somewhere else
      env: {
        STATION_PATH: stationDir,
        SAFEHOUSE_PROJECT_PATH: projectDir,
      },
    });
    const safehousePath = path.join(projectDir, ".atp_safehouse");
    expect(fs.existsSync(safehousePath)).toBe(true);
  });

});

describe("Integration: safehouse init home-directory hardening", () => {
  let stationDir: string;
  let fakeHome: string;

  beforeEach(() => {
    stationDir = path.join(os.tmpdir(), `atp-station-h-${Date.now()}`);
    fakeHome = path.join(os.tmpdir(), `atp-fake-home-${Date.now()}`);
    fs.mkdirSync(stationDir, { recursive: true });
    fs.mkdirSync(fakeHome, { recursive: true });
    fs.mkdirSync(path.join(fakeHome, ".vscode"), { recursive: true });
    fs.writeFileSync(
      path.join(stationDir, "atp-config.yaml"),
      "configuration:\n  version: 0.1.0\n  agent-paths: {}\n"
    );
    fs.writeFileSync(path.join(stationDir, "atp-safehouse-list.yaml"), "safehouse_paths: []\n");
    fs.writeFileSync(
      path.join(stationDir, "atp-catalog.yaml"),
      makeStationCatalogYaml([])
    );
    fs.mkdirSync(path.join(stationDir, "manifest"), { recursive: true });
  });

  afterEach(() => {
    try {
      fs.rmSync(stationDir, { recursive: true });
      fs.rmSync(fakeHome, { recursive: true });
    } catch {
      /* ignore */
    }
  });

  it("refuses init when resolved project root is HOME (e.g. ~/.vscode)", () => {
    const { stderr } = runAtpExpectExit(["safehouse", "init"], 1, {
      cwd: fakeHome,
      env: {
        STATION_PATH: stationDir,
        HOME: fakeHome,
        ATP_ALLOW_HOME_SAFEHOUSE: "",
      },
    });
    expect(stderr).toMatch(/Refusing to create a Safehouse|home directory/i);
    expect(stderr).toContain("ATP_ALLOW_HOME_SAFEHOUSE=1");
    expect(fs.existsSync(path.join(fakeHome, ".atp_safehouse"))).toBe(false);
  });

  it("refuses init when SAFEHOUSE_PROJECT_PATH is HOME without hatch", () => {
    const { stderr } = runAtpExpectExit(["safehouse", "init"], 1, {
      cwd: os.tmpdir(),
      env: {
        STATION_PATH: stationDir,
        HOME: fakeHome,
        SAFEHOUSE_PROJECT_PATH: fakeHome,
        ATP_ALLOW_HOME_SAFEHOUSE: "",
      },
    });
    expect(stderr).toMatch(/Refusing to create a Safehouse|home directory/i);
    expect(fs.existsSync(path.join(fakeHome, ".atp_safehouse"))).toBe(false);
  });

  it("does not treat ATP_ALLOW_HOME_SAFEHOUSE=true as enabled", () => {
    const { stderr } = runAtpExpectExit(["safehouse", "init"], 1, {
      cwd: fakeHome,
      env: {
        STATION_PATH: stationDir,
        HOME: fakeHome,
        ATP_ALLOW_HOME_SAFEHOUSE: "true",
      },
    });
    expect(stderr).toMatch(/Refusing to create a Safehouse|home directory/i);
  });

  it("allows init under HOME when ATP_ALLOW_HOME_SAFEHOUSE=1 and warns on stderr", () => {
    const r = runAtpSpawn(["safehouse", "init"], {
      cwd: fakeHome,
      env: {
        STATION_PATH: stationDir,
        HOME: fakeHome,
        ATP_ALLOW_HOME_SAFEHOUSE: "1",
      },
    });
    expect(r.status).toBe(0);
    expect(r.stderr).toContain("ATP_ALLOW_HOME_SAFEHOUSE=1");
    expect(fs.existsSync(path.join(fakeHome, ".atp_safehouse"))).toBe(true);
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
    fs.writeFileSync(path.join(stationDir, "atp-safehouse-list.yaml"), "safehouse_paths: []\n");
    fs.writeFileSync(
      path.join(stationDir, "atp-catalog.yaml"),
      makeStationCatalogYaml([])
    );
    fs.mkdirSync(path.join(stationDir, "manifest"), { recursive: true });
    // Add project marker so safehouse init succeeds in other tests
    fs.mkdirSync(path.join(projectDir, ".git"), { recursive: true });
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

  it("atp agent unknown-agent fails when no install provider exists for that name", () => {
    const { stderr } = runAtpExpectExit(["agent", "unknown-agent"], 1, {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    expect(stderr).toMatch(/Unsupported agent/);
    expect(stderr).toMatch(/cursor, claude, gemini, codex/);
  });

  it("atp agent handover to unknown-agent fails when no install provider exists", () => {
    runAtp(["agent", "cursor"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
    const { stderr } = runAtpExpectExit(["agent", "handover", "to", "unknown-agent"], 1, {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    expect(stderr).toMatch(/Unsupported agent/);
  });

  it("atp agent gemini fails when agent not in Station agent-paths (after provider check)", () => {
    const { stderr } = runAtpExpectExit(["agent", "gemini"], 1, {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    expect(stderr).toContain("Agent 'gemini' is not configured in the Station");
    expect(stderr).toContain("agent-paths");
  });

  it("atp agent kiro fails when listed in Station but has no AgentProvider", () => {
    fs.writeFileSync(
      path.join(stationDir, "atp-config.yaml"),
      `configuration:
  version: 0.1.0
  agent-paths:
    cursor:
      project_path: .cursor/
    claude:
      project_path: .claude/
    kiro:
      project_path: .kiro/
`
    );
    const { stderr } = runAtpExpectExit(["agent", "kiro"], 1, {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    expect(stderr).toMatch(/Unsupported agent/);
    expect(stderr).toMatch(/kiro/);
  });
});
