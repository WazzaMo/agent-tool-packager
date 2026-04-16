/**
 * Unit tests: standalone `atp --latest` argv detection.
 */

import { describe, it, expect } from "vitest";

import { isStandaloneLatestArgv } from "../../src/cli/standalone-latest-argv.js";

function argv(...parts: string[]): string[] {
  return ["node", "atp", ...parts];
}

describe("isStandaloneLatestArgv", () => {
  it("returns true for only --latest", () => {
    expect(isStandaloneLatestArgv(argv("--latest"))).toBe(true);
  });

  it("returns true with extra unknown flags", () => {
    expect(isStandaloneLatestArgv(argv("--latest", "--foo"))).toBe(true);
  });

  it("returns false when a subcommand token is present", () => {
    expect(isStandaloneLatestArgv(argv("--latest", "station"))).toBe(false);
    expect(isStandaloneLatestArgv(argv("station", "--latest"))).toBe(false);
  });

  it("returns false without --latest", () => {
    expect(isStandaloneLatestArgv(argv("station", "init"))).toBe(false);
  });

  it("returns false when combined with --help", () => {
    expect(isStandaloneLatestArgv(argv("--latest", "--help"))).toBe(false);
    expect(isStandaloneLatestArgv(argv("--help", "--latest"))).toBe(false);
  });

  it("returns false when combined with --version", () => {
    expect(isStandaloneLatestArgv(argv("--latest", "--version"))).toBe(false);
  });
});
