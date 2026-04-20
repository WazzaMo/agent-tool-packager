/**
 * Unit tests: provider InstallContext agent id normalisation.
 */

import { describe, it, expect } from "vitest";

import { isProviderAgentId, normaliseAgentId } from "../../src/file-ops/install-context.js";

describe("isProviderAgentId", () => {
  it("is true for supported ids case-insensitively", () => {
    expect(isProviderAgentId("cursor")).toBe(true);
    expect(isProviderAgentId("Gemini")).toBe(true);
  });

  it("is false for agents without a provider", () => {
    expect(isProviderAgentId("kiro")).toBe(false);
    expect(isProviderAgentId("OpenCode")).toBe(false);
  });
});

describe("normaliseAgentId", () => {
  it.each([
    ["cursor", "cursor"],
    ["CURSOR", "cursor"],
    [" claude ", "claude"],
    ["Gemini", "gemini"],
    ["CoDeX", "codex"],
  ] as const)("maps %s to %s", (raw, id) => {
    expect(normaliseAgentId(raw)).toBe(id);
  });

  it("throws for unsupported agents", () => {
    expect(() => normaliseAgentId("kiro")).toThrow(/Unsupported agent/);
    expect(() => normaliseAgentId("OpenCode")).toThrow(/Unsupported agent/);
    expect(() => normaliseAgentId("")).toThrow(/Unsupported agent/);
  });
});
