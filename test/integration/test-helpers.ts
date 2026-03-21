/**
 * Common helpers for integration tests.
 */

import { expect } from "vitest";
import { execSync, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(__dirname, "../..");
export const CLI_PATH = path.join(PROJECT_ROOT, "dist", "atp.js");
export const FIXTURE_PKG = path.resolve(__dirname, "../fixtures/test-package");

/** Station atp-catalog.yaml body: nested standard + user object lists (see docs/configuration.md). */
export function makeStationCatalogYaml(
  userPackages: Array<{
    name: string;
    version: string;
    description?: string;
    location: string;
  }>,
  standardPackages: Array<{
    name: string;
    version: string;
    description?: string;
    location: string;
  }> = []
): string {
  const row = (e: (typeof userPackages)[0]) => {
    const o: Record<string, string> = {
      name: e.name,
      version: e.version,
      location: e.location,
    };
    if (e.description != null) {
      o.description = e.description;
    }
    return o;
  };
  return yaml.dump(
    {
      packages: {
        standard: standardPackages.map(row),
        user: userPackages.map(row),
      },
    },
    { lineWidth: 120 }
  );
}

/** Quote arg for shell if it contains space. */
function shellArgs(args: string[]): string {
  return args
    .map((a) => (a.includes(" ") || a.includes('"') ? `"${a.replace(/"/g, '\\"')}"` : a))
    .join(" ");
}

export function runAtp(args: string[], opts?: { cwd?: string; env?: NodeJS.ProcessEnv }): string {
  const env = { ...process.env, ...opts?.env };
  return execSync(`node "${CLI_PATH}" ${shellArgs(args)}`, {
    encoding: "utf8",
    cwd: opts?.cwd ?? PROJECT_ROOT,
    env,
  });
}

/**
 * Run ATP via spawn so stdout and stderr are captured separately (e.g. console.warn on stderr).
 */
export function runAtpSpawn(
  args: string[],
  opts?: { cwd?: string; env?: NodeJS.ProcessEnv }
): { stdout: string; stderr: string; status: number | null } {
  const env = { ...process.env, ...opts?.env };
  const r = spawnSync(process.execPath, [CLI_PATH, ...args], {
    cwd: opts?.cwd ?? PROJECT_ROOT,
    env,
    encoding: "utf8",
  });
  return {
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
    status: r.status,
  };
}

export function runAtpExpectExit(
  args: string[],
  expectedExit: number,
  opts?: { cwd?: string; env?: NodeJS.ProcessEnv }
): { stdout: string; stderr: string } {
  try {
    const stdout = execSync(`node "${CLI_PATH}" ${shellArgs(args)}`, {
      encoding: "utf8",
      cwd: opts?.cwd ?? PROJECT_ROOT,
      env: { ...process.env, ...opts?.env },
    });
    if (expectedExit !== 0) {
      expect.fail(`Expected exit ${expectedExit} but got 0. Output: ${stdout}`);
    }
    return { stdout, stderr: "" };
  } catch (err: unknown) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    if (e.status !== expectedExit) {
      throw err;
    }
    return {
      stdout: (e.stdout as string) ?? "",
      stderr: (e.stderr as string) ?? "",
    };
  }
}
