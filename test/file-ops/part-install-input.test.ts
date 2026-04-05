/**
 * Unit tests: staged vs resolved part install inputs (Feature 5 / align plan).
 */

import { describe, it, expect } from "vitest";
import path from "node:path";
import os from "node:os";

import type { PackageManifest } from "../../src/install/types.js";
import {
  buildStagedPartInstallInputs,
  resolveStagedPartToAbsolute,
  StagedPartInstallInput,
  ResolvedInstallInput,
} from "../../src/file-ops/part-install-input.js";

describe("part-install-input", () => {
  it("legacy manifest yields one synthetic part at index 1 with root type as PartKind", () => {
    const manifest: PackageManifest = {
      name: "legacy-pkg",
      type: "Rule",
      assets: [{ path: "skills/doc.md", type: "skill", name: "doc" }],
    };
    const staging = path.join(os.tmpdir(), "atp-st-legacy");
    const staged = buildStagedPartInstallInputs(manifest, staging);
    expect(staged).toHaveLength(1);
    expect(staged[0].partIndex).toBe(1);
    expect(staged[0].partKind).toBe("Rule");
    expect(staged[0].isResolvedAbsolutePaths).toBe(false);
    expect(staged[0].packagePaths).toEqual(["skills/doc.md"]);
    expect(staged[0].getStagingRelPaths()).toEqual(["skills/doc.md"]);
  });

  it("multi-part manifest maps assets under part_N_Type prefixes to matching parts", () => {
    const manifest: PackageManifest = {
      name: "multi-pkg",
      type: "Multi",
      parts: [
        { type: "Skill", usage: [], components: ["SKILL.md"] },
        { type: "Mcp", usage: [], bundles: ["vecfs-ts"] },
      ],
      assets: [
        { path: "part_1_Skill/SKILL.md", type: "skill", name: "SKILL" },
        { path: "part_2_Mcp/vecfs-ts/bin/mcp.js", type: "program", name: "mcp" },
      ],
    };
    const staging = "/tmp/stage";
    const staged = buildStagedPartInstallInputs(manifest, staging);
    expect(staged).toHaveLength(2);
    expect(staged[0].partIndex).toBe(1);
    expect(staged[0].partKind).toBe("Skill");
    expect(staged[0].packagePaths).toEqual(["part_1_Skill/SKILL.md"]);
    expect(staged[1].partIndex).toBe(2);
    expect(staged[1].partKind).toBe("Mcp");
    expect(staged[1].packagePaths).toEqual(["part_2_Mcp/vecfs-ts/bin/mcp.js"]);
  });

  it("resolveStagedPartToAbsolute joins stagingDir with package-relative paths", () => {
    const stagingDir = path.join(os.tmpdir(), "atp-abs");
    const staged = new StagedPartInstallInput({
      partIndex: 1,
      partKind: "Skill",
      stagingRelPaths: ["part_1_Skill/A.md"],
      stagingDir,
    });
    const resolved = resolveStagedPartToAbsolute(staged);
    expect(resolved).toBeInstanceOf(ResolvedInstallInput);
    expect(resolved.isResolvedAbsolutePaths).toBe(true);
    expect(resolved.partIndex).toBe(1);
    expect(resolved.partKind).toBe("Skill");
    expect(resolved.packagePaths).toEqual([path.join(stagingDir, "part_1_Skill/A.md")]);
    expect(resolved.getAgentResolvedPaths()).toEqual(resolved.packagePaths);
  });
});
