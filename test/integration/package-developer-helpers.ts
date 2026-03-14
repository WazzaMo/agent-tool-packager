/**
 * Shared helpers for package developer integration tests.
 * See docs/features/2-package-developer-support.md.
 */

import { expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";
import { runAtp } from "./test-helpers.js";

/** Run ATP with cwd and STATION_PATH set. */
export function atpCwd(
  pkgDir: string,
  stationDir: string
): { cwd: string; env: NodeJS.ProcessEnv } {
  return { cwd: pkgDir, env: { STATION_PATH: stationDir } };
}

/** Assert package exists in station user_packages with manifest and tar.gz. */
export function expectPackageInStation(
  stationDir: string,
  pkgName: string
): void {
  const pkgDir = path.join(stationDir, "user_packages", pkgName);
  expect(fs.existsSync(pkgDir)).toBe(true);
  expect(fs.existsSync(path.join(pkgDir, "atp-package.yaml"))).toBe(true);
  expect(fs.existsSync(path.join(pkgDir, "package.tar.gz"))).toBe(true);
}

export interface InitPackageOpts {
  type: string;
  name: string;
  version?: string;
  usage?: string;
  components?: string[];
  bundles?: { path: string; execFilter?: string }[];
  catalogAdd?: boolean;
}

/**
 * Initialize station, create skeleton, set package props, optionally add components/bundles.
 * If catalogAdd is true, runs catalog add package. Returns { stationDir, pkgDir }.
 */
export function initPackage(
  pkgDir: string,
  stationDir: string,
  opts: InitPackageOpts
): { stationDir: string; pkgDir: string } {
  const o = atpCwd(pkgDir, stationDir);
  runAtp(["station", "init"], o);
  runAtp(["create", "package", "skeleton"], o);
  runAtp(["package", "type", opts.type], o);
  runAtp(["package", "name", opts.name], o);
  runAtp(["package", "version", opts.version ?? "0.1.0"], o);
  runAtp(["package", "usage", opts.usage ?? "Test"], o);

  for (const c of opts.components ?? []) {
    runAtp(["package", "component", "add", c], o);
  }
  for (const b of opts.bundles ?? []) {
    if (b.execFilter) {
      runAtp(
        ["package", "bundle", "add", b.path, "--exec-filter", b.execFilter],
        o
      );
    } else {
      runAtp(["package", "bundle", "add", b.path], o);
    }
  }
  if (opts.catalogAdd) {
    runAtp(["catalog", "add", "package"], o);
  }
  return { stationDir, pkgDir };
}

/** Create temp dirs and set STATION_PATH. Clean up in afterEach with rmSync(base). */
export function createTempPackageEnv(prefix: string): {
  base: string;
  stationDir: string;
  pkgDir: string;
  origStationPath: string | undefined;
} {
  const base = path.join(os.tmpdir(), `${prefix}-${Date.now()}`);
  fs.mkdirSync(base, { recursive: true });
  const stationDir = path.join(base, "station");
  const pkgDir = path.join(base, "pkg");
  fs.mkdirSync(pkgDir, { recursive: true });
  const origStationPath = process.env.STATION_PATH;
  process.env.STATION_PATH = stationDir;
  return { base, stationDir, pkgDir, origStationPath };
}

/** Restore STATION_PATH and optionally remove base dir. */
export function cleanupTempPackageEnv(
  base: string,
  origStationPath: string | undefined
): void {
  process.env.STATION_PATH = origStationPath;
  try {
    fs.rmSync(base, { recursive: true });
  } catch {
    /* ignore */
  }
}

/** Full workflow: write files, init, set props, add components, catalog add. For Rule/Skill/Command/Experimental. */
export function setupPackageWorkflow(
  base: string,
  pkgName: string,
  pkgType: string,
  files: { path: string; content: string }[]
): { stationDir: string; pkgDir: string } {
  const stationDir = path.join(base, "test-station");
  const pkgDir = path.join(base, "pkg-dir");
  fs.mkdirSync(pkgDir, { recursive: true });

  for (const f of files) {
    fs.writeFileSync(path.join(pkgDir, f.path), f.content);
  }

  initPackage(pkgDir, stationDir, {
    type: pkgType,
    name: pkgName,
    usage: `Usage for ${pkgName}`,
    components: files.map((f) => f.path),
    catalogAdd: true,
  });
  return { stationDir, pkgDir };
}

/** List entries in stage.tar. */
export function listStageTar(pkgDir: string): string {
  return execSync(`tar -tf "${path.join(pkgDir, "stage.tar")}"`, {
    encoding: "utf8",
    cwd: pkgDir,
  });
}
