/**
 * Integration tests for Feature 4: Multi-type packages.
 * See docs/features/4-multi-type-packages.md.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { runAtp, runAtpSpawn } from "./test-helpers.js";
import {
  atpCwd,
  expectPackageInStation,
  createTempPackageEnv,
  cleanupTempPackageEnv,
  listStageTar,
} from "./package-developer-helpers.js";

describe("Integration: Feature 4 multi-type packages", () => {
  let base: string;
  let stationDir: string;
  let pkgDir: string;
  let origStationPath: string | undefined;

  beforeEach(() => {
    const env = createTempPackageEnv("atp-f4");
    base = env.base;
    stationDir = env.stationDir;
    pkgDir = env.pkgDir;
    origStationPath = env.origStationPath;
  });

  afterEach(() => {
    cleanupTempPackageEnv(base, origStationPath);
  });

  it("default skeleton is Multi with empty parts", () => {
    const o = atpCwd(pkgDir, stationDir);
    runAtp(["station", "init"], o);
    runAtp(["create", "package"], o);
    const yaml = fs.readFileSync(path.join(pkgDir, "atp-package.yaml"), "utf8");
    expect(yaml).toMatch(/type:\s*Multi/i);
    expect(yaml).toMatch(/parts:\s*\[\]/);
  });

  it("legacy skeleton plus --legacy has empty root type", () => {
    const o = atpCwd(pkgDir, stationDir);
    runAtp(["station", "init"], o);
    runAtp(["create", "package", "skeleton", "--legacy"], o);
    const yaml = fs.readFileSync(path.join(pkgDir, "atp-package.yaml"), "utf8");
    expect(yaml).toMatch(/type:\s*""/);
  });

  it("workflow: Skill + Mcp parts, stage.tar uses part_N_Type paths, catalog add succeeds", () => {
    const o = atpCwd(pkgDir, stationDir);
    runAtp(["station", "init"], o);
    runAtp(["create", "package"], o);

    fs.writeFileSync(path.join(pkgDir, "SKILL.md"), "# VecFS skill\n");
    fs.mkdirSync(path.join(pkgDir, "vecfs-ts", "bin"), { recursive: true });
    fs.writeFileSync(path.join(pkgDir, "vecfs-ts", "bin", "mcp.js"), "#!/usr/bin/env node\n", "utf8");

    runAtp(["package", "name", "vecfs-toolkit"], o);
    runAtp(["package", "version", "0.1.0"], o);
    runAtp(["package", "newpart", "skill"], o);
    runAtp(["package", "part", "1", "usage", "Skill to enable Agent to use long-term memory."], o);
    runAtp(["package", "part", "1", "component", "SKILL.md"], o);
    runAtp(["package", "newpart", "mcp"], o);
    runAtp(["package", "part", "2", "usage", "MCP server that provides long-term memory."], o);
    runAtp(
      [
        "package",
        "part",
        "2",
        "bundle",
        "add",
        "vecfs-ts",
        "--exec-filter",
        "vecfs-ts/bin/*",
      ],
      o
    );

    const listing = listStageTar(pkgDir);
    expect(listing).toMatch(/part_1_Skill\/SKILL\.md/);
    expect(listing).toMatch(/part_2_Mcp\/vecfs-ts\/bin\/mcp\.js/);

    runAtp(["validate", "package"], o);
    runAtp(["catalog", "add", "package"], o);
    expectPackageInStation(stationDir, "vecfs-toolkit");

    const installed = path.join(stationDir, "user_packages", "vecfs-toolkit");
    expect(fs.existsSync(path.join(installed, "part_1_Skill", "SKILL.md"))).toBe(true);
    expect(fs.existsSync(path.join(installed, "part_2_Mcp", "vecfs-ts", "bin", "mcp.js"))).toBe(
      true
    );
  });

  it("newpart on legacy single-type package exits non-zero", () => {
    const o = atpCwd(pkgDir, stationDir);
    runAtp(["station", "init"], o);
    runAtp(["create", "package", "--legacy"], o);
    runAtp(["package", "type", "rule"], o);
    const r = runAtpSpawn(["package", "newpart", "skill"], o);
    expect(r.status).not.toBe(0);
    expect((r.stdout + r.stderr).toLowerCase()).toMatch(/multi/);
  });

  it("duplicate part types: validate succeeds and stderr warns", () => {
    const o = atpCwd(pkgDir, stationDir);
    runAtp(["station", "init"], o);
    runAtp(["create", "package"], o);
    fs.writeFileSync(path.join(pkgDir, "a.md"), "# A\n");
    fs.writeFileSync(path.join(pkgDir, "b.md"), "# B\n");
    runAtp(["package", "name", "dup-types"], o);
    runAtp(["package", "version", "0.1.0"], o);
    runAtp(["package", "newpart", "rule"], o);
    runAtp(["package", "part", "1", "usage", "First rule"], o);
    runAtp(["package", "part", "1", "component", "a.md"], o);
    runAtp(["package", "newpart", "rule"], o);
    runAtp(["package", "part", "2", "usage", "Second rule"], o);
    runAtp(["package", "part", "2", "component", "b.md"], o);
    const r = runAtpSpawn(["validate", "package"], o);
    expect(r.status).toBe(0);
    expect(r.stderr.toLowerCase()).toMatch(/duplicate/);
  });
});
