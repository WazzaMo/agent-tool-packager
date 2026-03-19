import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { runAtp, FIXTURE_PKG } from "./test-helpers.js";

describe("Integration: catalog list", () => {
  let stationDir: string;
  let projectDir: string;

  beforeEach(async () => {
    stationDir = path.join(os.tmpdir(), `atp-cat-${Date.now()}`);
    projectDir = path.join(os.tmpdir(), `atp-catproj-${Date.now()}`);
    fs.mkdirSync(stationDir, { recursive: true });
    fs.mkdirSync(projectDir, { recursive: true });
    fs.writeFileSync(path.join(stationDir, "atp-config.yaml"), "configuration:\n  version: 0.1.0\n  agent-paths: {}\n");
    fs.writeFileSync(path.join(stationDir, "atp-safehouse-list.yaml"), "safehouse_paths: []\n");
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
