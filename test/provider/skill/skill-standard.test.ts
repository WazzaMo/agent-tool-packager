/**
 * Unit tests: shared Agent Skills helpers under {@link src/provider/skill}.
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { assembleSkillMdFromPartials } from "../../../src/provider/skill/assemble-skill-md.js";
import {
  SKILL_COMPATIBILITY_MAX_LEN,
  SKILL_DESCRIPTION_MAX_LEN,
} from "../../../src/provider/skill/constants.js";
import {
  assertSafeSkillDirectoryName,
  finalizeSkillMdContent,
} from "../../../src/provider/skill/finalize-skill-md.js";
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
  isSkillYamlBasename,
} from "../../../src/provider/skill/resolve-primary-skill-source.js";
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

  it("accepts description at max length", () => {
    const d = "x".repeat(SKILL_DESCRIPTION_MAX_LEN);
    const o = normaliseSkillYamlDocument(`name: a\ndescription: ${d}`);
    expect(String(o.description)).toHaveLength(SKILL_DESCRIPTION_MAX_LEN);
  });

  it("rejects description over max length", () => {
    const d = "x".repeat(SKILL_DESCRIPTION_MAX_LEN + 1);
    expect(() => normaliseSkillYamlDocument(`name: a\ndescription: ${d}`)).toThrow(SkillFrontmatterError);
  });

  it("accepts compatibility at max length", () => {
    const c = "y".repeat(SKILL_COMPATIBILITY_MAX_LEN);
    const o = normaliseSkillYamlDocument(`name: a\ndescription: b\ncompatibility: ${c}`);
    expect(String(o.compatibility)).toHaveLength(SKILL_COMPATIBILITY_MAX_LEN);
  });

  it("rejects compatibility over max length", () => {
    const c = "y".repeat(SKILL_COMPATIBILITY_MAX_LEN + 1);
    expect(() =>
      normaliseSkillYamlDocument(`name: a\ndescription: b\ncompatibility: ${c}`)
    ).toThrow(SkillFrontmatterError);
  });

  it("rejects non-string compatibility", () => {
    expect(() =>
      normaliseSkillYamlDocument("name: a\ndescription: b\ncompatibility: 42")
    ).toThrow(SkillFrontmatterError);
  });

  it("accepts valid metadata map with string values", () => {
    const o = normaliseSkillYamlDocument(`name: a
description: b
metadata:
  author: org
  version: "1.0"
`);
    expect(o.metadata).toEqual({ author: "org", version: "1.0" });
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

describe("isSkillYamlBasename", () => {
  it("treats skill.yml as an alias of skill.yaml", () => {
    expect(isSkillYamlBasename("skill.yml")).toBe(true);
    expect(isSkillYamlBasename("skill.yaml")).toBe(true);
    expect(isSkillYamlBasename("Skill.YAML")).toBe(true);
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

  it("accepts skill.yml with skill.md partials", () => {
    const tmp = path.join(os.tmpdir(), `atp-skill-yml-${Date.now()}`);
    fs.mkdirSync(tmp, { recursive: true });
    fs.writeFileSync(path.join(tmp, "skill.yml"), "name: yml-skill\ndescription: from yml\n");
    fs.writeFileSync(path.join(tmp, "skill.md"), "# Yml body\n");
    const r = resolvePrimarySkillSource(tmp, "", [
      { path: "skill.yml", type: "skill", name: "y" },
      { path: "skill.md", type: "skill", name: "y" },
    ]);
    expect(r.skillMdUtf8).toContain("name: yml-skill");
    expect(r.consumedRelPaths.has("skill.yml")).toBe(true);
    fs.rmSync(tmp, { recursive: true });
  });

  it("rejects skill.yaml without companion skill.md", () => {
    const tmp = path.join(os.tmpdir(), `atp-skill-yonly-${Date.now()}`);
    fs.mkdirSync(tmp, { recursive: true });
    fs.writeFileSync(path.join(tmp, "skill.yaml"), "name: x\ndescription: d\n");
    expect(() =>
      resolvePrimarySkillSource(tmp, "", [{ path: "skill.yaml", type: "skill", name: "x" }])
    ).toThrow(/skill\.md|companion/i);
    fs.rmSync(tmp, { recursive: true });
  });

  it("rejects skill.md partial without skill.yaml or skill.yml", () => {
    const tmp = path.join(os.tmpdir(), `atp-skill-monly-${Date.now()}`);
    fs.mkdirSync(tmp, { recursive: true });
    fs.writeFileSync(path.join(tmp, "skill.md"), "# orphan\n");
    expect(() =>
      resolvePrimarySkillSource(tmp, "", [{ path: "skill.md", type: "skill", name: "x" }])
    ).toThrow(/exactly one skill\.yaml/i);
    fs.rmSync(tmp, { recursive: true });
  });

  it("rejects mixing assembled SKILL.md with skill.yaml", () => {
    const tmp = path.join(os.tmpdir(), `atp-skill-mix-${Date.now()}`);
    fs.mkdirSync(tmp, { recursive: true });
    fs.writeFileSync(
      path.join(tmp, "SKILL.md"),
      "---\nname: a\ndescription: b\n---\n\n# OK\n"
    );
    fs.writeFileSync(path.join(tmp, "skill.yaml"), "name: x\ndescription: y\n");
    expect(() =>
      resolvePrimarySkillSource(tmp, "", [
        { path: "SKILL.md", type: "skill", name: "a" },
        { path: "skill.yaml", type: "skill", name: "b" },
      ])
    ).toThrow(/cannot mix SKILL\.md/i);
    fs.rmSync(tmp, { recursive: true });
  });

  it("rejects two skill.yaml / skill.yml documents in one bundle", () => {
    const tmp = path.join(os.tmpdir(), `atp-skill-2y-${Date.now()}`);
    fs.mkdirSync(tmp, { recursive: true });
    fs.writeFileSync(path.join(tmp, "skill.yaml"), "name: a\ndescription: d\n");
    fs.writeFileSync(path.join(tmp, "skill.yml"), "name: b\ndescription: d\n");
    fs.writeFileSync(path.join(tmp, "skill.md"), "# b\n");
    expect(() =>
      resolvePrimarySkillSource(tmp, "", [
        { path: "skill.yaml", type: "skill", name: "1" },
        { path: "skill.yml", type: "skill", name: "2" },
        { path: "skill.md", type: "skill", name: "3" },
      ])
    ).toThrow(/exactly one skill\.yaml/i);
    fs.rmSync(tmp, { recursive: true });
  });

  it("rejects multiple markdown files when disambiguation is unclear", () => {
    const tmp = path.join(os.tmpdir(), `atp-skill-2md-${Date.now()}`);
    fs.mkdirSync(tmp, { recursive: true });
    fs.writeFileSync(path.join(tmp, "a.md"), "# A\n");
    fs.writeFileSync(path.join(tmp, "b.md"), "# B\n");
    expect(() =>
      resolvePrimarySkillSource(tmp, "", [
        { path: "a.md", type: "skill", name: "a" },
        { path: "b.md", type: "skill", name: "b" },
      ])
    ).toThrow(/multiple markdown files/i);
    fs.rmSync(tmp, { recursive: true });
  });

  it("rejects bundle with no markdown or yaml skill sources", () => {
    const tmp = path.join(os.tmpdir(), `atp-skill-py-${Date.now()}`);
    fs.mkdirSync(tmp, { recursive: true });
    fs.writeFileSync(path.join(tmp, "helper.py"), "print(1)\n");
    expect(() =>
      resolvePrimarySkillSource(tmp, "", [{ path: "helper.py", type: "skill", name: "h" }])
    ).toThrow(/need SKILL\.md|skill\.yaml/i);
    fs.rmSync(tmp, { recursive: true });
  });

  it("rejects more than one assembled SKILL.md in the same bundle", () => {
    const tmp = path.join(os.tmpdir(), `atp-skill-2SKILL-${Date.now()}`);
    fs.mkdirSync(tmp, { recursive: true });
    fs.mkdirSync(path.join(tmp, "a"), { recursive: true });
    fs.mkdirSync(path.join(tmp, "b"), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, "a", "SKILL.md"),
      "---\nname: a\ndescription: d\n---\n\n# A\n"
    );
    fs.writeFileSync(
      path.join(tmp, "b", "SKILL.md"),
      "---\nname: b\ndescription: d\n---\n\n# B\n"
    );
    expect(() =>
      resolvePrimarySkillSource(tmp, "", [
        { path: "a/SKILL.md", type: "skill", name: "a" },
        { path: "b/SKILL.md", type: "skill", name: "b" },
      ])
    ).toThrow(/at most one SKILL\.md/i);
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

  it("rejects skill name that contains path segments", () => {
    const raw = "---\nname: evil/name\ndescription: bad\n---\n\n# X\n";
    expect(() => finalizeSkillMdContent(raw, "fallback")).toThrow(SkillFrontmatterError);
    expect(() => finalizeSkillMdContent(raw, "fallback")).toThrow(/path segments/i);
  });
});

describe("assertSafeSkillDirectoryName", () => {
  it("returns trimmed safe names", () => {
    expect(assertSafeSkillDirectoryName("  pdf-kit  ")).toBe("pdf-kit");
  });

  it("rejects empty names", () => {
    expect(() => assertSafeSkillDirectoryName("   ")).toThrow(SkillFrontmatterError);
  });

  it("rejects path-like names", () => {
    expect(() => assertSafeSkillDirectoryName("a/b")).toThrow(SkillFrontmatterError);
    expect(() => assertSafeSkillDirectoryName("..")).toThrow(SkillFrontmatterError);
    expect(() => assertSafeSkillDirectoryName("x\\y")).toThrow(SkillFrontmatterError);
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

  it("emits Codex-style paths under project .agents/skills when pathOptions set", () => {
    const tmp = path.join(os.tmpdir(), `atp-skill-codex-${Date.now()}`);
    fs.mkdirSync(tmp, { recursive: true });
    fs.writeFileSync(
      path.join(tmp, "SKILL.md"),
      "---\nname: codex-skill\ndescription: D\n---\n\n# Hi\n"
    );
    const layerRoot = path.join(tmp, ".codex");
    const projectRoot = path.join(tmp, "repo");
    fs.mkdirSync(layerRoot, { recursive: true });
    fs.mkdirSync(projectRoot, { recursive: true });

    const actions = buildSkillInstallProviderActions(
      { stagingDir: tmp, layerRoot, projectRoot },
      { partIndex: 1, partKind: "Skill" },
      [{ path: "SKILL.md", type: "skill", name: "c" }],
      { name: "pkg", version: "1.0.0" },
      undefined,
      { destinationRoot: "project", skillsParentRelative: ".agents/skills" }
    );

    expect(actions).toHaveLength(1);
    const a = actions[0];
    expect(a.kind).toBe("plain_markdown_write");
    if (a.kind === "plain_markdown_write") {
      expect(a.relativeTargetPath).toBe(".agents/skills/codex-skill/SKILL.md");
      expect(a.destinationRoot).toBe("project");
    }

    fs.rmSync(tmp, { recursive: true });
  });

  it("throws when assembled SKILL.md frontmatter exceeds spec (install-time guard)", () => {
    const tmp = path.join(os.tmpdir(), `atp-skill-inv-${Date.now()}`);
    fs.mkdirSync(tmp, { recursive: true });
    const badDesc = "x".repeat(SKILL_DESCRIPTION_MAX_LEN + 1);
    fs.writeFileSync(
      path.join(tmp, "SKILL.md"),
      `---\nname: bad\ndescription: ${badDesc}\n---\n\n# Nope\n`
    );
    const layerRoot = path.join(tmp, "layer");
    fs.mkdirSync(layerRoot, { recursive: true });
    expect(() =>
      buildSkillInstallProviderActions(
        { stagingDir: tmp, layerRoot },
        { partIndex: 1, partKind: "Skill" },
        [{ path: "SKILL.md", type: "skill", name: "bad" }],
        { name: "pkg", version: "1.0.0" }
      )
    ).toThrow(SkillFrontmatterError);
    fs.rmSync(tmp, { recursive: true });
  });
});
