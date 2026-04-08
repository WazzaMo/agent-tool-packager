/**
 * Integration test: full multi-type authoring flow with a Prompt part and real repo docs.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import yaml from "js-yaml";
import { runAtp, runAtpExpectExit, PROJECT_ROOT } from "./test-helpers.js";
import { atpCwd, listStageTar } from "./package-developer-helpers.js";

const DOC_GUIDE_SRC = path.join(PROJECT_ROOT, "docs", "doc-guide.md");
const CLEAN_CODE_SRC = path.join(PROJECT_ROOT, "docs", "clean-code.md");

describe("Integration: package authoring — Prompt part with doc-guide and clean-code", () => {
  let base: string;
  let stationDir: string;
  let pkgDir: string;

  beforeEach(() => {
    base = path.join(os.tmpdir(), `atp-authoring-${Date.now()}`);
    fs.mkdirSync(base, { recursive: true });
    stationDir = path.join(base, "station");
    pkgDir = path.join(base, "tmp-package");
    fs.mkdirSync(pkgDir, { recursive: true });

    const docsDir = path.join(pkgDir, "docs");
    fs.mkdirSync(docsDir, { recursive: true });
    fs.copyFileSync(DOC_GUIDE_SRC, path.join(docsDir, "doc-guide.md"));
    fs.copyFileSync(CLEAN_CODE_SRC, path.join(docsDir, "clean-code.md"));
  });

  afterEach(() => {
    try {
      fs.rmSync(base, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it("skeleton, metadata, prompt part, components, validate, and summary", () => {
    const o = atpCwd(pkgDir, stationDir);

    runAtp(["station", "init"], o);

    runAtp(["create", "package"], o);
    const manifestPath = path.join(pkgDir, "atp-package.yaml");
    expect(fs.existsSync(manifestPath)).toBe(true);

    let raw = fs.readFileSync(manifestPath, "utf8");
    let doc = yaml.load(raw) as Record<string, unknown>;
    expect(doc.type).toMatch(/^Multi$/i);
    expect(doc.parts).toEqual([]);

    const pkgName = "tmp-package";
    const developer = "ATP Integration Test Author";
    const version = "1.2.3";
    const license = "Apache-2.0";

    runAtp(["package", "name", pkgName], o);
    raw = fs.readFileSync(manifestPath, "utf8");
    doc = yaml.load(raw) as Record<string, unknown>;
    expect(doc.name).toBe(pkgName);

    runAtp(["package", "developer", developer], o);
    raw = fs.readFileSync(manifestPath, "utf8");
    doc = yaml.load(raw) as Record<string, unknown>;
    expect(doc.developer).toBe(developer);

    runAtp(["package", "version", version], o);
    raw = fs.readFileSync(manifestPath, "utf8");
    doc = yaml.load(raw) as Record<string, unknown>;
    expect(doc.version).toBe(version);

    runAtp(["package", "license", license], o);
    raw = fs.readFileSync(manifestPath, "utf8");
    doc = yaml.load(raw) as Record<string, unknown>;
    expect(doc.license).toBe(license);

    runAtp(["package", "newpart", "prompt"], o);
    runAtp(
      ["package", "part", "1", "usage", "Ship doc-guide and clean-code as project prompts."],
      o
    );
    runAtp(["package", "part", "1", "component", "docs/doc-guide.md"], o);
    runAtp(["package", "part", "1", "component", "docs/clean-code.md"], o);

    raw = fs.readFileSync(manifestPath, "utf8");
    doc = yaml.load(raw) as Record<string, unknown>;
    const parts = doc.parts as Array<{ type: string; components?: string[]; usage?: string[] }>;
    expect(parts).toHaveLength(1);
    expect(parts[0].type).toMatch(/^Prompt$/i);
    expect(parts[0].usage?.[0]).toContain("doc-guide");
    const comps = parts[0].components ?? [];
    expect(comps).toContain("doc-guide.md");
    expect(comps).toContain("clean-code.md");

    const listing = listStageTar(pkgDir);
    expect(listing).toMatch(/part_1_Prompt\/doc-guide\.md/);
    expect(listing).toMatch(/part_1_Prompt\/clean-code\.md/);

    runAtpExpectExit(["validate", "package"], 0, o);

    const summaryOut = runAtp(["package", "summary"], o);
    const combined = summaryOut.toLowerCase();
    expect(combined).toMatch(/package summary/);
    expect(summaryOut).toMatch(new RegExp(pkgName.replace(/-/g, "\\-")));
    expect(combined).toMatch(/multi/);
    expect(summaryOut).toContain(developer);
    expect(summaryOut).toContain(version);
    expect(summaryOut).toContain(license);
    expect(combined).toMatch(/prompt/);
    expect(summaryOut).toContain("doc-guide.md");
    expect(summaryOut).toContain("clean-code.md");
    expect(combined).toMatch(/this package can be added to the catalog/);
  });

  it("exits 1 when doc-guide.md is added twice to the same Prompt part", () => {
    const o = atpCwd(pkgDir, stationDir);
    runAtp(["station", "init"], o);
    runAtp(["create", "package"], o);
    runAtp(["package", "name", "dup-same-part"], o);
    runAtp(["package", "version", "0.1.0"], o);
    runAtp(["package", "newpart", "prompt"], o);
    runAtp(["package", "part", "1", "usage", "First usage line for prompts."], o);
    runAtp(["package", "part", "1", "component", "docs/doc-guide.md"], o);

    const r = runAtpExpectExit(
      ["package", "part", "1", "component", "docs/doc-guide.md"],
      1,
      o
    );
    const out = r.stdout + r.stderr;
    expect(out).toMatch(/already listed for part 1/i);

    const raw = fs.readFileSync(path.join(pkgDir, "atp-package.yaml"), "utf8");
    const doc = yaml.load(raw) as { parts: Array<{ components?: string[] }> };
    const comps = doc.parts[0]?.components ?? [];
    expect(comps.filter((c) => c === "doc-guide.md").length).toBe(1);
  });

  it("exits 1 when doc-guide.md is added to a second part after the first part", () => {
    const o = atpCwd(pkgDir, stationDir);
    runAtp(["station", "init"], o);
    runAtp(["create", "package"], o);
    runAtp(["package", "name", "dup-two-parts"], o);
    runAtp(["package", "version", "0.1.0"], o);
    runAtp(["package", "newpart", "prompt"], o);
    runAtp(["package", "part", "1", "usage", "Prompt part with doc guide."], o);
    runAtp(["package", "part", "1", "component", "docs/doc-guide.md"], o);
    runAtp(["package", "newpart", "rule"], o);
    runAtp(["package", "part", "2", "usage", "Second part tries same basename."], o);

    const r = runAtpExpectExit(
      ["package", "part", "2", "component", "docs/doc-guide.md"],
      1,
      o
    );
    const out = r.stdout + r.stderr;
    expect(out).toMatch(/must be unique across all parts/i);

    const raw = fs.readFileSync(path.join(pkgDir, "atp-package.yaml"), "utf8");
    const doc = yaml.load(raw) as { parts: Array<{ components?: string[] }> };
    expect(doc.parts).toHaveLength(2);
    expect(doc.parts[1]?.components ?? []).not.toContain("doc-guide.md");
  });
});
