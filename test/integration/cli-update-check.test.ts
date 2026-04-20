/**
 * Integration: `atp --latest`, root `--help`, and `--version` behaviour for update checks.
 */

import { describe, it, expect } from "vitest";

import { runAtpSpawn } from "./test-helpers.js";

describe("Integration: CLI update check", () => {
  it("atp --latest exits 0 when ATP_SKIP_UPDATE_CHECK is set", () => {
    const r = runAtpSpawn(["--latest"], {
      env: { ...process.env, ATP_SKIP_UPDATE_CHECK: "1" },
    });
    expect(r.status).toBe(0);
    expect(r.stderr).toMatch(/skipped/i);
    expect(r.stderr).toMatch(/ATP_SKIP_UPDATE_CHECK/);
  });

  it("atp --version exits 0 with a semver-like line", () => {
    const r = runAtpSpawn(["--version"]);
    expect(r.status).toBe(0);
    const text = `${r.stdout}${r.stderr}`;
    expect(text).toMatch(/\d+\.\d+\.\d+/);
  });

  it("atp --help documents --latest on the root program", () => {
    const r = runAtpSpawn(["--help"]);
    expect(r.status).toBe(0);
    const text = `${r.stdout}${r.stderr}`;
    expect(text).toMatch(/--latest/);
  });
});
