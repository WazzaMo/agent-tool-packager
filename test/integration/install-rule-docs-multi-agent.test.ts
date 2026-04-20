/**
 * Integration: legacy Rule package from real repo docs, catalog, install per agent.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { runAtp, PROJECT_ROOT } from "./test-helpers.js";
import {
  initPackage,
  createTempPackageEnv,
  cleanupTempPackageEnv,
} from "./package-developer-helpers.js";

const DOC_GUIDE = path.join(PROJECT_ROOT, "docs", "doc-guide.md");
const CLEAN_CODE = path.join(PROJECT_ROOT, "docs", "clean-code.md");

/** Supported agents (cursor, claude, gemini, codex) with default project dirs in Station `agent-paths`. */
const AGENT_RULE_INSTALL: { agent: string; projectSubdir: string }[] = [
  { agent: "cursor", projectSubdir: ".cursor" },
  { agent: "gemini", projectSubdir: ".gemini" },
  { agent: "codex", projectSubdir: ".codex" },
  { agent: "claude", projectSubdir: ".claude" },
];

describe("Integration: Rule package from docs/ — station catalog + Safehouse install per agent", () => {
  let base: string;
  let stationDir: string;
  let pkgDir: string;

  beforeEach(() => {
    const env = createTempPackageEnv("atp-rule-docs-agents");
    base = env.base;
    stationDir = env.stationDir;
    pkgDir = env.pkgDir;
  });

  afterEach(() => {
    cleanupTempPackageEnv(base);
  });

  it("builds Rule package from doc-guide + clean-code, catalogs, installs to each agent project rules/", () => {
    expect(fs.existsSync(DOC_GUIDE)).toBe(true);
    expect(fs.existsSync(CLEAN_CODE)).toBe(true);
    const expectedGuide = fs.readFileSync(DOC_GUIDE, "utf8");
    const expectedClean = fs.readFileSync(CLEAN_CODE, "utf8");

    const pkgName = "repo-docs-rules";

    initPackage(pkgDir, stationDir, {
      type: "rule",
      name: pkgName,
      version: "1.0.0",
      usage: "Documentation rules from repository docs/",
      components: [DOC_GUIDE, CLEAN_CODE],
      catalogAdd: true,
    });

    const stationPkg = path.join(stationDir, "user_packages", pkgName);
    expect(fs.existsSync(path.join(stationPkg, "atp-package.yaml"))).toBe(true);
    expect(fs.existsSync(path.join(stationPkg, "package.tar.gz"))).toBe(true);

    for (const { agent, projectSubdir } of AGENT_RULE_INSTALL) {
      const projectDir = path.join(base, `project-${agent}`);
      fs.mkdirSync(path.join(projectDir, ".git"), { recursive: true });

      const env = { STATION_PATH: stationDir };
      runAtp(["safehouse", "init"], { cwd: projectDir, env });
      runAtp(["agent", agent], { cwd: projectDir, env });

      const out = runAtp(["install", pkgName, "--project"], { cwd: projectDir, env });
      expect(out).toContain(`Installed ${pkgName}`);
      expect(out).toMatch(/prompts:project/i);

      const rulesDir = path.join(projectDir, projectSubdir, "rules");
      const guideDest = path.join(rulesDir, "doc-guide.md");
      const cleanDest = path.join(rulesDir, "clean-code.md");
      expect(fs.existsSync(guideDest)).toBe(true);
      expect(fs.existsSync(cleanDest)).toBe(true);
      expect(fs.readFileSync(guideDest, "utf8")).toBe(expectedGuide);
      expect(fs.readFileSync(cleanDest, "utf8")).toBe(expectedClean);
    }
  });
});
