import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import yaml from "js-yaml";
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

describe("Integration: catalog remove vs registered Safehouses", () => {
  let stationDir: string;
  let cwdDir: string;
  let blockerProj: string;
  let installProj: string;

  beforeEach(() => {
    stationDir = path.join(os.tmpdir(), `atp-catsh-st-${Date.now()}`);
    cwdDir = path.join(os.tmpdir(), `atp-catsh-cwd-${Date.now()}`);
    blockerProj = path.join(os.tmpdir(), `atp-catsh-block-${Date.now()}`);
    installProj = path.join(os.tmpdir(), `atp-catsh-inst-${Date.now()}`);
    fs.mkdirSync(stationDir, { recursive: true });
    fs.mkdirSync(cwdDir, { recursive: true });
    fs.mkdirSync(blockerProj, { recursive: true });
    fs.mkdirSync(installProj, { recursive: true });
    fs.writeFileSync(
      path.join(stationDir, "atp-config.yaml"),
      `configuration:
  version: 0.1.0
  agent-paths:
    cursor:
      project_path: .cursor/
`
    );
    const catalogContent = makeStationCatalogYaml(
      [
        {
          name: "test-package",
          version: "1.0.0",
          location: `file://${FIXTURE_PKG.replace(/\\/g, "/")}`,
        },
      ],
      []
    );
    fs.writeFileSync(path.join(stationDir, "atp-catalog.yaml"), catalogContent);
    fs.mkdirSync(path.join(stationDir, "manifest"), { recursive: true });
  });

  afterEach(() => {
    for (const d of [stationDir, cwdDir, blockerProj, installProj]) {
      try {
        fs.rmSync(d, { recursive: true });
      } catch {
        /* ignore */
      }
    }
  });

  it("atp catalog remove refuses when a registered Safehouse manifest still lists the package", () => {
    const shBlock = path.join(blockerProj, ".atp_safehouse");
    fs.mkdirSync(shBlock, { recursive: true });
    fs.writeFileSync(
      path.join(shBlock, "manifest.yaml"),
      yaml.dump({
        "Safehouse-Manifest": {
          packages: [
            { name: "test-package", source: "station", binary_scope: "user-bin" },
          ],
          station_path: null,
        },
      }),
      "utf8"
    );
    fs.writeFileSync(
      path.join(stationDir, "atp-safehouse-list.yaml"),
      yaml.dump({ safehouse_paths: [shBlock] }),
      "utf8"
    );

    const r = runAtpSpawn(["catalog", "remove", "test-package"], {
      cwd: cwdDir,
      env: { STATION_PATH: stationDir },
    });
    expect(r.status).toBe(1);
    expect(r.stderr + r.stdout).toMatch(/registered project Safehouse/i);
    expect(r.stderr + r.stdout).toMatch(/--and-from-projects/);
    const listOut = runAtp(["catalog", "list"], {
      cwd: cwdDir,
      env: { STATION_PATH: stationDir },
    });
    expect(listOut).toContain("test-package");
  });

  it("atp catalog remove --from-catalog-only succeeds despite registered Safehouse manifest", () => {
    const shBlock = path.join(blockerProj, ".atp_safehouse");
    fs.mkdirSync(shBlock, { recursive: true });
    fs.writeFileSync(
      path.join(shBlock, "manifest.yaml"),
      yaml.dump({
        "Safehouse-Manifest": {
          packages: [
            { name: "test-package", source: "station", binary_scope: "user-bin" },
          ],
          station_path: null,
        },
      }),
      "utf8"
    );
    fs.writeFileSync(
      path.join(stationDir, "atp-safehouse-list.yaml"),
      yaml.dump({ safehouse_paths: [shBlock] }),
      "utf8"
    );

    runAtp(["catalog", "remove", "test-package", "--from-catalog-only"], {
      cwd: cwdDir,
      env: { STATION_PATH: stationDir },
    });
    const listOut = runAtp(["catalog", "list"], {
      cwd: cwdDir,
      env: { STATION_PATH: stationDir },
    });
    expect(listOut).not.toContain("test-package");
  });

  it("atp catalog remove rejects mutually exclusive flags", () => {
    fs.writeFileSync(path.join(stationDir, "atp-safehouse-list.yaml"), "safehouse_paths: []\n");
    const r = runAtpSpawn(
      ["catalog", "remove", "test-package", "--from-catalog-only", "--and-from-projects"],
      {
        cwd: cwdDir,
        env: { STATION_PATH: stationDir },
      }
    );
    expect(r.status).toBe(1);
    expect(r.stderr + r.stdout).toMatch(/mutually exclusive/i);
  });

  it("atp catalog remove --and-from-projects removes install then catalog row", () => {
    fs.writeFileSync(path.join(stationDir, "atp-safehouse-list.yaml"), "safehouse_paths: []\n");
    fs.mkdirSync(path.join(installProj, ".git"), { recursive: true });
    runAtp(["safehouse", "init"], {
      cwd: installProj,
      env: { STATION_PATH: stationDir },
    });
    runAtp(["agent", "cursor"], {
      cwd: installProj,
      env: { STATION_PATH: stationDir },
    });
    runAtp(["install", "test-package", "--project"], {
      cwd: installProj,
      env: { STATION_PATH: stationDir },
    });

    runAtp(["catalog", "remove", "test-package", "--and-from-projects"], {
      cwd: cwdDir,
      env: { STATION_PATH: stationDir },
    });

    const catList = runAtp(["catalog", "list"], {
      cwd: cwdDir,
      env: { STATION_PATH: stationDir },
    });
    expect(catList).not.toContain("test-package");

    const shList = runAtp(["safehouse", "list"], {
      cwd: installProj,
      env: { STATION_PATH: stationDir },
    });
    expect(shList).toMatch(/No packages installed|no packages/i);
  });
});
