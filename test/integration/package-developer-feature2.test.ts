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

  beforeEach(() => {
    const env = createTempPackageEnv("atp-f2");
    base = env.base;
    stationDir = env.stationDir;
    pkgDir = env.pkgDir;
  });

  afterEach(() => {
    cleanupTempPackageEnv(base);
  });

  it("catalog add package fails with exit 1 when package is incomplete", () => {
    const o = atpCwd(pkgDir, stationDir);
    runAtp(["station", "init"], o);
    runAtp(["create", "package", "skeleton", "--legacy"], o);
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

  it("package usage sets a usage list entry in atp-package.yaml", () => {
    const o = atpCwd(pkgDir, stationDir);
    runAtp(["station", "init"], o);
    runAtp(["create", "package", "skeleton", "--legacy"], o);
    runAtp(
      ["package", "usage", "When working on TypeScript code the coding rule should apply"],
      o
    );

    const manifest = fs.readFileSync(path.join(pkgDir, "atp-package.yaml"), "utf8");
    expect(manifest).toMatch(
      /usage:\s*\n\s*-\s*When working on TypeScript code the coding rule should apply/
    );
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
    runAtp(["create", "package", "skeleton", "--legacy"], atpCwd(pkgDir, stationDir));
    expect(fs.existsSync(path.join(pkgDir, "stage.tar"))).toBe(false);
    const manifestAfter = fs.readFileSync(path.join(pkgDir, "atp-package.yaml"), "utf8");
    expect(manifestAfter).not.toMatch(/skeleton-pkg/);
  });

  it("component add accepts source outside package directory (../)", () => {
    initPackage(pkgDir, stationDir, {
      type: "rule",
      name: "x",
      usage: "x",
    });
    const extDir = path.join(path.dirname(pkgDir), `atp-cli-ext-${Date.now()}`);
    fs.mkdirSync(extDir, { recursive: true });
    const extFile = path.join(extDir, "outside.md");
    fs.writeFileSync(extFile, "# Outside\n");
    try {
      const rel = path.join("..", path.basename(extDir), "outside.md");
      runAtp(["package", "component", "add", rel], atpCwd(pkgDir, stationDir));
      const manifest = fs.readFileSync(path.join(pkgDir, "atp-package.yaml"), "utf8");
      expect(manifest).toMatch(/outside\.md/);
      const list = listStageTar(pkgDir);
      expect(list).toMatch(/outside\.md/);
    } finally {
      try {
        fs.rmSync(extDir, { recursive: true });
      } catch {
        /* ignore */
      }
    }
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

  it("atp package summary lists set items and missing (Feature 2)", () => {
    const o = atpCwd(pkgDir, stationDir);
    runAtp(["station", "init"], o);
    runAtp(["create", "package", "skeleton", "--legacy"], o);
    runAtp(["package", "type", "rule"], o);
    runAtp(["package", "name", "summary-pkg"], o);
    runAtp(["package", "version", "0.1.0"], o);
    runAtp(["package", "usage", "Test usage"], o);
    runAtp(["package", "developer", "Warwick Molloy"], o);
    runAtp(["package", "license", "Apache 2.0"], o);
    runAtp(["package", "copyright", "Copyright 2026"], o);

    const result = runAtpExpectExit(["package", "summary"], 1, o);
    const out = result.stdout + result.stderr;
    expect(out).toMatch(/Name.*summary-pkg|name.*summary-pkg/i);
    expect(out).toMatch(/Type.*Rule|type.*Rule/i);
    expect(out).toMatch(/Developer|developer/i);
    expect(out).toMatch(/License|license/i);
    expect(out).toMatch(/Copyright|copyright/i);
    expect(out).toMatch(/Missing|missing/i);
    expect(out).toMatch(/components|component/i);
  });

  it("atp package component remove removes from manifest and stage.tar (Feature 2)", () => {
    fs.writeFileSync(path.join(pkgDir, "keep.md"), "# Keep\n");
    fs.writeFileSync(path.join(pkgDir, "remove.md"), "# Remove\n");
    initPackage(pkgDir, stationDir, {
      type: "rule",
      name: "comp-remove-pkg",
      usage: "Component remove test",
      components: ["keep.md", "remove.md"],
    });
    expect(listStageTar(pkgDir)).toMatch(/remove\.md/);
    runAtp(["package", "component", "remove", "remove.md"], atpCwd(pkgDir, stationDir));
    const list = listStageTar(pkgDir);
    expect(list).not.toMatch(/remove\.md/);
    expect(list).toMatch(/keep\.md/);
    const manifest = fs.readFileSync(path.join(pkgDir, "atp-package.yaml"), "utf8");
    expect(manifest).not.toMatch(/remove\.md/);
    expect(manifest).toMatch(/keep\.md/);
  });

  it("atp package component remove when not in package exits 1 (Feature 2)", () => {
    fs.writeFileSync(path.join(pkgDir, "only.md"), "# Only\n");
    initPackage(pkgDir, stationDir, {
      type: "rule",
      name: "no-remove-pkg",
      usage: "No remove",
      components: ["only.md"],
    });
    const result = runAtpExpectExit(
      ["package", "component", "remove", "never-added.md"],
      1,
      atpCwd(pkgDir, stationDir)
    );
    expect(result.stdout + result.stderr).toMatch(/had not been included|not.*included|not listed/i);
  });

  it("atp package developer, copyright, license set fields (Feature 2)", () => {
    fs.writeFileSync(path.join(pkgDir, "x.md"), "# X\n");
    initPackage(pkgDir, stationDir, {
      type: "rule",
      name: "metadata-pkg",
      usage: "Metadata test",
      components: ["x.md"],
    });
    runAtp(["package", "developer", "Jane Doe"], atpCwd(pkgDir, stationDir));
    runAtp(
      ["package", "copyright", "Jane Doe 2026", "All rights reserved"],
      atpCwd(pkgDir, stationDir)
    );
    runAtp(["package", "license", "MIT"], atpCwd(pkgDir, stationDir));
    const manifest = fs.readFileSync(path.join(pkgDir, "atp-package.yaml"), "utf8");
    expect(manifest).toMatch(/developer.*Jane|Jane Doe/);
    expect(manifest).toMatch(/copyright/);
    expect(manifest).toMatch(/Jane Doe 2026/);
    expect(manifest).toMatch(/All rights reserved/);
    expect(manifest).toMatch(/license.*MIT|MIT/);
  });

  it("atp package add copyright appends to list (Feature 2)", () => {
    fs.writeFileSync(path.join(pkgDir, "y.md"), "# Y\n");
    initPackage(pkgDir, stationDir, {
      type: "rule",
      name: "add-copyright-pkg",
      usage: "Add copyright",
      components: ["y.md"],
    });
    runAtp(["package", "copyright", "Line one"], atpCwd(pkgDir, stationDir));
    runAtp(["package", "add", "copyright", "Line two"], atpCwd(pkgDir, stationDir));
    const manifest = fs.readFileSync(path.join(pkgDir, "atp-package.yaml"), "utf8");
    expect(manifest).toMatch(/Line one/);
    expect(manifest).toMatch(/Line two/);
  });

  it("validate package exit 1 when stage.tar missing but mandatory fields set (Feature 2)", () => {
    const o = atpCwd(pkgDir, stationDir);
    fs.writeFileSync(path.join(pkgDir, "ref.md"), "# Ref\n");
    runAtp(["station", "init"], o);
    runAtp(["create", "package", "skeleton", "--legacy"], o);
    runAtp(["package", "type", "rule"], o);
    runAtp(["package", "name", "exit1-pkg"], o);
    runAtp(["package", "version", "0.1.0"], o);
    runAtp(["package", "usage", "Test"], o);
    runAtp(["package", "component", "add", "ref.md"], o);
    fs.unlinkSync(path.join(pkgDir, "stage.tar"));

    const result = runAtpExpectExit(["validate", "package"], 1, o);
    expect(result.stdout + result.stderr).toMatch(/stage\.tar|not complete|missing/i);
  });
});
