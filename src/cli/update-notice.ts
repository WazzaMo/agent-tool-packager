/**
 * Optional npm registry check: stderr notice when a newer release exists, plus
 * `atp --latest` reporting.
 */

import fs from "node:fs";
import path from "node:path";

import semver from "semver";

import { loadStationConfig, stationExists } from "../config/load.js";
import { getStationPath } from "../config/paths.js";
import type { StationConfig } from "../config/station-config.js";
import { getNpmDistTagVersion } from "../registry/npm-latest-version.js";
import { resolveNpmRegistryBaseUrl } from "../registry/npm-registry-base-url.js";
import { atp_version } from "../version.js";

/** Published package identity queried on the registry (matches `package.json` name). */
export const ATP_NPM_PACKAGE_NAME = "@wazzamo-agent-tools/packager";

const THROTTLE_FILENAME = ".atp_last_registry_check";
const THROTTLE_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 3000;

type ThrottlePayload = {
  lastCheckEpochMs: number;
  lastSeenLatest?: string;
};

function isSkipUpdateCheckEnv(): boolean {
  const v = process.env.ATP_SKIP_UPDATE_CHECK?.trim();
  return v === "1" || /^true$/i.test(v ?? "");
}

function isVerboseUpdateCheckEnv(): boolean {
  return process.env.ATP_UPDATE_CHECK?.trim().toLowerCase() === "verbose";
}

/**
 * Skip background checks for dev builds (`0.0.0-dev` or any version ending in `-dev`).
 */
export function shouldSkipUpdateCheckForDevVersion(current: string): boolean {
  if (current === "0.0.0-dev") {
    return true;
  }
  if (current.endsWith("-dev")) {
    return true;
  }
  return false;
}

function argvIncludesHelpOrVersion(): boolean {
  const a = process.argv.slice(2);
  return a.some(
    (t) =>
      t === "--version" ||
      t === "-V" ||
      t === "--help" ||
      t === "-h"
  );
}

function readThrottle(stationPath: string): ThrottlePayload | null {
  const p = path.join(stationPath, THROTTLE_FILENAME);
  if (!fs.existsSync(p)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(p, "utf8");
    const o = JSON.parse(raw) as ThrottlePayload;
    if (typeof o?.lastCheckEpochMs !== "number" || !Number.isFinite(o.lastCheckEpochMs)) {
      return null;
    }
    return o;
  } catch {
    return null;
  }
}

function writeThrottle(stationPath: string, payload: ThrottlePayload): void {
  const p = path.join(stationPath, THROTTLE_FILENAME);
  fs.writeFileSync(p, `${JSON.stringify(payload)}\n`, "utf8");
}

function isThrottled(stationPath: string, nowMs: number): boolean {
  const t = readThrottle(stationPath);
  if (t == null) {
    return false;
  }
  return nowMs - t.lastCheckEpochMs < THROTTLE_MS;
}

/**
 * Compare published `latest` to the running build using semver ordering (same as npm).
 * Prerelease builds are still compared to the stable `latest` tag; dev builds are handled
 * elsewhere via {@link shouldSkipUpdateCheckForDevVersion}.
 */
export function isPublishedNewerThanCurrent(
  current: string,
  latest: string
): boolean {
  const c = semver.valid(current);
  const l = semver.valid(latest);
  if (c == null || l == null) {
    return false;
  }
  return semver.lt(c, l);
}

let ranBackgroundUpdateNotice = false;

/** Clears the once-per-process guard (Vitest only). */
export function resetBackgroundUpdateNoticeForTests(): void {
  ranBackgroundUpdateNotice = false;
}

export type UpdateNoticeDeps = {
  nowMs: () => number;
  fetchFn: typeof fetch;
  stderr: Pick<NodeJS.WriteStream, "write">;
  stdoutIsTTY: () => boolean;
  loadStationConfig: () => StationConfig | null;
  stationExists: () => boolean;
  getStationPath: () => string;
};

const defaultDeps: UpdateNoticeDeps = {
  nowMs: () => Date.now(),
  fetchFn: globalThis.fetch.bind(globalThis),
  stderr: process.stderr,
  stdoutIsTTY: () => process.stdout.isTTY === true,
  loadStationConfig,
  stationExists,
  getStationPath,
};

/**
 * Background path: one short registry read per throttle window; stderr notice when newer.
 */
export async function maybePrintUpdateNotice(
  deps: Partial<UpdateNoticeDeps> = {}
): Promise<void> {
  const d = { ...defaultDeps, ...deps };
  if (ranBackgroundUpdateNotice) {
    return;
  }
  ranBackgroundUpdateNotice = true;

  if (isSkipUpdateCheckEnv()) {
    return;
  }
  if (argvIncludesHelpOrVersion()) {
    return;
  }

  const current = atp_version();
  if (shouldSkipUpdateCheckForDevVersion(current)) {
    return;
  }

  if (!d.stationExists()) {
    return;
  }

  if (!d.stdoutIsTTY() && !isVerboseUpdateCheckEnv()) {
    return;
  }

  const stationPath = d.getStationPath();
  const nowMs = d.nowMs();
  if (isThrottled(stationPath, nowMs)) {
    return;
  }

  const stationConfig = d.loadStationConfig();
  const base = resolveNpmRegistryBaseUrl(stationConfig);
  if (base == null) {
    return;
  }

  const latest = await getNpmDistTagVersion(
    ATP_NPM_PACKAGE_NAME,
    "latest",
    base,
    { timeoutMs: FETCH_TIMEOUT_MS, fetchFn: d.fetchFn }
  );
  if (latest == null) {
    return;
  }

  writeThrottle(stationPath, { lastCheckEpochMs: nowMs, lastSeenLatest: latest });

  if (isPublishedNewerThanCurrent(current, latest)) {
    d.stderr.write(
      `A newer ATP is available: ${current} → ${latest}. Run \`npm i -g ${ATP_NPM_PACKAGE_NAME}\` (or your installer) to upgrade.\n`
    );
  }
}

/**
 * `atp --latest`: always query (no throttle), stdout-focused; never throws.
 *
 * @returns Process exit code (always 0).
 */
export async function printLatestVersusCurrent(
  deps: Partial<UpdateNoticeDeps> = {}
): Promise<number> {
  const d = { ...defaultDeps, ...deps };
  const current = atp_version();

  if (isSkipUpdateCheckEnv()) {
    d.stderr.write("Update check skipped (ATP_SKIP_UPDATE_CHECK is set).\n");
    return 0;
  }

  const stationConfig = d.loadStationConfig();
  const base = resolveNpmRegistryBaseUrl(stationConfig);
  if (base == null) {
    d.stderr.write(
      "Could not use npm-registry-base-url from Station config (HTTPS origin required).\n"
    );
    return 0;
  }

  const latest = await getNpmDistTagVersion(
    ATP_NPM_PACKAGE_NAME,
    "latest",
    base,
    { timeoutMs: FETCH_TIMEOUT_MS, fetchFn: d.fetchFn }
  );
  if (latest == null) {
    d.stderr.write(
      "Could not read the latest version from the npm registry (offline, timeout, or error).\n"
    );
    return 0;
  }

  process.stdout.write(`Current: ${current}\nLatest: ${latest}\n`);
  return 0;
}
