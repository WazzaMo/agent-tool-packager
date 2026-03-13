/**
 * Integration tests for ATP CLI commands.
 * Maps to acceptance criteria in docs/features/1-package-definition-and-installation.md
 * Uses temp dirs and STATION_PATH for isolation.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../..");
const CLI_PATH = path.join(PROJECT_ROOT, "dist", "cli.js");
const FIXTURE_PKG = path.resolve(__dirname, "../fixtures/test-package");

function runAtp(args: string[], opts?: { cwd?: string; env?: NodeJS.ProcessEnv }): string {
  const env = { ...process.env, ...opts?.env };
  return execSync(`node ${CLI_PATH} ${args.join(" ")}`, {
    encoding: "utf8",
    cwd: opts?.cwd ?? PROJECT_ROOT,
    env,
  });
}

function runAtpExpectExit(
  args: string[],
  expectedExit: number,
  opts?: { cwd?: string; env?: NodeJS.ProcessEnv }
): { stdout: string; stderr: string } {
  try {
    const stdout = execSync(`node ${CLI_PATH} ${args.join(" ")}`, {
      encoding: "utf8",
      cwd: opts?.cwd ?? PROJECT_ROOT,
      env: { ...process.env, ...opts?.env },
    });
    if (expectedExit !== 0) {
      expect.fail(`Expected exit ${expectedExit} but got 0. Output: ${stdout}`);
    }
    return { stdout, stderr: "" };
  } catch (err: unknown) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    if (e.status !== expectedExit) {
      throw err;
    }
    return {
      stdout: (e.stdout as string) ?? "",
      stderr: (e.stderr as string) ?? "",
    };
  }
}

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

describe("Integration: catalog list", () => {
  let stationDir: string;
  let projectDir: string;

  beforeEach(async () => {
    stationDir = path.join(os.tmpdir(), `atp-cat-${Date.now()}`);
    projectDir = path.join(os.tmpdir(), `atp-catproj-${Date.now()}`);
    fs.mkdirSync(stationDir, { recursive: true });
    fs.mkdirSync(projectDir, { recursive: true });
    fs.writeFileSync(path.join(stationDir, "atp-config.yaml"), "configuration:\n  version: 0.1.0\n  agent-paths: {}\n");
    fs.writeFileSync(path.join(stationDir, "safehouse_list.yaml"), "safehouse_paths: []\n");
    const catalogContent = `packages:
  - name: test-package
    version: 1.0.0
    location: file://${FIXTURE_PKG.replace(/\\/g, "/")}
  - name: doc-guide
    version: 1.0.0
    location: file:///nonexistent
`;
    fs.writeFileSync(path.join(stationDir, "atp-catalog.yaml"), catalogContent);
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

  it("atp catalog list shows known packages from catalog", () => {
    const out = runAtp(["catalog", "list"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    expect(out).toContain("test-package");
    expect(out).toContain("doc-guide");
  });

  it("atp catalog list --user-only shows only user catalog", () => {
    const out = runAtp(["catalog", "list", "--user-only"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    expect(out).toContain("test-package");
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

describe("Integration: remove", () => {
  let stationDir: string;
  let projectDir: string;

  beforeEach(() => {
    stationDir = path.join(os.tmpdir(), `atp-rm-st-${Date.now()}`);
    projectDir = path.join(os.tmpdir(), `atp-rm-pj-${Date.now()}`);
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

  it("atp remove safehouse test-package removes from safehouse", () => {
    runAtp(["install", "test-package", "--project"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    runAtp(["remove", "safehouse", "test-package"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    // safehouse list should report no packages
    const listOut = runAtp(["safehouse", "list"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    expect(listOut).toContain("No packages installed");
  });

  it("atp remove station test-package removes from station", () => {
    runAtp(["install", "test-package", "--station"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    runAtp(["remove", "station", "test-package"], { env: { STATION_PATH: stationDir } });
    const out = runAtp(["station", "list"], { env: { STATION_PATH: stationDir } });
    expect(out).toContain("No packages installed");
  });
});
