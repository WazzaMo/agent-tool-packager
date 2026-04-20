/**
 * Unit tests: update notice and `atp --latest` helpers.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import type { StationConfig } from "../../src/config/station-config.js";
import {
  maybePrintUpdateNotice,
  printLatestVersusCurrent,
  resetBackgroundUpdateNoticeForTests,
  shouldSkipUpdateCheckForDevVersion,
  isPublishedNewerThanCurrent,
  ATP_NPM_PACKAGE_NAME,
} from "../../src/cli/update-notice.js";

function mkStationConfig(): StationConfig {
  return {
    configuration: {
      version: "0.1.0",
      "agent-paths": {},
      "standard-catalog": { url: "https://example.com/cat/" },
    },
  };
}

describe("shouldSkipUpdateCheckForDevVersion", () => {
  it("skips 0.0.0-dev and *-dev suffix", () => {
    expect(shouldSkipUpdateCheckForDevVersion("0.0.0-dev")).toBe(true);
    expect(shouldSkipUpdateCheckForDevVersion("1.0.0-dev")).toBe(true);
    expect(shouldSkipUpdateCheckForDevVersion("1.0.0")).toBe(false);
  });
});

describe("isPublishedNewerThanCurrent", () => {
  it("compares semver", () => {
    expect(isPublishedNewerThanCurrent("0.2.0", "0.3.0")).toBe(true);
    expect(isPublishedNewerThanCurrent("0.3.0", "0.3.0")).toBe(false);
    expect(isPublishedNewerThanCurrent("1.0.0", "0.9.0")).toBe(false);
  });

  it("returns false when strings are not valid semver", () => {
    expect(isPublishedNewerThanCurrent("not", "1.0.0")).toBe(false);
  });
});

describe("maybePrintUpdateNotice", () => {
  const originalAtpVersion = process.env.ATP_VERSION;
  const originalSkip = process.env.ATP_SKIP_UPDATE_CHECK;
  const originalVerbose = process.env.ATP_UPDATE_CHECK;
  let savedArgv: string[];

  beforeEach(() => {
    resetBackgroundUpdateNoticeForTests();
    delete process.env.ATP_SKIP_UPDATE_CHECK;
    delete process.env.ATP_UPDATE_CHECK;
    process.env.ATP_VERSION = "0.1.0";
    savedArgv = [...process.argv];
    process.argv = ["node", "atp", "station", "list"];
  });

  afterEach(() => {
    resetBackgroundUpdateNoticeForTests();
    process.argv.length = 0;
    process.argv.push(...savedArgv);
    if (originalAtpVersion === undefined) {
      delete process.env.ATP_VERSION;
    } else {
      process.env.ATP_VERSION = originalAtpVersion;
    }
    if (originalSkip === undefined) {
      delete process.env.ATP_SKIP_UPDATE_CHECK;
    } else {
      process.env.ATP_SKIP_UPDATE_CHECK = originalSkip;
    }
    if (originalVerbose === undefined) {
      delete process.env.ATP_UPDATE_CHECK;
    } else {
      process.env.ATP_UPDATE_CHECK = originalVerbose;
    }
  });

  it("does not fetch when ATP_SKIP_UPDATE_CHECK is set", async () => {
    process.env.ATP_SKIP_UPDATE_CHECK = "1";
    const fetchFn = vi.fn();
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "atp-un-"));
    try {
      await maybePrintUpdateNotice({
        fetchFn: fetchFn as unknown as typeof fetch,
        stationExists: () => true,
        getStationPath: () => tmp,
        loadStationConfig: () => mkStationConfig(),
        stdoutIsTTY: () => true,
      });
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("does not fetch when stdout is not a TTY and verbose is off", async () => {
    const fetchFn = vi.fn();
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "atp-un-"));
    try {
      await maybePrintUpdateNotice({
        fetchFn: fetchFn as unknown as typeof fetch,
        stationExists: () => true,
        getStationPath: () => tmp,
        loadStationConfig: () => mkStationConfig(),
        stdoutIsTTY: () => false,
      });
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("does not fetch for dev version", async () => {
    process.env.ATP_VERSION = "0.0.0-dev";
    const fetchFn = vi.fn();
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "atp-un-"));
    try {
      await maybePrintUpdateNotice({
        fetchFn: fetchFn as unknown as typeof fetch,
        stationExists: () => true,
        getStationPath: () => tmp,
        loadStationConfig: () => mkStationConfig(),
        stdoutIsTTY: () => true,
      });
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("does not fetch when station is missing", async () => {
    const fetchFn = vi.fn();
    await maybePrintUpdateNotice({
      fetchFn: fetchFn as unknown as typeof fetch,
      stationExists: () => false,
      getStationPath: () => "/nonexistent/station",
      loadStationConfig: () => null,
      stdoutIsTTY: () => true,
    });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("writes throttle and prints stderr when a newer version exists", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ "dist-tags": { latest: "9.0.0" } }),
    });
    const stderr = { write: vi.fn() };
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "atp-un-"));
    fs.mkdirSync(tmp, { recursive: true });
    try {
      await maybePrintUpdateNotice({
        fetchFn: fetchFn as unknown as typeof fetch,
        stderr,
        stationExists: () => true,
        getStationPath: () => tmp,
        loadStationConfig: () => mkStationConfig(),
        stdoutIsTTY: () => true,
        nowMs: () => 1_700_000_000_000,
      });
      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(stderr.write).toHaveBeenCalled();
      const msg = String(stderr.write.mock.calls[0]?.[0]);
      expect(msg).toContain("A newer ATP is available");
      expect(msg).toContain("0.1.0");
      expect(msg).toContain("9.0.0");
      expect(msg).toContain(ATP_NPM_PACKAGE_NAME);
      const throttle = path.join(tmp, ".atp_last_registry_check");
      expect(fs.existsSync(throttle)).toBe(true);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("throttle skips fetch on a subsequent run after reset", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ "dist-tags": { latest: "9.0.0" } }),
    });
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "atp-un-"));
    fs.mkdirSync(tmp, { recursive: true });
    const deps = {
      fetchFn: fetchFn as unknown as typeof fetch,
      stderr: { write: vi.fn() },
      stationExists: () => true,
      getStationPath: () => tmp,
      loadStationConfig: () => mkStationConfig(),
      stdoutIsTTY: () => true,
      nowMs: () => 1_700_000_000_000,
    };
    try {
      await maybePrintUpdateNotice(deps);
      expect(fetchFn).toHaveBeenCalledTimes(1);
      resetBackgroundUpdateNoticeForTests();
      await maybePrintUpdateNotice(deps);
      expect(fetchFn).toHaveBeenCalledTimes(1);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("skips fetch when argv includes --help", async () => {
    process.argv = ["node", "atp", "install", "--help"];
    const fetchFn = vi.fn();
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "atp-un-"));
    try {
      await maybePrintUpdateNotice({
        fetchFn: fetchFn as unknown as typeof fetch,
        stationExists: () => true,
        getStationPath: () => tmp,
        loadStationConfig: () => mkStationConfig(),
        stdoutIsTTY: () => true,
      });
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe("printLatestVersusCurrent", () => {
  const originalAtpVersion = process.env.ATP_VERSION;
  const originalSkip = process.env.ATP_SKIP_UPDATE_CHECK;

  beforeEach(() => {
    delete process.env.ATP_SKIP_UPDATE_CHECK;
    process.env.ATP_VERSION = "0.2.0";
  });

  afterEach(() => {
    if (originalAtpVersion === undefined) {
      delete process.env.ATP_VERSION;
    } else {
      process.env.ATP_VERSION = originalAtpVersion;
    }
    if (originalSkip === undefined) {
      delete process.env.ATP_SKIP_UPDATE_CHECK;
    } else {
      process.env.ATP_SKIP_UPDATE_CHECK = originalSkip;
    }
  });

  it("prints skip message when ATP_SKIP_UPDATE_CHECK is set", async () => {
    process.env.ATP_SKIP_UPDATE_CHECK = "1";
    const stderr = { write: vi.fn() };
    const code = await printLatestVersusCurrent({
      stderr,
      loadStationConfig: () => mkStationConfig(),
      fetchFn: vi.fn() as unknown as typeof fetch,
    });
    expect(code).toBe(0);
    expect(stderr.write).toHaveBeenCalled();
    expect(String(stderr.write.mock.calls[0]?.[0])).toContain(
      "ATP_SKIP_UPDATE_CHECK"
    );
  });

  it("prints current and latest on success", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ "dist-tags": { latest: "0.2.5" } }),
    });
    const log: string[] = [];
    const stdoutWrite = vi
      .spyOn(process.stdout, "write")
      .mockImplementation((chunk: string | Uint8Array) => {
        log.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString());
        return true;
      });
    try {
      const code = await printLatestVersusCurrent({
        fetchFn: fetchFn as unknown as typeof fetch,
        loadStationConfig: () => mkStationConfig(),
      });
      expect(code).toBe(0);
      expect(log.join("")).toContain("Current: 0.2.0");
      expect(log.join("")).toContain("Latest: 0.2.5");
    } finally {
      stdoutWrite.mockRestore();
    }
  });

  it("returns 0 and stderr message when registry base is invalid", async () => {
    const stderr = { write: vi.fn() };
    const code = await printLatestVersusCurrent({
      stderr,
      loadStationConfig: () =>
        ({
          configuration: {
            version: "0.1.0",
            "agent-paths": {},
            "standard-catalog": { url: "https://example.com/" },
            "npm-registry-base-url": "http://insecure.example/",
          },
        }) as StationConfig,
      fetchFn: vi.fn() as unknown as typeof fetch,
    });
    expect(code).toBe(0);
    expect(String(stderr.write.mock.calls[0]?.[0])).toContain(
      "npm-registry-base-url"
    );
  });
});
