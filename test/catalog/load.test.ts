/**
 * Unit tests for catalog loading.
 * Acceptance: Load from global, user (Station), project sources.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  loadGlobalCatalog,
  loadUserCatalog,
  loadProjectCatalog,
} from "../../src/catalog/load.js";

describe("loadGlobalCatalog", () => {
  it("returns catalog with packages array (empty by default)", () => {
    const catalog = loadGlobalCatalog();
    expect(catalog).toEqual({ packages: [] });
  });
});

describe("loadUserCatalog", () => {
  const originalStationPath = process.env.STATION_PATH;

  afterEach(() => {
    process.env.STATION_PATH = originalStationPath;
  });

  it("returns empty when Station has no catalog", () => {
    const tmpDir = path.join(os.tmpdir(), `atp-load-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    process.env.STATION_PATH = tmpDir;
    const catalog = loadUserCatalog();
    expect(catalog.packages).toEqual([]);
    fs.rmSync(tmpDir, { recursive: true });
  });

  it("loads packages from Station atp-catalog.yaml", () => {
    const tmpDir = path.join(os.tmpdir(), `atp-load2-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, "atp-catalog.yaml"),
      `packages:
  - name: my-pkg
    version: 1.0.0
`
    );
    process.env.STATION_PATH = tmpDir;
    const catalog = loadUserCatalog();
    expect(catalog.packages).toHaveLength(1);
    expect(catalog.packages[0]).toMatchObject({ name: "my-pkg", version: "1.0.0" });
    fs.rmSync(tmpDir, { recursive: true });
  });
});

describe("loadProjectCatalog", () => {
  it("returns empty when project has no .atp-local/catalog.yaml", () => {
    const catalog = loadProjectCatalog(os.tmpdir());
    expect(catalog.packages).toEqual([]);
  });

  it("loads packages from .atp-local/catalog.yaml", () => {
    const tmpProj = path.join(os.tmpdir(), `atp-proj-${Date.now()}`);
    const catalogDir = path.join(tmpProj, ".atp-local");
    fs.mkdirSync(catalogDir, { recursive: true });
    fs.writeFileSync(
      path.join(catalogDir, "catalog.yaml"),
      `packages:
  - name: project-pkg
    version: 2.0.0
`
    );
    const catalog = loadProjectCatalog(tmpProj);
    expect(catalog.packages).toHaveLength(1);
    expect(catalog.packages[0]).toMatchObject({ name: "project-pkg", version: "2.0.0" });
    fs.rmSync(tmpProj, { recursive: true });
  });
});
