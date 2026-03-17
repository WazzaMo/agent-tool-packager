/**
 * Unit tests for config/load module.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import yaml from "js-yaml";
import {
  loadStationConfig,
  loadSafehouseConfig,
  loadSafehouseManifest,
  stationExists,
  safehouseExists,
  addPackageToSafehouseManifest,
  removePackageFromSafehouseManifest,
  loadSafehouseList,
  loadSafehouseManifestFromPath,
  stationHasPackage,
  deleteStationPackageManifest,
  writeStationPackageManifest,
} from "../../src/config/load.js";

function createTempDir(): string {
  const dir = path.join(os.tmpdir(), `atp-config-load-${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

describe("config/load", () => {
  const originalStationPath = process.env.STATION_PATH;

  afterEach(() => {
    process.env.STATION_PATH = originalStationPath;
  });

  describe("loadStationConfig", () => {
    it("returns null when Station has no config", () => {
      const tmp = createTempDir();
      process.env.STATION_PATH = tmp;
      expect(loadStationConfig()).toBeNull();
      fs.rmSync(tmp, { recursive: true });
    });

    it("loads config when atp-config.yaml exists", () => {
      const tmp = createTempDir();
      fs.writeFileSync(
        path.join(tmp, "atp-config.yaml"),
        "configuration:\n  version: '0.1'\n  agent-paths: {}"
      );
      process.env.STATION_PATH = tmp;
      const config = loadStationConfig();
      expect(config).not.toBeNull();
      expect((config as { configuration: { version: string } }).configuration.version).toBe("0.1");
      fs.rmSync(tmp, { recursive: true });
    });
  });

  describe("stationExists and safehouseExists", () => {
    it("stationExists returns true when Station dir exists", () => {
      const tmp = createTempDir();
      process.env.STATION_PATH = tmp;
      expect(stationExists()).toBe(true);
      fs.rmSync(tmp, { recursive: true });
    });

    it("safehouseExists returns true when .atp_safehouse exists in cwd", () => {
      const tmp = createTempDir();
      fs.mkdirSync(path.join(tmp, ".atp_safehouse"), { recursive: true });
      expect(safehouseExists(tmp)).toBe(true);
      fs.rmSync(tmp, { recursive: true });
    });

    it("safehouseExists returns false when .atp_safehouse does not exist", () => {
      expect(safehouseExists(os.tmpdir())).toBe(false);
    });
  });

  describe("Safehouse manifest", () => {
    it("addPackageToSafehouseManifest and removePackageFromSafehouseManifest", () => {
      const base = createTempDir();
      const safehouse = path.join(base, ".atp_safehouse");
      fs.mkdirSync(safehouse, { recursive: true });
      fs.writeFileSync(
        path.join(safehouse, "atp-config.yaml"),
        "agent: cursor\nstation_path: null"
      );

      addPackageToSafehouseManifest(
        "pkg-a",
        "1.0",
        "user-bin",
        "station",
        path.dirname(safehouse)
      );
      let manifest = loadSafehouseManifest(path.dirname(safehouse));
      expect(manifest?.packages).toHaveLength(1);
      expect(manifest?.packages[0].name).toBe("pkg-a");
      expect(manifest?.packages[0].source).toBe("station");
      expect(manifest?.packages[0].binary_scope).toBe("user-bin");

      removePackageFromSafehouseManifest("pkg-a", path.dirname(safehouse));
      manifest = loadSafehouseManifest(path.dirname(safehouse));
      expect(manifest?.packages).toHaveLength(0);

      fs.rmSync(base, { recursive: true });
    });
  });

  describe("Station manifest", () => {
    it("writeStationPackageManifest, stationHasPackage, deleteStationPackageManifest", () => {
      const tmp = createTempDir();
      fs.mkdirSync(path.join(tmp, "manifest"), { recursive: true });
      process.env.STATION_PATH = tmp;

      writeStationPackageManifest("util-pkg", {
        name: "util-pkg",
        version: "2.0",
        scope: "user",
        source: "file:///some/path",
      });
      expect(stationHasPackage("util-pkg")).toBe(true);

      deleteStationPackageManifest("util-pkg");
      expect(stationHasPackage("util-pkg")).toBe(false);

      fs.rmSync(tmp, { recursive: true });
    });
  });

  describe("loadSafehouseList", () => {
    it("returns empty when no safehouse_list.yaml", () => {
      const tmp = createTempDir();
      process.env.STATION_PATH = tmp;
      expect(loadSafehouseList()).toEqual([]);
      fs.rmSync(tmp, { recursive: true });
    });

    it("returns expanded paths from safehouse_list.yaml", () => {
      const tmp = createTempDir();
      fs.writeFileSync(
        path.join(tmp, "safehouse_list.yaml"),
        "safehouse_paths:\n  - /abs/path/to/safe"
      );
      process.env.STATION_PATH = tmp;
      const list = loadSafehouseList();
      expect(list).toHaveLength(1);
      expect(list[0]).toMatch(/\/abs\/path\/to\/safe/);
      fs.rmSync(tmp, { recursive: true });
    });
  });

  describe("loadSafehouseManifestFromPath", () => {
    it("returns null when manifest does not exist", () => {
      expect(loadSafehouseManifestFromPath(os.tmpdir())).toBeNull();
    });

    it("loads manifest from absolute safehouse path", () => {
      const sh = createTempDir();
      fs.writeFileSync(
        path.join(sh, "manifest.yaml"),
        yaml.dump({
          "Safehouse-Manifest": {
            packages: [
              {
                name: "x",
                version: "1",
                source: "local",
                binary_scope: "project-bin",
              },
            ],
            station_path: null,
          },
        })
      );
      const m = loadSafehouseManifestFromPath(sh);
      expect(m?.packages).toHaveLength(1);
      expect(m?.packages[0].name).toBe("x");
      expect(m?.packages[0].source).toBe("local");
      expect(m?.packages[0].binary_scope).toBe("project-bin");
      fs.rmSync(sh, { recursive: true });
    });

    it("loads legacy flat manifest (backward compat)", () => {
      const sh = createTempDir();
      fs.writeFileSync(
        path.join(sh, "manifest.yaml"),
        yaml.dump({ packages: [{ name: "legacy", version: "1" }], station_path: null })
      );
      const m = loadSafehouseManifestFromPath(sh);
      expect(m?.packages).toHaveLength(1);
      expect(m?.packages[0].name).toBe("legacy");
      fs.rmSync(sh, { recursive: true });
    });
  });
});
