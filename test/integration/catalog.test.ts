import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  runAtp,
  runAtpSpawn,
  runAtpExpectExit,
  FIXTURE_PKG,
  makeStationCatalogYaml,
} from "./test-helpers.js";

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
    const catalogContent = makeStationCatalogYaml(
      [
        {
          name: "test-package",
          version: "1.0.0",
          location: `file://${FIXTURE_PKG.replace(/\\/g, "/")}`,
        },
        {
          name: "doc-guide",
          version: "1.0.0",
          location: "file:///nonexistent",
        },
      ],
      []
    );
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

  it("atp catalog list shows known packages from Station catalog", () => {
    const out = runAtp(["catalog", "list"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    expect(out).toContain("test-package");
    expect(out).toContain("doc-guide");
  });

  it("atp catalog list --verbose appends type from atp-package.yaml", () => {
    const out = runAtp(["catalog", "list", "--verbose"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    expect(out).toMatch(/test-package[\s\S]*\(/);
  });

  it("atp catalog remove deletes user row and drops name from catalog list", () => {
    const outBefore = runAtp(["catalog", "list"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    expect(outBefore).toContain("doc-guide");

    runAtp(["catalog", "remove", "doc-guide"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });

    const outAfter = runAtp(["catalog", "list"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    expect(outAfter).not.toContain("doc-guide");
    expect(outAfter).toContain("test-package");
  });

  it("atp catalog remove exits 1 for standard-only package", () => {
    fs.writeFileSync(
      path.join(stationDir, "atp-catalog.yaml"),
      makeStationCatalogYaml(
        [],
        [{ name: "std-pkg", version: "1.0.0", location: "file:///x" }]
      )
    );
    const r = runAtpExpectExit(["catalog", "remove", "std-pkg"], 1, {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    expect(r.stderr + r.stdout).toMatch(/standard catalog/i);
  });

  it("atp catalog list --verbose exits 2 on invalid package yaml", () => {
    const badDir = path.join(stationDir, "user_packages", "badpkg");
    fs.mkdirSync(badDir, { recursive: true });
    fs.writeFileSync(path.join(badDir, "atp-package.yaml"), "type: [\n", "utf8");
    const catalogContent = makeStationCatalogYaml(
      [
        {
          name: "badpkg",
          version: "1.0.0",
          location: `file://${badDir.replace(/\\/g, "/")}`,
        },
      ],
      []
    );
    fs.writeFileSync(path.join(stationDir, "atp-catalog.yaml"), catalogContent);
    const r = runAtpSpawn(["catalog", "list", "--verbose"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    expect(r.status).toBe(2);
  });
});
