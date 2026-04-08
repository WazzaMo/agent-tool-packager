/**
 * Unit tests: {@link installPackageAssetsForCatalogContext} routes Cursor / Gemini / Claude provider installs.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import { prepareCatalogInstallPartInputs } from "../../src/install/install.js";
import { installPackageAssetsForCatalogContext } from "../../src/install/install-package-assets.js";
import type { CatalogInstallContext } from "../../src/install/types.js";

describe("installPackageAssetsForCatalogContext", () => {
  let base: string;

  beforeEach(() => {
    base = path.join(os.tmpdir(), `atp-ipa-${Date.now()}`);
    fs.mkdirSync(base, { recursive: true });
  });

  afterEach(() => {
    try {
      fs.rmSync(base, { recursive: true });
    } catch {
      /* ignore */
    }
  });

  it("installs rule-only cursor project package via provider (rules/ tree)", () => {
    const projectBase = path.join(base, "project");
    const pkgDir = path.join(base, "station_pkg", "my-rules");
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(path.join(pkgDir, "doc.md"), "# Rule\n");
    const agentBase = path.join(projectBase, ".cursor");
    const manifest = {
      name: "my-rules",
      version: "0.2.0",
      type: "Rule",
      assets: [{ path: "doc.md", type: "rule" as const, name: "doc" }],
    };
    const ctx: CatalogInstallContext = {
      pkgDir,
      manifest,
      agentBase,
      bundlePathMap: undefined,
      installBinDir: undefined,
      catalogPkg: { name: "my-rules", version: "0.2.0", location: `file://${pkgDir}` },
      opts: { promptScope: "project", binaryScope: "user-bin", dependencies: false },
      projectBase,
    };
    const providerCtx = {
      agent: "cursor" as const,
      layer: "project" as const,
      projectRoot: projectBase,
      layerRoot: agentBase,
      stagingDir: pkgDir,
    };
    const staged = prepareCatalogInstallPartInputs(ctx);
    installPackageAssetsForCatalogContext(ctx, providerCtx, staged);

    const dest = path.join(agentBase, "rules", "doc.md");
    expect(fs.existsSync(dest)).toBe(true);
    expect(fs.readFileSync(dest, "utf8")).toBe("# Rule\n");
  });

  it("installs skill package via CursorAgentProvider (skills/ tree)", () => {
    const projectBase = path.join(base, "project2");
    const pkgDir = path.join(base, "pkg2");
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(path.join(pkgDir, "S.md"), "# S\n");
    const agentBase = path.join(projectBase, ".cursor");
    const manifest = {
      name: "sk",
      assets: [{ path: "S.md", type: "skill" as const, name: "S" }],
    };
    const ctx: CatalogInstallContext = {
      pkgDir,
      manifest,
      agentBase,
      bundlePathMap: undefined,
      installBinDir: undefined,
      catalogPkg: { name: "sk", location: `file://${pkgDir}` },
      opts: { promptScope: "project", binaryScope: "user-bin", dependencies: false },
      projectBase,
    };
    const providerCtxSkill = {
      agent: "cursor" as const,
      layer: "project" as const,
      projectRoot: projectBase,
      layerRoot: agentBase,
      stagingDir: pkgDir,
    };
    const stagedSkill = prepareCatalogInstallPartInputs(ctx);
    installPackageAssetsForCatalogContext(ctx, providerCtxSkill, stagedSkill);

    const installed = fs.readFileSync(path.join(agentBase, "skills", "S", "SKILL.md"), "utf8");
    expect(installed).toContain("# S");
    expect(installed).toContain("name: S");
  });

  it("installs rule via GeminiAgentProvider under .gemini/rules/", () => {
    const projectBase = path.join(base, "gproj");
    const pkgDir = path.join(base, "gpkg");
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(path.join(pkgDir, "rule.md"), "# G\n");
    const agentBase = path.join(projectBase, ".gemini");
    const manifest = {
      name: "g-rules",
      version: "0.1.0",
      type: "Rule",
      assets: [{ path: "rule.md", type: "rule" as const, name: "rule" }],
    };
    const ctx: CatalogInstallContext = {
      pkgDir,
      manifest,
      agentBase,
      bundlePathMap: undefined,
      installBinDir: undefined,
      catalogPkg: { name: "g-rules", version: "0.1.0", location: `file://${pkgDir}` },
      opts: { promptScope: "project", binaryScope: "user-bin", dependencies: false },
      projectBase,
    };
    const providerCtx = {
      agent: "gemini" as const,
      layer: "project" as const,
      projectRoot: projectBase,
      layerRoot: agentBase,
      stagingDir: pkgDir,
    };
    const staged = prepareCatalogInstallPartInputs(ctx);
    installPackageAssetsForCatalogContext(ctx, providerCtx, staged);

    const dest = path.join(agentBase, "rules", "rule.md");
    expect(fs.existsSync(dest)).toBe(true);
    expect(fs.readFileSync(dest, "utf8")).toBe("# G\n");
  });

  it("installs rule via ClaudeAgentProvider under .claude/rules/", () => {
    const projectBase = path.join(base, "cproj");
    const pkgDir = path.join(base, "cpkg");
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(path.join(pkgDir, "rule.md"), "# Claude rule\n");
    const agentBase = path.join(projectBase, ".claude");
    const manifest = {
      name: "c-rules",
      version: "0.1.0",
      type: "Rule",
      assets: [{ path: "rule.md", type: "rule" as const, name: "rule" }],
    };
    const ctx: CatalogInstallContext = {
      pkgDir,
      manifest,
      agentBase,
      bundlePathMap: undefined,
      installBinDir: undefined,
      catalogPkg: { name: "c-rules", version: "0.1.0", location: `file://${pkgDir}` },
      opts: { promptScope: "project", binaryScope: "user-bin", dependencies: false },
      projectBase,
    };
    const providerCtx = {
      agent: "claude" as const,
      layer: "project" as const,
      projectRoot: projectBase,
      layerRoot: agentBase,
      stagingDir: pkgDir,
    };
    const staged = prepareCatalogInstallPartInputs(ctx);
    installPackageAssetsForCatalogContext(ctx, providerCtx, staged);

    const dest = path.join(agentBase, "rules", "rule.md");
    expect(fs.existsSync(dest)).toBe(true);
    expect(fs.readFileSync(dest, "utf8")).toBe("# Claude rule\n");
  });
});
