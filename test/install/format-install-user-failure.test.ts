/**
 * Unit tests: {@link formatInstallUserFailureLines}, {@link mergeAmbiguityVerboseRequested}.
 */

import { describe, it, expect, afterEach } from "vitest";

import { HooksMergeAmbiguousError } from "../../src/file-ops/hooks-merge/errors.js";
import { McpMergeAmbiguousError } from "../../src/file-ops/mcp-merge/errors.js";
import {
  MERGE_CONFIG_AMBIGUITY_HINT,
  formatInstallUserFailureLines,
  mergeAmbiguityVerboseRequested,
} from "../../src/install/format-install-user-failure.js";

describe("formatInstallUserFailureLines", () => {
  it("adds hint after MCP merge ambiguity message", () => {
    const err = new McpMergeAmbiguousError(
      "srv",
      { a: 1 },
      { b: 2 },
      ".cursor/mcp.json"
    );
    expect(formatInstallUserFailureLines(err, false)).toEqual([
      err.message,
      MERGE_CONFIG_AMBIGUITY_HINT,
    ]);
  });

  it("inserts JSON between message and hint when verbose", () => {
    const err = new HooksMergeAmbiguousError(
      "evt",
      "id:x",
      { command: "a" },
      { command: "b" },
      ".cursor/hooks.json"
    );
    const lines = formatInstallUserFailureLines(err, true);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe(err.message);
    expect(JSON.parse(lines[1]!)).toEqual({
      code: "HOOKS_MERGE_AMBIGUOUS",
      eventName: "evt",
      dedupeKey: "id:x",
      mergeTargetLabel: ".cursor/hooks.json",
    });
    expect(lines[2]).toBe(MERGE_CONFIG_AMBIGUITY_HINT);
  });

  it("stringifies unknown errors", () => {
    expect(formatInstallUserFailureLines(new Error("x"), false)).toEqual(["Error: x"]);
  });
});

describe("mergeAmbiguityVerboseRequested", () => {
  const prev = process.env.DEBUG;

  afterEach(() => {
    if (prev === undefined) {
      delete process.env.DEBUG;
    } else {
      process.env.DEBUG = prev;
    }
  });

  it("is true when the verbose flag is set", () => {
    expect(mergeAmbiguityVerboseRequested(true)).toBe(true);
    expect(mergeAmbiguityVerboseRequested(false)).toBe(false);
  });

  it("is true when DEBUG lists atp", () => {
    process.env.DEBUG = "foo,atp,bar";
    expect(mergeAmbiguityVerboseRequested(false)).toBe(true);
  });
});
