/**
 * Integration tests for package developer Feature 2 acceptance criteria.
 * See docs/features/2-package-developer-support.md.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { runAtp, runAtpExpectExit } from "./test-helpers.js";
import {
  atpCwd,
  initPackage,
  expectPackageInStation,
  createTempPackageEnv,
  cleanupTempPackageEnv,
  listStageTar,
} from "./package-developer-helpers.js";

describe("Integration: package developer - Feature 2 acceptance", () => {
  let base: string;
  let stationDir: string;
  let pkgDir: string;
  let origStationPath: string | undefined;

  beforeEach(() => {
    const env = createTempPackageEnv("atp-f2");
    base = env.base;
    stationDir = env.stationDir;
    pkgDir = env.pkgDir;
    origStationPath = env.origStationPath;
  });

  afterEach(() => {
    cleanupTempPackageEnv(base, origStationPath);
  });

  it("catalog add package fails with exit 1 when package is incomplete", () => {
    const o = atpCwd(pkgDir, stationDir);
    runAtp(["station", "init"], o);
    runAtp(["create", "package", "skeleton"], o);
    runAtp(["package", "type", "rule"], o);

    const result = runAtpExpectExit(["catalog", "add", "package"], 1, o);
    const output = result.stdout + result.stderr;
    expect(output).toMatch(/Package definition is not yet complete|validation/i);
    expect(output).toMatch(/name|component|usage/i);
  });

  it("stage.tar is deleted from cwd after successful catalog add package", () => {
    fs.writeFileSync(path.join(pkgDir, "a.md"), "# A\n");
    initPackage(pkgDir, stationDir, {
      type: "rule",
      name: "stage-cleanup-pkg",
      usage: "Test",
      components: ["a.md"],
      catalogAdd: false,
    });
    expect(fs.existsSync(path.join(pkgDir, "stage.tar"))).toBe(true);
    runAtp(["catalog", "add", "package"], atpCwd(pkgDir, stationDir));
    expect(fs.existsSync(path.join(pkgDir, "stage.tar"))).toBe(false);
  });

  it("validate package exits 0 with success message when package complete", () => {
    fs.writeFileSync(path.join(pkgDir, "rule.md"), "# Rule\n");
    initPackage(pkgDir, stationDir, {
      type: "rule",
      name: "validate-pkg",
      usage: "Validate test",
      components: ["rule.md"],
    });
    runAtp(["validate", "package"], atpCwd(pkgDir, stationDir));
  });

  it("component add accepts multiple paths in one call", () => {
    fs.writeFileSync(path.join(pkgDir, "doc-guide.md"), "# Doc guide\n");
    fs.writeFileSync(path.join(pkgDir, "coding-standard.md"), "# Coding\n");
    initPackage(pkgDir, stationDir, {
      type: "rule",
      name: "multi-comp-pkg",
      usage: "Multi component",
      components: ["doc-guide.md", "coding-standard.md"],
    });
    const list = listStageTar(pkgDir);
    expect(list).toMatch(/doc-guide\.md/);
    expect(list).toMatch(/coding-standard\.md/);
    const manifest = fs.readFileSync(path.join(pkgDir, "atp-package.yaml"), "utf8");
    expect(manifest).toMatch(/doc-guide\.md/);
    expect(manifest).toMatch(/coding-standard\.md/);
  });

  it("package appears in atp-catalog.yaml with name, version, location after catalog add", () => {
    fs.writeFileSync(path.join(pkgDir, "x.md"), "# X\n");
    initPackage(pkgDir, stationDir, {
      type: "rule",
      name: "catalog-entry-pkg",
      version: "1.2.3",
      usage: "Catalog entry test",
      components: ["x.md"],
      catalogAdd: true,
    });
    const catalogPath = path.join(stationDir, "atp-catalog.yaml");
    const catalog = fs.readFileSync(catalogPath, "utf8");
    expect(catalog).toMatch(/catalog-entry-pkg/);
    expect(catalog).toMatch(/1\.2\.3/);
    expect(catalog).toMatch(/file:\/\//);
  });

  it("create package skeleton deletes previous atp-package.yaml and stage.tar", () => {
    fs.writeFileSync(path.join(pkgDir, "old.md"), "# Old\n");
    initPackage(pkgDir, stationDir, {
      type: "rule",
      name: "skeleton-pkg",
      usage: "Test",
      components: ["old.md"],
    });
    expect(fs.existsSync(path.join(pkgDir, "stage.tar"))).toBe(true);
    const manifestBefore = fs.readFileSync(path.join(pkgDir, "atp-package.yaml"), "utf8");
    expect(manifestBefore).toMatch(/skeleton-pkg/);
    runAtp(["create", "package", "skeleton"], atpCwd(pkgDir, stationDir));
    expect(fs.existsSync(path.join(pkgDir, "stage.tar"))).toBe(false);
    const manifestAfter = fs.readFileSync(path.join(pkgDir, "atp-package.yaml"), "utf8");
    expect(manifestAfter).not.toMatch(/skeleton-pkg/);
  });

  it("component add with invalid path exits 1", () => {
    initPackage(pkgDir, stationDir, {
      type: "rule",
      name: "x",
      usage: "x",
    });
    const result = runAtpExpectExit(
      ["package", "component", "add", "../other/file.md"],
      1,
      atpCwd(pkgDir, stationDir)
    );
    expect(result.stdout + result.stderr).toMatch(/Invalid path/);
  });

  it("bundle remove when bundle not in package exits 1", () => {
    fs.writeFileSync(path.join(pkgDir, "only.md"), "# Only component\n");
    initPackage(pkgDir, stationDir, {
      type: "rule",
      name: "no-bundle-pkg",
      usage: "No bundle",
      components: ["only.md"],
    });
    const result = runAtpExpectExit(
      ["package", "bundle", "remove", "nonexistent-bundle"],
      1,
      atpCwd(pkgDir, stationDir)
    );
    expect(result.stdout + result.stderr).toMatch(/had not been included|not.*included/i);
  });

  it("builds MCP type package and adds to catalog", () => {
    fs.writeFileSync(path.join(pkgDir, "SKILL.md"), "# MCP skill\n");
    initPackage(pkgDir, stationDir, {
      type: "mcp",
      name: "test-mcp-pkg",
      usage: "MCP test",
      components: ["SKILL.md"],
      catalogAdd: true,
    });
    expectPackageInStation(stationDir, "test-mcp-pkg");
  });

  it("bundle with bin/ and share/ structure is staged correctly", () => {
    const binDir = path.join(pkgDir, "exec-base", "bin");
    const shareDir = path.join(pkgDir, "exec-base", "share", "schema");
    fs.mkdirSync(binDir, { recursive: true });
    fs.mkdirSync(shareDir, { recursive: true });
    fs.writeFileSync(path.join(binDir, "parser"), "#!/bin/bash\necho parser\n");
    fs.writeFileSync(path.join(shareDir, "schema.schm"), "schema content\n");
    fs.chmodSync(path.join(binDir, "parser"), 0o755);

    initPackage(pkgDir, stationDir, {
      type: "shell",
      name: "bin-share-pkg",
      usage: "Bin and share test",
      bundles: [{ path: "exec-base" }],
      catalogAdd: false,
    });
    const list = listStageTar(pkgDir);
    expect(list).toMatch(/exec-base\/bin\/parser/);
    expect(list).toMatch(/exec-base\/share\/schema\/schema\.schm/);
    runAtp(["catalog", "add", "package"], atpCwd(pkgDir, stationDir));
    const pkgInStation = path.join(stationDir, "user_packages", "bin-share-pkg");
    expect(fs.existsSync(path.join(pkgInStation, "exec-base", "bin", "parser"))).toBe(true);
    expect(fs.existsSync(path.join(pkgInStation, "exec-base", "share", "schema", "schema.schm"))).toBe(true);
  });

  it("component add produces flat layout in stage.tar (base names only)", () => {
    fs.writeFileSync(path.join(pkgDir, "doc-guide.md"), "# Doc\n");
    fs.writeFileSync(path.join(pkgDir, "coding-standard.md"), "# Coding\n");
    initPackage(pkgDir, stationDir, {
      type: "rule",
      name: "flat-pkg",
      usage: "Flat layout",
      components: ["doc-guide.md", "coding-standard.md"],
    });
    const list = listStageTar(pkgDir);
    const lines = list.split("\n").map((l) => l.trim()).filter(Boolean);
    expect(lines).toContain("doc-guide.md");
    expect(lines).toContain("coding-standard.md");
  });
});
