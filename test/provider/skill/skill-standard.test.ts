/**
 * Unit tests: shared Agent Skills helpers under {@link src/provider/skill}.
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { assembleSkillMdFromPartials } from "../../../src/provider/skill/assemble-skill-md.js";
import {
  SkillFrontmatterError,
  normaliseSkillYamlDocument,
} from "../../../src/provider/skill/normalize-skill-frontmatter.js";
import { patchSkillScriptsPlaceholder } from "../../../src/provider/skill/patch-skill-placeholders.js";
import { buildSkillInstallProviderActions } from "../../../src/provider/skill/plan-skill-install.js";
import {
  resolvePrimarySkillSource,
  isAssembledSkillMdBasename,
  isPartialSkillMdBasename,
} from "../../../src/provider/skill/resolve-primary-skill-source.js";
import { finalizeSkillMdContent } from "../../../src/provider/skill/finalize-skill-md.js";
import {
  longestCommonPathPrefix,
  resolveSkillBundleRoot,
  relativeToSkillBundle,
} from "../../../src/provider/skill/skill-bundle-root.js";
import { trySplitSkillFrontmatter } from "../../../src/provider/skill/split-skill-md.js";

describe("skill-bundle-root", () => {
  it("resolveSkillBundleRoot uses dirname for a single path", () => {
    expect(resolveSkillBundleRoot(["part_1_Skill/SKILL.md"])).toBe("part_1_Skill");
    expect(resolveSkillBundleRoot(["skills/x.md"])).toBe("skills");
    expect(resolveSkillBundleRoot(["SKILL.md"])).toBe("");
  });

  it("longestCommonPathPrefix finds shared directory", () => {
    expect(longestCommonPathPrefix(["a/b/c", "a/b/d"])).toBe("a/b");
    expect(longestCommonPathPrefix(["part/SKILL.md", "part/scripts/x.sh"])).toBe("part");
  });

  it("relativeToSkillBundle strips the bundle root", () => {
    expect(relativeToSkillBundle("part", "part/scripts/run.sh")).toBe("scripts/run.sh");
    expect(relativeToSkillBundle("", "SKILL.md")).toBe("SKILL.md");
  });
});

describe("normalize-skill-frontmatter", () => {
  it("strips allowed-tools and validates lengths", () => {
    const y = `name: n
description: d
allowed-tools: bash grep
`;
    const o = normaliseSkillYamlDocument(y);
    expect(o["allowed-tools"]).toBeUndefined();
    expect(o.name).toBe("n");
  });

  it("rejects missing description", () => {
    expect(() => normaliseSkillYamlDocument("name: only")).toThrow(SkillFrontmatterError);
  });

  it("rejects oversized name", () => {
    const n = "x".repeat(65);
    expect(() =>
      normaliseSkillYamlDocument(`name: ${n}\ndescription: ok`)
    ).toThrow(SkillFrontmatterError);
  });

  it("validates metadata string values only", () => {
    expect(() =>
      normaliseSkillYamlDocument(`name: a\ndescription: b\nmetadata:\n  k: 1`)
    ).toThrow(SkillFrontmatterError);
  });
});

describe("assemble-skill-md", () => {
  it("joins yaml and body into SKILL.md", () => {
    const out = assembleSkillMdFromPartials(
      "name: demo\ndescription: Demo skill\n",
      "## Body\n\nHello.\n"
    );
    expect(out.startsWith("---\n")).toBe(true);
    expect(out).toContain("name: demo");
    expect(out).toContain("## Body");
  });
});

describe("patchSkillScriptsPlaceholder", () => {
  it("replaces {skill_scripts}/", () => {
    expect(patchSkillScriptsPlaceholder("Run {skill_scripts}/x.py", "scripts")).toBe("Run scripts/x.py");
  });
});

describe("trySplitSkillFrontmatter", () => {
  it("splits standard SKILL.md", () => {
    const s = trySplitSkillFrontmatter("---\na: 1\n---\n\n# Hi\n");
    expect(s?.yaml).toContain("a: 1");
    expect(s?.body.trim()).toBe("# Hi");
  });
});

describe("resolvePrimarySkillSource", () => {
  it("classifies assembled vs partial basenames", () => {
    expect(isPartialSkillMdBasename("skill.md")).toBe(true);
    expect(isPartialSkillMdBasename("SKILL.md")).toBe(false);
    expect(isAssembledSkillMdBasename("SKILL.md")).toBe(true);
    expect(isAssembledSkillMdBasename("skill.md")).toBe(false);
  });

  it("reads partials from staging", () => {
    const tmp = path.join(os.tmpdir(), `atp-skill-src-${Date.now()}`);
    fs.mkdirSync(tmp, { recursive: true });
    fs.writeFileSync(path.join(tmp, "skill.yaml"), "name: z\ndescription: d\n");
    fs.writeFileSync(path.join(tmp, "skill.md"), "# Body\n");
    const r = resolvePrimarySkillSource(tmp, "", [
      { path: "skill.yaml", type: "skill", name: "y" },
      { path: "skill.md", type: "skill", name: "y" },
    ]);
    expect(r.skillMdUtf8).toContain("name: z");
    expect(r.skillMdUtf8).toContain("# Body");
    expect(r.consumedRelPaths.has("skill.yaml")).toBe(true);
    fs.rmSync(tmp, { recursive: true });
  });
});

describe("finalizeSkillMdContent", () => {
  it("synthesises frontmatter when missing", () => {
    const { content, skillDirName } = finalizeSkillMdContent("# Only body\n", "my-skill");
    expect(skillDirName).toBe("my-skill");
    expect(content).toContain("name: my-skill");
    expect(content).toContain("# Only body");
  });
});

describe("buildSkillInstallProviderActions", () => {
  it("emits SKILL.md plus raw copies for sibling files", () => {
    const tmp = path.join(os.tmpdir(), `atp-skill-plan-${Date.now()}`);
    fs.mkdirSync(tmp, { recursive: true });
    fs.writeFileSync(
      path.join(tmp, "skill.yaml"),
      "name: bundle-skill\ndescription: Has extras\n"
    );
    fs.writeFileSync(path.join(tmp, "skill.md"), "Use {skill_scripts}/tool.sh.\n");
    fs.mkdirSync(path.join(tmp, "scripts"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "scripts", "tool.sh"), "#!/bin/sh\necho ok\n");

    const layerRoot = path.join(tmp, "layer");
    fs.mkdirSync(layerRoot, { recursive: true });

    const actions = buildSkillInstallProviderActions(
      { stagingDir: tmp, layerRoot },
      { partIndex: 1, partKind: "Skill" },
      [
        { path: "skill.yaml", type: "skill", name: "skill" },
        { path: "skill.md", type: "skill", name: "skill" },
        { path: "scripts/tool.sh", type: "skill", name: "tool" },
      ],
      { name: "pkg", version: "1.0.0" }
    );

    expect(actions).toHaveLength(2);
    expect(actions[0].kind).toBe("plain_markdown_write");
    if (actions[0].kind === "plain_markdown_write") {
      expect(actions[0].relativeTargetPath).toBe("skills/bundle-skill/SKILL.md");
      expect(actions[0].content).toContain("scripts/tool.sh");
    }
    expect(actions[1].kind).toBe("raw_file_copy");
    if (actions[1].kind === "raw_file_copy") {
      expect(actions[1].relativeTargetPath).toBe("skills/bundle-skill/scripts/tool.sh");
    }

    fs.rmSync(tmp, { recursive: true });
  });
});
