/**
 * Unit tests: remove user catalog package from Station.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import yaml from "js-yaml";

import {
  isSafeCatalogPackageName,
  removeCatalogUserPackage,
} from "../../src/package/catalog-remove.js";

import { makeStationCatalogYaml } from "../integration/test-helpers.js";

describe("catalog-remove", () => {
  describe("isSafeCatalogPackageName", () => {
    it("accepts typical package names", () => {
      expect(isSafeCatalogPackageName("my-rules")).toBe(true);
      expect(isSafeCatalogPackageName("pkg_1")).toBe(true);
      expect(isSafeCatalogPackageName("  alpha  ")).toBe(true);
    });

    it("rejects empty and path-like names", () => {
      expect(isSafeCatalogPackageName("")).toBe(false);
      expect(isSafeCatalogPackageName("   ")).toBe(false);
      expect(isSafeCatalogPackageName("../x")).toBe(false);
      expect(isSafeCatalogPackageName("a/b")).toBe(false);
    });
  });

  describe("removeCatalogUserPackage", () => {
    let stationDir: string;

    beforeEach(() => {
      stationDir = path.join(os.tmpdir(), `atp-catrm-${Date.now()}`);
      fs.mkdirSync(stationDir, { recursive: true });
    });

    afterEach(() => {
      try {
        fs.rmSync(stationDir, { recursive: true });
      } catch {
        /* ignore */
      }
    });

    it("returns no_station when directory is missing", () => {
      const missing = path.join(stationDir, "nope");
      const r = removeCatalogUserPackage(missing, "x");
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.code).toBe("no_station");
      }
    });

    it("returns no_catalog_file when atp-catalog.yaml is absent", () => {
      const r = removeCatalogUserPackage(stationDir, "p");
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.code).toBe("no_catalog_file");
      }
    });

    it("removes user row and user_packages tree", () => {
      const userDir = path.join(stationDir, "user_packages", "gone-pkg");
      fs.mkdirSync(userDir, { recursive: true });
      fs.writeFileSync(path.join(userDir, "atp-package.yaml"), "name: gone-pkg\nversion: 1\n");

      const yamlText = makeStationCatalogYaml(
        [
          {
            name: "gone-pkg",
            version: "1.0.0",
            location: `file://${userDir.replace(/\\/g, "/")}`,
          },
        ],
        []
      );
      fs.writeFileSync(path.join(stationDir, "atp-catalog.yaml"), yamlText);

      const r = removeCatalogUserPackage(stationDir, "gone-pkg");
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.removedUserDir).toBe(true);
      }
      expect(fs.existsSync(userDir)).toBe(false);

      const doc = yaml.load(fs.readFileSync(path.join(stationDir, "atp-catalog.yaml"), "utf8")) as {
        packages: { user: { name: string }[]; standard: unknown[] };
      };
      expect(doc.packages.user).toHaveLength(0);
    });

    it("returns standard_only when name exists only in standard list", () => {
      const yamlText = makeStationCatalogYaml(
        [],
        [{ name: "std-only", version: "1.0.0", location: "file:///x" }]
      );
      fs.writeFileSync(path.join(stationDir, "atp-catalog.yaml"), yamlText);

      const r = removeCatalogUserPackage(stationDir, "std-only");
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.code).toBe("standard_only");
      }
    });

    it("returns not_in_user when package is absent", () => {
      fs.writeFileSync(
        path.join(stationDir, "atp-catalog.yaml"),
        makeStationCatalogYaml([], [])
      );
      const r = removeCatalogUserPackage(stationDir, "missing");
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.code).toBe("not_in_user");
      }
    });

    it("preserves catalog wrapper shape when present", () => {
      const userDir = path.join(stationDir, "user_packages", "wrap");
      fs.mkdirSync(userDir, { recursive: true });
      const inner = yaml.load(
        makeStationCatalogYaml(
          [{ name: "wrap", version: "1.0.0", location: `file://${userDir.replace(/\\/g, "/")}` }],
          []
        )
      ) as Record<string, unknown>;
      fs.writeFileSync(
        path.join(stationDir, "atp-catalog.yaml"),
        yaml.dump({ catalog: inner }, { lineWidth: 120 }),
        "utf8"
      );

      const r = removeCatalogUserPackage(stationDir, "wrap");
      expect(r.ok).toBe(true);

      const root = yaml.load(fs.readFileSync(path.join(stationDir, "atp-catalog.yaml"), "utf8")) as {
        catalog: { packages: { user: unknown[] } };
      };
      expect(root.catalog).toBeDefined();
      expect(root.catalog.packages.user).toHaveLength(0);
    });
  });
});
