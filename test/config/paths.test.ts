/**
 * Unit tests for config/paths.
 * Acceptance: Station path from STATION_PATH or ~/.atp_station, Safehouse path resolution.
 */

import { describe, it, expect, afterEach } from "vitest";
import path from "node:path";
import os from "node:os";
import {
  expandHome,
  getStationPath,
  getSafehousePath,
  pathExists,
  DEFAULT_STATION_PATH,
  isHomeSafehouseEscapeHatchActive,
  isForbiddenSafehouseDir,
} from "../../src/config/paths.js";

describe("expandHome", () => {
  it("expands ~/ to home directory", () => {
    const result = expandHome("~/foo/bar");
    expect(result).toBe(path.join(os.homedir(), "foo/bar"));
  });

  it("expands ~ to home directory", () => {
    const result = expandHome("~");
    expect(result).toBe(os.homedir());
  });

  it("expands $HOME to home directory", () => {
    const result = expandHome("$HOME/bar");
    expect(result).toBe(path.join(os.homedir(), "/bar"));
  });

  it("returns path unchanged when not tilde or $HOME", () => {
    expect(expandHome("/absolute/path")).toBe("/absolute/path");
    expect(expandHome("relative/path")).toBe("relative/path");
  });
});

describe("getStationPath", () => {
  const originalStationPath = process.env.STATION_PATH;

  afterEach(() => {
    if (originalStationPath !== undefined) {
      process.env.STATION_PATH = originalStationPath;
    } else {
      delete process.env.STATION_PATH;
    }
  });

  it("returns DEFAULT_STATION_PATH when STATION_PATH is not set", () => {
    delete process.env.STATION_PATH;
    expect(getStationPath()).toBe(DEFAULT_STATION_PATH);
    expect(getStationPath()).toBe(path.join(os.homedir(), ".atp_station"));
  });

  it("returns expanded STATION_PATH when set", () => {
    process.env.STATION_PATH = "~/custom/.atp_station";
    const result = getStationPath();
    expect(result).toBe(path.join(os.homedir(), "custom/.atp_station"));
  });
});

describe("getSafehousePath", () => {
  it("returns .atp_safehouse relative to cwd by default", () => {
    const cwd = process.cwd();
    expect(getSafehousePath(cwd)).toBe(path.join(cwd, ".atp_safehouse"));
  });

  it("returns .atp_safehouse for given directory", () => {
    const dir = "/tmp/test-project";
    expect(getSafehousePath(dir)).toBe("/tmp/test-project/.atp_safehouse");
  });
});

describe("pathExists", () => {
  it("returns true for existing directory", () => {
    expect(pathExists(os.tmpdir())).toBe(true);
  });

  it("returns false for non-existent path", () => {
    expect(pathExists("/nonexistent-path-12345")).toBe(false);
  });

  it("returns false for file (not directory)", async () => {
    const fs = await import("node:fs");
    const tmpFile = path.join(os.tmpdir(), `atp-test-${Date.now()}.tmp`);
    try {
      fs.writeFileSync(tmpFile, "");
      expect(pathExists(tmpFile)).toBe(false);
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });
});

describe("isHomeSafehouseEscapeHatchActive", () => {
  const original = process.env.ATP_ALLOW_HOME_SAFEHOUSE;

  afterEach(() => {
    if (original !== undefined) {
      process.env.ATP_ALLOW_HOME_SAFEHOUSE = original;
    } else {
      delete process.env.ATP_ALLOW_HOME_SAFEHOUSE;
    }
  });

  it("is true only when ATP_ALLOW_HOME_SAFEHOUSE is exactly 1", () => {
    delete process.env.ATP_ALLOW_HOME_SAFEHOUSE;
    expect(isHomeSafehouseEscapeHatchActive()).toBe(false);
    process.env.ATP_ALLOW_HOME_SAFEHOUSE = "";
    expect(isHomeSafehouseEscapeHatchActive()).toBe(false);
    process.env.ATP_ALLOW_HOME_SAFEHOUSE = "0";
    expect(isHomeSafehouseEscapeHatchActive()).toBe(false);
    process.env.ATP_ALLOW_HOME_SAFEHOUSE = "true";
    expect(isHomeSafehouseEscapeHatchActive()).toBe(false);
    process.env.ATP_ALLOW_HOME_SAFEHOUSE = "1";
    expect(isHomeSafehouseEscapeHatchActive()).toBe(true);
  });
});

describe("isForbiddenSafehouseDir", () => {
  const original = process.env.ATP_ALLOW_HOME_SAFEHOUSE;

  afterEach(() => {
    if (original !== undefined) {
      process.env.ATP_ALLOW_HOME_SAFEHOUSE = original;
    } else {
      delete process.env.ATP_ALLOW_HOME_SAFEHOUSE;
    }
  });

  it("is false for a non-home path", () => {
    delete process.env.ATP_ALLOW_HOME_SAFEHOUSE;
    expect(isForbiddenSafehouseDir(path.join(os.tmpdir(), "some-project"))).toBe(false);
  });

  it("is true for homedir when hatch is off", () => {
    delete process.env.ATP_ALLOW_HOME_SAFEHOUSE;
    expect(isForbiddenSafehouseDir(os.homedir())).toBe(true);
  });

  it("is false for homedir when hatch is on", () => {
    process.env.ATP_ALLOW_HOME_SAFEHOUSE = "1";
    expect(isForbiddenSafehouseDir(os.homedir())).toBe(false);
  });
});
