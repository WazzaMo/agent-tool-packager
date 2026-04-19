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

  beforeEach(() => {
    const env = createTempPackageEnv("atp-f4");
    base = env.base;
    stationDir = env.stationDir;
    pkgDir = env.pkgDir;
  });

  afterEach(() => {
    cleanupTempPackageEnv(base);
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

  it("duplicate part types: validate succeeds without duplicate-type stderr", () => {
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
    expect(r.stderr.toLowerCase()).not.toMatch(/duplicate part types/);
  });

  it("part bundle add same path twice is idempotent (exit 0)", () => {
    const o = atpCwd(pkgDir, stationDir);
    runAtp(["station", "init"], o);
    runAtp(["create", "package"], o);
    runAtp(["package", "name", "idem-bundle"], o);
    runAtp(["package", "version", "0.1.0"], o);
    fs.mkdirSync(path.join(pkgDir, "b1", "bin"), { recursive: true });
    fs.writeFileSync(path.join(pkgDir, "b1", "bin", "x"), "#!/bin/sh\n", "utf8");
    runAtp(["package", "newpart", "mcp"], o);
    runAtp(["package", "part", "1", "usage", "Mcp usage"], o);
    runAtp(["package", "part", "1", "bundle", "add", "b1"], o);
    const r2 = runAtpSpawn(["package", "part", "1", "bundle", "add", "b1"], o);
    expect(r2.status).toBe(0);
  });

  it("part bundle add accepts peer directory via path relative to package cwd", () => {
    const o = atpCwd(pkgDir, stationDir);
    runAtp(["station", "init"], o);
    runAtp(["create", "package"], o);
    runAtp(["package", "name", "peer-bundle-pkg"], o);
    runAtp(["package", "version", "0.1.0"], o);
    const peerName = `peer-mcp-${Date.now()}`;
    const peerDir = path.join(path.dirname(pkgDir), peerName);
    fs.mkdirSync(path.join(peerDir, "bin"), { recursive: true });
    fs.writeFileSync(path.join(peerDir, "bin", "srv.js"), "#!/usr/bin/env node\n", "utf8");
    try {
      const relFromPkg = path.relative(pkgDir, peerDir);
      runAtp(["package", "newpart", "mcp"], o);
      runAtp(["package", "part", "1", "usage", "Uses peer bundle."], o);
      runAtp(["package", "part", "1", "bundle", "add", relFromPkg], o);
      const yaml = fs.readFileSync(path.join(pkgDir, "atp-package.yaml"), "utf8");
      expect(yaml).toContain(`path: ${peerName}`);
      runAtp(["validate", "package"], o);
    } finally {
      fs.rmSync(peerDir, { recursive: true, force: true });
    }
  });

  it("part bundle add with --skip-exec records skip-exec and validates (no bin/)", () => {
    const o = atpCwd(pkgDir, stationDir);
    runAtp(["station", "init"], o);
    runAtp(["create", "package"], o);
    runAtp(["package", "name", "data-bundle-pkg"], o);
    runAtp(["package", "version", "0.1.0"], o);
    fs.mkdirSync(path.join(pkgDir, "cfg-only"), { recursive: true });
    fs.writeFileSync(path.join(pkgDir, "cfg-only", "README.txt"), "data\n", "utf8");
    runAtp(["package", "newpart", "mcp"], o);
    runAtp(["package", "part", "1", "usage", "MCP with data-only bundle."], o);
    runAtp(["package", "part", "1", "bundle", "add", "cfg-only", "--skip-exec"], o);
    const yaml = fs.readFileSync(path.join(pkgDir, "atp-package.yaml"), "utf8");
    expect(yaml).toMatch(/skip-exec:\s*true/);
    expect(yaml).not.toMatch(/exec-filter:.*cfg-only/);
    runAtp(["validate", "package"], o);
  });

  it("part bundle add rejects --skip-exec with --exec-filter", () => {
    const o = atpCwd(pkgDir, stationDir);
    runAtp(["station", "init"], o);
    runAtp(["create", "package"], o);
    runAtp(["package", "name", "bad-flags"], o);
    runAtp(["package", "version", "0.1.0"], o);
    fs.mkdirSync(path.join(pkgDir, "bx"), { recursive: true });
    runAtp(["package", "newpart", "mcp"], o);
    runAtp(["package", "part", "1", "usage", "u"], o);
    const r = runAtpSpawn(
      ["package", "part", "1", "bundle", "add", "bx", "--skip-exec", "--exec-filter", "bx/*"],
      o
    );
    expect(r.status).not.toBe(0);
    expect((r.stdout + r.stderr).toLowerCase()).toMatch(/cannot use/);
  });

  it("part bundle add basename collision across parts exits 2", () => {
    const o = atpCwd(pkgDir, stationDir);
    runAtp(["station", "init"], o);
    runAtp(["create", "package"], o);
    runAtp(["package", "name", "collide-bundles"], o);
    runAtp(["package", "version", "0.1.0"], o);
    fs.mkdirSync(path.join(pkgDir, "p1", "foo", "bin"), { recursive: true });
    fs.writeFileSync(path.join(pkgDir, "p1", "foo", "bin", "a"), "#!/bin/sh\n", "utf8");
    fs.mkdirSync(path.join(pkgDir, "p2", "foo", "bin"), { recursive: true });
    fs.writeFileSync(path.join(pkgDir, "p2", "foo", "bin", "b"), "#!/bin/sh\n", "utf8");
    runAtp(["package", "newpart", "mcp"], o);
    runAtp(["package", "part", "1", "usage", "first mcp"], o);
    runAtp(["package", "part", "1", "bundle", "add", "p1/foo"], o);
    runAtp(["validate", "package"], o);
    runAtp(["package", "newpart", "mcp"], o);
    runAtp(["package", "part", "2", "usage", "second mcp"], o);
    const r = runAtpSpawn(["package", "part", "2", "bundle", "add", "p2/foo"], o);
    expect(r.status).toBe(2);
    expect((r.stdout + r.stderr).toLowerCase()).toMatch(/unique/);
  });

  it("part add <type> aliases newpart", () => {
    const o = atpCwd(pkgDir, stationDir);
    runAtp(["station", "init"], o);
    runAtp(["create", "package"], o);
    runAtp(["package", "name", "alias-part"], o);
    runAtp(["package", "version", "0.1.0"], o);
    runAtp(["package", "part", "add", "skill"], o);
    const yaml = fs.readFileSync(path.join(pkgDir, "atp-package.yaml"), "utf8");
    expect(yaml).toMatch(/type:\s*Skill/i);
    expect(yaml).toMatch(/parts:/);
  });

  it("part <n> add usage appends a line; usage replaces", () => {
    const o = atpCwd(pkgDir, stationDir);
    runAtp(["station", "init"], o);
    runAtp(["create", "package"], o);
    runAtp(["package", "name", "usage-lines"], o);
    runAtp(["package", "version", "0.1.0"], o);
    runAtp(["package", "part", "add", "rule"], o);
    runAtp(["package", "part", "1", "usage", "first line"], o);
    runAtp(["package", "part", "1", "add", "usage", "second line"], o);
    let yaml = fs.readFileSync(path.join(pkgDir, "atp-package.yaml"), "utf8");
    expect(yaml).toMatch(/first line/);
    expect(yaml).toMatch(/second line/);
    runAtp(["package", "part", "1", "usage", "replaced only"], o);
    yaml = fs.readFileSync(path.join(pkgDir, "atp-package.yaml"), "utf8");
    expect(yaml).toMatch(/replaced only/);
    expect(yaml).not.toMatch(/first line/);
  });

  it("part <n> component remove updates manifest and stage.tar", () => {
    const o = atpCwd(pkgDir, stationDir);
    runAtp(["station", "init"], o);
    runAtp(["create", "package"], o);
    runAtp(["package", "name", "p-cr"], o);
    runAtp(["package", "version", "0.1.0"], o);
    fs.writeFileSync(path.join(pkgDir, "z.md"), "# Z\n");
    runAtp(["package", "part", "add", "rule"], o);
    runAtp(["package", "part", "1", "usage", "rule usage"], o);
    runAtp(["package", "part", "1", "component", "z.md"], o);
    runAtp(["validate", "package"], o);
    runAtp(["package", "part", "1", "component", "remove", "z.md"], o);
    const yaml = fs.readFileSync(path.join(pkgDir, "atp-package.yaml"), "utf8");
    expect(yaml).not.toMatch(/\bz\.md\b/);
    const listing = listStageTar(pkgDir);
    expect(listing).not.toMatch(/part_1_Rule\/z\.md/);
  });

  it("part <n> bundle remove drops bundle from tar and manifest", () => {
    const o = atpCwd(pkgDir, stationDir);
    runAtp(["station", "init"], o);
    runAtp(["create", "package"], o);
    runAtp(["package", "name", "p-br"], o);
    runAtp(["package", "version", "0.1.0"], o);
    fs.mkdirSync(path.join(pkgDir, "bx", "bin"), { recursive: true });
    fs.writeFileSync(path.join(pkgDir, "bx", "bin", "t"), "#!/bin/sh\n", "utf8");
    runAtp(["package", "part", "add", "mcp"], o);
    runAtp(["package", "part", "1", "usage", "mcp"], o);
    runAtp(["package", "part", "1", "bundle", "add", "bx"], o);
    runAtp(["validate", "package"], o);
    runAtp(["package", "part", "1", "bundle", "remove", "bx"], o);
    const yaml = fs.readFileSync(path.join(pkgDir, "atp-package.yaml"), "utf8");
    expect(yaml).not.toMatch(/\bbx\b/);
    const listing = listStageTar(pkgDir);
    expect(listing).not.toMatch(/part_1_Mcp\/bx/);
  });

  it("part <n> remove reindexes stage.tar prefixes", () => {
    const o = atpCwd(pkgDir, stationDir);
    runAtp(["station", "init"], o);
    runAtp(["create", "package"], o);
    runAtp(["package", "name", "p-prm"], o);
    runAtp(["package", "version", "0.1.0"], o);
    fs.writeFileSync(path.join(pkgDir, "r1.md"), "# R1\n");
    fs.writeFileSync(path.join(pkgDir, "r2.md"), "# R2\n");
    fs.writeFileSync(path.join(pkgDir, "r3.md"), "# R3\n");
    runAtp(["package", "part", "add", "rule"], o);
    runAtp(["package", "part", "1", "usage", "p1"], o);
    runAtp(["package", "part", "1", "component", "r1.md"], o);
    runAtp(["package", "part", "add", "rule"], o);
    runAtp(["package", "part", "2", "usage", "p2"], o);
    runAtp(["package", "part", "2", "component", "r2.md"], o);
    runAtp(["package", "part", "add", "rule"], o);
    runAtp(["package", "part", "3", "usage", "p3"], o);
    runAtp(["package", "part", "3", "component", "r3.md"], o);
    runAtp(["validate", "package"], o);
    let listing = listStageTar(pkgDir);
    expect(listing).toMatch(/part_1_Rule\/r1\.md/);
    expect(listing).toMatch(/part_2_Rule\/r2\.md/);
    expect(listing).toMatch(/part_3_Rule\/r3\.md/);
    runAtp(["package", "part", "2", "remove"], o);
    listing = listStageTar(pkgDir);
    expect(listing).toMatch(/part_1_Rule\/r1\.md/);
    expect(listing).not.toMatch(/part_2_Rule\/r2\.md/);
    expect(listing).toMatch(/part_2_Rule\/r3\.md/);
    expect(listing).not.toMatch(/part_3_Rule/);
    runAtp(["validate", "package"], o);
  });
});
