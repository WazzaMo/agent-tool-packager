/**
 * Catalog asset enrichment: Skill parts pick up bundle files for install-time assembly.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  appendSkillFilesFromBundleTree,
  collectProgramRelPathsSet,
  enrichMultiTypePackageAssets,
  enrichSingleTypePackageAssets,
} from "../../src/package/catalog-asset-enrichment.js";

import type { DevPackageManifest } from "../../src/package/types.js";

describe("catalog-asset-enrichment skill bundles", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "atp-enrich-skill-"));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("enrichMultiType: Skill part + skip-exec bundle emits skill rows for yaml/md tree", () => {
    const skillDir = path.join(tmp, "part_1_Skill", "doc-writing");
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(path.join(skillDir, "skill.yaml"), "name: doc-writing\ndescription: D\n");
    fs.writeFileSync(path.join(skillDir, "skill.md"), "Body\n");

    const manifest: DevPackageManifest = {
      name: "Example skills pack",
      type: "Multi",
      version: "0.1.0",
      usage: [],
      components: [],
      parts: [
        {
          type: "Skill",
          usage: ["Writing markdown documents"],
          bundles: [{ path: "doc-writing", "skip-exec": true }],
        },
      ],
    };

    const rows = enrichMultiTypePackageAssets(tmp, manifest);
    const skillRows = rows.filter((r) => r.type === "skill").map((r) => r.path).sort();
    expect(skillRows).toEqual([
      "part_1_Skill/doc-writing/skill.md",
      "part_1_Skill/doc-writing/skill.yaml",
    ]);
    expect(rows.filter((r) => r.type === "program")).toEqual([]);
  });

  it("enrichMultiType: programs under bin/ are not duplicated as skill assets", () => {
    const root = path.join(tmp, "part_1_Skill", "my-skill");
    fs.mkdirSync(path.join(root, "bin"), { recursive: true });
    fs.writeFileSync(path.join(root, "skill.yaml"), "name: my-skill\ndescription: D\n");
    fs.writeFileSync(path.join(root, "skill.md"), "Hi\n");
    fs.writeFileSync(path.join(root, "bin", "tool.js"), "#!/usr/bin/env node\n");

    const manifest: DevPackageManifest = {
      name: "pkg",
      type: "Multi",
      version: "1.0.0",
      usage: [],
      components: [],
      parts: [
        {
          type: "Skill",
          usage: ["U"],
          bundles: ["my-skill"],
        },
      ],
    };

    const rows = enrichMultiTypePackageAssets(tmp, manifest);
    const programs = rows.filter((r) => r.type === "program").map((r) => r.path);
    expect(programs).toEqual(["part_1_Skill/my-skill/bin/tool.js"]);
    const skills = rows.filter((r) => r.type === "skill").map((r) => r.path).sort();
    expect(skills).toEqual(["part_1_Skill/my-skill/skill.md", "part_1_Skill/my-skill/skill.yaml"]);
  });

  it("enrichMultiType: explicit component paths are not duplicated by bundle walk", () => {
    const skillDir = path.join(tmp, "part_1_Skill", "b");
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(path.join(skillDir, "skill.yaml"), "name: b\ndescription: D\n");
    fs.writeFileSync(path.join(skillDir, "skill.md"), "B\n");

    const manifest: DevPackageManifest = {
      name: "pkg",
      type: "Multi",
      version: "1.0.0",
      usage: [],
      components: [],
      parts: [
        {
          type: "Skill",
          usage: ["U"],
          components: ["b/skill.md", "b/skill.yaml"],
          bundles: [{ path: "b", "skip-exec": true }],
        },
      ],
    };

    const rows = enrichMultiTypePackageAssets(tmp, manifest);
    const md = rows.filter((r) => r.path.endsWith("skill.md"));
    const yml = rows.filter((r) => r.path.endsWith("skill.yaml"));
    expect(md).toHaveLength(1);
    expect(yml).toHaveLength(1);
  });

  it("enrichSingleType: Skill root package enlists bundle files when skip-exec", () => {
    fs.mkdirSync(path.join(tmp, "notes"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "notes", "skill.yaml"), "name: notes\ndescription: D\n");
    fs.writeFileSync(path.join(tmp, "notes", "skill.md"), "N\n");

    const manifest: DevPackageManifest = {
      name: "s",
      type: "Skill",
      version: "1.0.0",
      usage: ["U"],
      components: [],
      bundles: [{ path: "notes", "skip-exec": true }],
    };

    const rows = enrichSingleTypePackageAssets(
      tmp,
      {
        components: [],
        bundles: manifest.bundles,
      },
      manifest
    );
    const skillPaths = rows.filter((r) => r.type === "skill").map((r) => r.path).sort();
    expect(skillPaths).toEqual(["notes/skill.md", "notes/skill.yaml"]);
  });

  it("collectProgramRelPathsSet matches appendProgram rows for exec-filter", () => {
    fs.mkdirSync(path.join(tmp, "part_2_Mcp", "vecfs-ts", "bin"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "part_2_Mcp", "vecfs-ts", "bin", "mcp.js"), "x");

    const rel = "part_2_Mcp/vecfs-ts";
    const glob = "part_2_Mcp/vecfs-ts/bin/*";
    const set = collectProgramRelPathsSet(tmp, rel, glob);
    expect([...set].sort()).toEqual(["part_2_Mcp/vecfs-ts/bin/mcp.js"]);
  });

  it("appendSkillFilesFromBundleTree copies nested scripts for raw install", () => {
    const bundleRoot = path.join(tmp, "part_1_Skill", "k");
    fs.mkdirSync(path.join(bundleRoot, "scripts"), { recursive: true });
    fs.writeFileSync(path.join(bundleRoot, "skill.yaml"), "name: k\ndescription: D\n");
    fs.writeFileSync(path.join(bundleRoot, "skill.md"), "Use scripts.\n");
    fs.writeFileSync(path.join(bundleRoot, "scripts", "tool.sh"), "#!/bin/sh\n");

    const assets: { path: string; type: string; name: string }[] = [];
    const seen = new Set<string>();
    appendSkillFilesFromBundleTree(
      assets,
      tmp,
      "part_1_Skill/k",
      new Set(),
      seen
    );
    const paths = assets.map((a) => a.path).sort();
    expect(paths).toEqual([
      "part_1_Skill/k/scripts/tool.sh",
      "part_1_Skill/k/skill.md",
      "part_1_Skill/k/skill.yaml",
    ]);
  });
});
