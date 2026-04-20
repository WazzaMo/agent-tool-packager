/**
 * Integration: `atp install --help` documents merged config paths including Gemini `settings.json`.
 */

import { describe, it, expect } from "vitest";

import { runAtpSpawn } from "./test-helpers.js";

describe("Integration: install --help", () => {
  it("mentions .gemini/settings.json alongside Cursor paths for --force-config and --skip-config", () => {
    const r = runAtpSpawn(["install", "--help"]);
    expect(r.status).toBe(0);
    const text = r.stdout + r.stderr;
    expect(text).toMatch(/\.gemini\/settings\.json/i);
    expect(text).toMatch(/\.cursor\/mcp\.json/i);
    expect(text).toMatch(/\.cursor\/hooks\.json/i);
    expect(text).toMatch(/--force-config/);
    expect(text).toMatch(/--skip-config/);
    expect(text).toMatch(/--verbose/);
  });
});
