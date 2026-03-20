/**
 * Unit tests for Station catalog loading.
 */

import { describe, it, expect, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { Catalog, CatalogPackage } from "../../src/catalog/types.js";
import {
  loadStationCatalog,
  emptyCatalog,
  listAllCatalogPackages,
  effectiveStationCatalogPackages,
  parseCatalogPackagesField,
} from "../../src/catalog/load.js";

describe("emptyCatalog", () => {
  it("returns empty standard and user lists", () => {
    expect(emptyCatalog().packages).toEqual({ standard: [], user: [] });
  });
});

describe("loadStationCatalog", () => {
  const originalStationPath = process.env.STATION_PATH;

  afterEach(() => {
    process.env.STATION_PATH = originalStationPath;
  });

  it("returns empty when Station has no catalog file", () => {
    const tmpDir = path.join(os.tmpdir(), `atp-load-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    process.env.STATION_PATH = tmpDir;
    const catalog = loadStationCatalog();
    expect(listAllCatalogPackages(catalog)).toEqual([]);
    fs.rmSync(tmpDir, { recursive: true });
  });

  it("loads atp-catalog.yaml with nested user list", () => {
    const tmpDir = path.join(os.tmpdir(), `atp-load2-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, "atp-catalog.yaml"),
      `packages:
  standard: []
  user:
    - name: my-pkg
      version: 1.0.0
      description: A package
`
    );
    process.env.STATION_PATH = tmpDir;
    const catalog = loadStationCatalog();
    expect(catalog.packages.user).toHaveLength(1);
    expect(catalog.packages.user[0]).toMatchObject({
      name: "my-pkg",
      version: "1.0.0",
      description: "A package",
    });
    fs.rmSync(tmpDir, { recursive: true });
  });
});

describe("parseCatalogPackagesField (strict shape)", () => {
  const empty = { standard: [] as CatalogPackage[], user: [] as CatalogPackage[] };

  it("accepts standard and user arrays of package objects", () => {
    expect(
      parseCatalogPackagesField({
        standard: [{ name: "a", version: "1" }],
        user: [{ name: "b" }],
      })
    ).toEqual({
      standard: [{ name: "a", version: "1" }],
      user: [{ name: "b" }],
    });
  });

  it("accepts empty standard and user arrays", () => {
    expect(parseCatalogPackagesField({ standard: [], user: [] })).toEqual(empty);
  });

  it("rejects legacy flat packages array", () => {
    expect(parseCatalogPackagesField([{ name: "x" }])).toEqual(empty);
  });

  it("rejects missing standard or user", () => {
    expect(parseCatalogPackagesField({ user: [] })).toEqual(empty);
    expect(parseCatalogPackagesField({ standard: [] })).toEqual(empty);
  });

  it("rejects string list entries (name-only scalars)", () => {
    expect(
      parseCatalogPackagesField({
        standard: [],
        user: ["my-pkg"],
      })
    ).toEqual(empty);
  });

  it("rejects any invalid package object in a list", () => {
    expect(
      parseCatalogPackagesField({
        standard: [{ name: "ok" }],
        user: [{ nope: true }],
      })
    ).toEqual(empty);
  });
});

describe("effectiveStationCatalogPackages", () => {
  it("user entry overrides standard for the same name", () => {
    const catalog: Catalog = {
      packages: {
        standard: [{ name: "pkg", version: "1.0.0", description: "std" }],
        user: [{ name: "pkg", version: "2.0.0", description: "usr" }],
      },
    };
    const eff = effectiveStationCatalogPackages(catalog);
    expect(eff).toHaveLength(1);
    expect(eff[0]).toMatchObject({ name: "pkg", version: "2.0.0", description: "usr" });
  });
});
