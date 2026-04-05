/**
 * Integration-style checks: manifest on disk → staged part inputs match catalog layout.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import yaml from "js-yaml";

import { loadPackageManifest } from "../../src/install/resolve.js";
import {
  buildStagedPartInstallInputs,
  type StagedPartInstallInput,
} from "../../src/file-ops/part-install-input.js";
import {
  prepareCatalogInstallPartInputs,
  type CatalogInstallContext,
  type InstallOptions,
} from "../../src/install/install.js";

function partInputSnapshot(staged: StagedPartInstallInput[]) {
  return staged.map((s) => ({
    partIndex: s.partIndex,
    partKind: s.partKind,
    packagePaths: s.packagePaths,
    stagingDir: s.getStagingDir(),
  }));
}

describe("Integration: part install input pipeline", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = path.join(os.tmpdir(), `atp-part-in-${Date.now()}`);
    fs.mkdirSync(tmp, { recursive: true });
  });

  afterEach(() => {
    try {
      fs.rmSync(tmp, { recursive: true });
    } catch {
      /* ignore */
    }
  });

  it("loadPackageManifest + buildStagedPartInstallInputs for multi-part enriched manifest", () => {
    const manifestBody = {
      name: "vecfs-toolkit",
      version: "0.1.0",
      type: "Multi",
      parts: [
        { type: "Skill", usage: ["Skill text"], components: ["SKILL.md"] },
        { type: "Mcp", usage: ["MCP text"], bundles: ["vecfs-ts"] },
      ],
      assets: [
        { path: "part_1_Skill/SKILL.md", type: "skill", name: "SKILL" },
        { path: "part_2_Mcp/vecfs-ts/bin/mcp.js", type: "program", name: "mcp" },
      ],
    };
    fs.writeFileSync(path.join(tmp, "atp-package.yaml"), yaml.dump(manifestBody), "utf8");

    const manifest = loadPackageManifest(tmp);
    expect(manifest).not.toBeNull();
    const staged = buildStagedPartInstallInputs(manifest!, tmp);
    expect(staged).toHaveLength(2);
    expect(staged[0].partKind).toBe("Skill");
    expect(staged[1].partKind).toBe("Mcp");
    expect(staged[0].packagePaths.some((p) => p.endsWith("part_1_Skill/SKILL.md"))).toBe(true);
    expect(staged[1].packagePaths.some((p) => p.includes("part_2_Mcp"))).toBe(true);
  });

  it("prepareCatalogInstallPartInputs matches buildStagedPartInstallInputs for CatalogInstallContext", () => {
    fs.writeFileSync(
      path.join(tmp, "atp-package.yaml"),
      yaml.dump({
        name: "x",
        version: "1.0.0",
        type: "Rule",
        assets: [{ path: "rules/r.md", type: "rule", name: "r" }],
      }),
      "utf8"
    );
    const manifest = loadPackageManifest(tmp)!;
    const opts: InstallOptions = {
      promptScope: "project",
      binaryScope: "user-bin",
      dependencies: false,
    };
    const ctx: CatalogInstallContext = {
      pkgDir: tmp,
      manifest,
      agentBase: path.join(tmp, ".cursor"),
      bundlePathMap: undefined,
      installBinDir: undefined,
      catalogPkg: {
        name: "x",
        version: "1.0.0",
        location: `file://${tmp}`,
      },
      opts,
      projectBase: tmp,
    };
    expect(partInputSnapshot(prepareCatalogInstallPartInputs(ctx))).toEqual(
      partInputSnapshot(buildStagedPartInstallInputs(manifest, tmp))
    );
  });
});
