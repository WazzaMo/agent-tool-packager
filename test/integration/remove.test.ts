import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { runAtp, FIXTURE_PKG } from "./test-helpers.js";

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

describe("Integration: remove with binary scope", () => {
  let stationDir: string;
  let projectDir1: string;
  let projectDir2: string;
  let fakeHome: string;

  beforeEach(() => {
    stationDir = path.join(os.tmpdir(), `atp-rmbin-st-${Date.now()}`);
    projectDir1 = path.join(os.tmpdir(), `atp-rmbin-pj1-${Date.now()}`);
    projectDir2 = path.join(os.tmpdir(), `atp-rmbin-pj2-${Date.now()}`);
    fakeHome = path.join(os.tmpdir(), `atp-fakehome-${Date.now()}`);

    fs.mkdirSync(stationDir, { recursive: true });
    fs.mkdirSync(projectDir1, { recursive: true });
    fs.mkdirSync(projectDir2, { recursive: true });
    fs.mkdirSync(path.join(fakeHome, ".local", "bin"), { recursive: true });

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

    // Init safehouses
    runAtp(["safehouse", "init"], { cwd: projectDir1, env: { STATION_PATH: stationDir, HOME: fakeHome } });
    runAtp(["agent", "cursor"], { cwd: projectDir1, env: { STATION_PATH: stationDir, HOME: fakeHome } });
    runAtp(["safehouse", "init"], { cwd: projectDir2, env: { STATION_PATH: stationDir, HOME: fakeHome } });
    runAtp(["agent", "cursor"], { cwd: projectDir2, env: { STATION_PATH: stationDir, HOME: fakeHome } });
  });

  afterEach(() => {
    try {
      fs.rmSync(stationDir, { recursive: true });
      fs.rmSync(projectDir1, { recursive: true });
      fs.rmSync(projectDir2, { recursive: true });
      fs.rmSync(fakeHome, { recursive: true });
    } catch {
      /* ignore */
    }
  });

  it("removes project-bin immediately on remove safehouse", () => {
    runAtp(["install", "test-package", "--project-bin"], {
      cwd: projectDir1,
      env: { STATION_PATH: stationDir, HOME: fakeHome },
    });

    const binPath = path.join(projectDir1, ".atp_safehouse", "bin", "test-package");
    // Manually create the bin file
    fs.mkdirSync(path.dirname(binPath), { recursive: true });
    fs.writeFileSync(binPath, "dummy binary");

    runAtp(["remove", "safehouse", "test-package"], {
      cwd: projectDir1,
      env: { STATION_PATH: stationDir, HOME: fakeHome },
    });

    expect(fs.existsSync(binPath)).toBe(false);
  });

  it("removes user-bin on remove safehouse if no other project uses it", () => {
    runAtp(["install", "test-package", "--user-bin"], {
      cwd: projectDir1,
      env: { STATION_PATH: stationDir, HOME: fakeHome },
    });

    const userBinPath = path.join(fakeHome, ".local", "bin", "test-package");
    // Manually create the bin file
    fs.writeFileSync(userBinPath, "dummy binary");

    runAtp(["remove", "safehouse", "test-package"], {
      cwd: projectDir1,
      env: { STATION_PATH: stationDir, HOME: fakeHome },
    });

    expect(fs.existsSync(userBinPath)).toBe(false);
  });

  it("does NOT remove user-bin on remove safehouse if another project still uses it", () => {
    runAtp(["install", "test-package", "--user-bin"], {
      cwd: projectDir1,
      env: { STATION_PATH: stationDir, HOME: fakeHome },
    });
    runAtp(["install", "test-package", "--user-bin"], {
      cwd: projectDir2,
      env: { STATION_PATH: stationDir, HOME: fakeHome },
    });

    const userBinPath = path.join(fakeHome, ".local", "bin", "test-package");
    // Manually create the bin file
    fs.writeFileSync(userBinPath, "dummy binary");

    // Remove from Project 1
    runAtp(["remove", "safehouse", "test-package"], {
      cwd: projectDir1,
      env: { STATION_PATH: stationDir, HOME: fakeHome },
    });

    // Should still exist because Project 2 uses it
    expect(fs.existsSync(userBinPath)).toBe(true);

    // Remove from Project 2
    runAtp(["remove", "safehouse", "test-package"], {
      cwd: projectDir2,
      env: { STATION_PATH: stationDir, HOME: fakeHome },
    });

    // Now it should be gone
    expect(fs.existsSync(userBinPath)).toBe(false);
  });
});
