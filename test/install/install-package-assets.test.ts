/**
 * Unit tests: {@link installPackageAssetsForCatalogContext} routes rule-only Cursor to provider.
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

    expect(fs.readFileSync(path.join(agentBase, "skills", "S.md"), "utf8")).toBe("# S\n");
  });
});
