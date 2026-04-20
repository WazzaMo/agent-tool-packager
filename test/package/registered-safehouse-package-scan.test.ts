/**
 * Unit tests: discover projects whose registered Safehouse manifest lists a package.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import yaml from "js-yaml";

import { sortedProjectBasesWithPackageInRegisteredSafehouses } from "../../src/package/registered-safehouse-package-scan.js";

describe("sortedProjectBasesWithPackageInRegisteredSafehouses", () => {
  let stationDir: string;
  let projA: string;
  let projB: string;

  beforeEach(() => {
    stationDir = path.join(os.tmpdir(), `atp-shscan-st-${Date.now()}`);
    projA = path.join(os.tmpdir(), `atp-shscan-a-${Date.now()}`);
    projB = path.join(os.tmpdir(), `atp-shscan-b-${Date.now()}`);
    fs.mkdirSync(stationDir, { recursive: true });
    const shA = path.join(projA, ".atp_safehouse");
    const shB = path.join(projB, ".atp_safehouse");
    fs.mkdirSync(shA, { recursive: true });
    fs.mkdirSync(shB, { recursive: true });
    fs.writeFileSync(
      path.join(shA, "manifest.yaml"),
      yaml.dump({
        "Safehouse-Manifest": {
          packages: [{ name: "pkg-x", source: "station", binary_scope: "user-bin" }],
          station_path: null,
        },
      }),
      "utf8"
    );
    fs.writeFileSync(
      path.join(shB, "manifest.yaml"),
      yaml.dump({
        "Safehouse-Manifest": {
          packages: [
            { name: "other", source: "station", binary_scope: "user-bin" },
            { name: "pkg-x", source: "station", binary_scope: "user-bin" },
          ],
          station_path: null,
        },
      }),
      "utf8"
    );
    fs.writeFileSync(
      path.join(stationDir, "atp-safehouse-list.yaml"),
      yaml.dump(
        {
          safehouse_paths: [shA, shB],
        },
        { lineWidth: 120 }
      ),
      "utf8"
    );
  });

  afterEach(() => {
    for (const d of [stationDir, projA, projB]) {
      try {
        fs.rmSync(d, { recursive: true });
      } catch {
        /* ignore */
      }
    }
  });

  it("returns sorted unique project bases that list the package", () => {
    const bases = sortedProjectBasesWithPackageInRegisteredSafehouses(stationDir, "pkg-x");
    expect(new Set(bases)).toEqual(new Set([path.resolve(projA), path.resolve(projB)]));
    expect(bases).toEqual([...bases].sort());
  });

  it("returns empty when no manifest lists the package", () => {
    expect(
      sortedProjectBasesWithPackageInRegisteredSafehouses(stationDir, "missing-pkg")
    ).toEqual([]);
  });

  it("returns empty when safehouse list file is missing", () => {
    fs.unlinkSync(path.join(stationDir, "atp-safehouse-list.yaml"));
    expect(sortedProjectBasesWithPackageInRegisteredSafehouses(stationDir, "pkg-x")).toEqual([]);
  });

  it("skips missing safehouse directories", () => {
    fs.rmSync(path.join(projB, ".atp_safehouse"), { recursive: true });
    const bases = sortedProjectBasesWithPackageInRegisteredSafehouses(stationDir, "pkg-x");
    expect(bases).toEqual([path.resolve(projA)]);
  });
});
