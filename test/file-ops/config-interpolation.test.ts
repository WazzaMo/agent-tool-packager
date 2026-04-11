/**
 * Unit tests: {@link config-interpolation} (op **10** helpers).
 */

import { describe, it, expect } from "vitest";

import {
  collectInterpolationIssuesInJson,
  normalizeWorkspaceVariableString,
  normalizeWorkspaceVariablesInJson,
  validateInterpolationPlaceholdersInString,
} from "../../src/file-ops/interpolation/config-interpolation.js";

describe("config-interpolation", () => {
  it("validateInterpolationPlaceholdersInString rejects unclosed ${", () => {
    expect(validateInterpolationPlaceholdersInString('echo "${HOME')).toMatch(/unclosed/);
  });

  it("validateInterpolationPlaceholdersInString rejects empty ${}", () => {
    expect(validateInterpolationPlaceholdersInString("x ${} y")).toMatch(/empty/);
  });

  it("validateInterpolationPlaceholdersInString accepts balanced placeholders", () => {
    expect(validateInterpolationPlaceholdersInString("${workspaceFolder}/x")).toBeNull();
  });

  it("collectInterpolationIssuesInJson walks nested objects", () => {
    const issues = collectInterpolationIssuesInJson({
      a: { b: "bad ${" },
    });
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.some((m) => m.includes("unclosed"))).toBe(true);
  });

  it("normalizeWorkspaceVariableString maps workspaceRoot to workspaceFolder", () => {
    expect(normalizeWorkspaceVariableString("${workspaceRoot}/p")).toBe("${workspaceFolder}/p");
  });

  it("normalizeWorkspaceVariablesInJson clones and reports changed", () => {
    const input = { cmd: "node", args: ["${workspaceRoot}/tool.js"] };
    const { doc, changed } = normalizeWorkspaceVariablesInJson(input);
    expect(changed).toBe(true);
    expect((doc as { args: string[] }).args[0]).toBe("${workspaceFolder}/tool.js");
    expect(input.args[0]).toBe("${workspaceRoot}/tool.js");
  });
});
