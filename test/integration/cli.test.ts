/**
 * Integration tests for AHQ CLI commands.
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

function runAhq(args: string[], opts?: { cwd?: string; env?: NodeJS.ProcessEnv }): string {
  const env = { ...process.env, ...opts?.env };
  return execSync(`node ${CLI_PATH} ${args.join(" ")}`, {
    encoding: "utf8",
    cwd: opts?.cwd ?? PROJECT_ROOT,
    env,
  });
}

function runAhqExpectExit(
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
    stationDir = path.join(os.tmpdir(), `ahq-int-${Date.now()}`);
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
    runAhq(["station", "init"], { env: { STATION_PATH: stationDir } });
    expect(fs.existsSync(path.join(stationDir, "ahq_config.yaml"))).toBe(true);
    expect(fs.existsSync(path.join(stationDir, "ahq_catalog.yaml"))).toBe(true);
    expect(fs.existsSync(path.join(stationDir, "safehouse_list.yaml"))).toBe(true);
    expect(fs.existsSync(path.join(stationDir, "manifest"))).toBe(true);
  });

  it("reports station already exists on second init", () => {
    runAhq(["station", "init"], { env: { STATION_PATH: stationDir } });
    const out = runAhq(["station", "init"], { env: { STATION_PATH: stationDir } });
    expect(out).toContain("Station already exists");
  });
});

describe("Integration: safehouse init", () => {
  let stationDir: string;
  let projectDir: string;

  beforeEach(() => {
    stationDir = path.join(os.tmpdir(), `ahq-station-${Date.now()}`);
    projectDir = path.join(os.tmpdir(), `ahq-proj-${Date.now()}`);
    fs.mkdirSync(stationDir, { recursive: true });
    fs.mkdirSync(projectDir, { recursive: true });
    // Create minimal station first
    fs.writeFileSync(path.join(stationDir, "ahq_config.yaml"), "configuration:\n  version: 0.1.0\n  agent-paths: {}\n");
    fs.writeFileSync(path.join(stationDir, "safehouse_list.yaml"), "safehouse_paths: []\n");
    fs.writeFileSync(path.join(stationDir, "ahq_catalog.yaml"), "packages: []\n");
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
    runAhq(["safehouse", "init"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
    const safehousePath = path.join(projectDir, ".ahq_safehouse");
    expect(fs.existsSync(safehousePath)).toBe(true);
    expect(fs.existsSync(path.join(safehousePath, "ahq_config.yaml"))).toBe(true);
    expect(fs.existsSync(path.join(safehousePath, "manifest.yaml"))).toBe(true);
  });
});

describe("Integration: catalog list", () => {
  let stationDir: string;
  let projectDir: string;

  beforeEach(async () => {
    stationDir = path.join(os.tmpdir(), `ahq-cat-${Date.now()}`);
    projectDir = path.join(os.tmpdir(), `ahq-catproj-${Date.now()}`);
    fs.mkdirSync(stationDir, { recursive: true });
    fs.mkdirSync(projectDir, { recursive: true });
    fs.writeFileSync(path.join(stationDir, "ahq_config.yaml"), "configuration:\n  version: 0.1.0\n  agent-paths: {}\n");
    fs.writeFileSync(path.join(stationDir, "safehouse_list.yaml"), "safehouse_paths: []\n");
    const catalogContent = `packages:
  - name: test-package
    version: 1.0.0
    location: file://${FIXTURE_PKG.replace(/\\/g, "/")}
  - name: doc-guide
    version: 1.0.0
    location: file:///nonexistent
`;
    fs.writeFileSync(path.join(stationDir, "ahq_catalog.yaml"), catalogContent);
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

  it("ahq catalog list shows known packages from catalog", () => {
    const out = runAhq(["catalog", "list"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    expect(out).toContain("test-package");
    expect(out).toContain("doc-guide");
  });

  it("ahq catalog list --user-only shows only user catalog", () => {
    const out = runAhq(["catalog", "list", "--user-only"], {
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
    stationDir = path.join(os.tmpdir(), `ahq-agent-st-${Date.now()}`);
    projectDir = path.join(os.tmpdir(), `ahq-agent-pj-${Date.now()}`);
    fs.mkdirSync(stationDir, { recursive: true });
    fs.mkdirSync(projectDir, { recursive: true });
    fs.writeFileSync(
      path.join(stationDir, "ahq_config.yaml"),
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
    fs.writeFileSync(path.join(stationDir, "ahq_catalog.yaml"), "packages: []\n");
    fs.mkdirSync(path.join(stationDir, "manifest"), { recursive: true });
    runAhq(["safehouse", "init"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
  });

  afterEach(() => {
    try {
      fs.rmSync(stationDir, { recursive: true });
      fs.rmSync(projectDir, { recursive: true });
    } catch {
      /* ignore */
    }
  });

  it("ahq agent cursor assigns agent and creates agent dir", () => {
    const out = runAhq(["agent", "cursor"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    expect(out).toContain("Assigned cursor");
    expect(out).toContain(".cursor/");
    const configPath = path.join(projectDir, ".ahq_safehouse", "ahq_config.yaml");
    const config = fs.readFileSync(configPath, "utf8");
    expect(config).toContain("cursor");
  });

  it("ahq agent cursor second time reports Q Branch message", () => {
    runAhq(["agent", "cursor"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
    const out = runAhq(["agent", "cursor"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
    expect(out).toContain("Q Branch already knows cursor was assigned");
  });

  it("ahq agent handover to claude switches agent", () => {
    runAhq(["agent", "cursor"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
    const out = runAhq(["agent", "handover", "to", "claude"], {
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
    stationDir = path.join(os.tmpdir(), `ahq-inst-st-${Date.now()}`);
    projectDir = path.join(os.tmpdir(), `ahq-inst-pj-${Date.now()}`);
    fs.mkdirSync(stationDir, { recursive: true });
    fs.mkdirSync(projectDir, { recursive: true });
    fs.writeFileSync(
      path.join(stationDir, "ahq_config.yaml"),
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
    fs.writeFileSync(path.join(stationDir, "ahq_catalog.yaml"), catalogContent);
    fs.mkdirSync(path.join(stationDir, "manifest"), { recursive: true });
    runAhq(["safehouse", "init"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
    runAhq(["agent", "cursor"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
  });

  afterEach(() => {
    try {
      fs.rmSync(stationDir, { recursive: true });
      fs.rmSync(projectDir, { recursive: true });
    } catch {
      /* ignore */
    }
  });

  it("ahq install test-package --project installs to safehouse", () => {
    const out = runAhq(["install", "test-package", "--project"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    expect(out).toContain("Installed test-package");
    const skillPath = path.join(projectDir, ".cursor", "skills", "test-skill.md");
    expect(fs.existsSync(skillPath)).toBe(true);
  });

  it("ahq safehouse list shows installed package", () => {
    runAhq(["install", "test-package", "--project"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    const out = runAhq(["safehouse", "list"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    expect(out).toContain("test-package");
  });

  it("ahq install --user records in station manifest", () => {
    runAhq(["install", "test-package", "--user"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    const out = runAhq(["station", "list"], { env: { STATION_PATH: stationDir } });
    expect(out).toContain("test-package");
  });
});

describe("Integration: remove", () => {
  let stationDir: string;
  let projectDir: string;

  beforeEach(() => {
    stationDir = path.join(os.tmpdir(), `ahq-rm-st-${Date.now()}`);
    projectDir = path.join(os.tmpdir(), `ahq-rm-pj-${Date.now()}`);
    fs.mkdirSync(stationDir, { recursive: true });
    fs.mkdirSync(projectDir, { recursive: true });
    fs.writeFileSync(
      path.join(stationDir, "ahq_config.yaml"),
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
    fs.writeFileSync(path.join(stationDir, "ahq_catalog.yaml"), catalogContent);
    fs.mkdirSync(path.join(stationDir, "manifest"), { recursive: true });
    runAhq(["safehouse", "init"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
    runAhq(["agent", "cursor"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
  });

  afterEach(() => {
    try {
      fs.rmSync(stationDir, { recursive: true });
      fs.rmSync(projectDir, { recursive: true });
    } catch {
      /* ignore */
    }
  });

  it("ahq remove safehouse test-package removes from safehouse", () => {
    runAhq(["install", "test-package", "--project"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    runAhq(["remove", "safehouse", "test-package"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    const out = runAhq(["safehouse", "list"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    expect(out).toContain("No packages installed");
  });

  it("ahq remove station test-package removes from station", () => {
    runAhq(["install", "test-package", "--user"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    runAhq(["remove", "station", "test-package"], { env: { STATION_PATH: stationDir } });
    const out = runAhq(["station", "list"], { env: { STATION_PATH: stationDir } });
    expect(out).toContain("No packages installed");
  });
});
