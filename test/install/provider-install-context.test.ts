/**
 * Unit tests: buildProviderInstallContext maps catalog install to provider roots.
 */

import path from "node:path";
import os from "node:os";
import { describe, it, expect, vi, beforeEach } from "vitest";

import type * as LoadModule from "../../src/config/load.js";
import { DEFAULT_AGENT_PATHS, type StationConfig } from "../../src/config/station-config.js";
import { buildProviderInstallContext, type CatalogInstallContext } from "../../src/install/install.js";

const mockLoad = vi.hoisted(() => ({
  loadStationConfig: vi.fn(),
  loadSafehouseConfig: vi.fn(),
}));

vi.mock("../../src/config/load.js", async (importOriginal) => {
  const mod = (await importOriginal()) as typeof LoadModule;
  return {
    ...mod,
    loadStationConfig: mockLoad.loadStationConfig,
    loadSafehouseConfig: mockLoad.loadSafehouseConfig,
  };
});

function stationWithPaths(agentPaths: StationConfig["configuration"]["agent-paths"]): StationConfig {
  return {
    configuration: {
      version: "0.1.0",
      "agent-paths": agentPaths,
      "standard-catalog": { url: "https://example.com/" },
    },
  };
}

describe("buildProviderInstallContext", () => {
  const projectBase = path.join(os.tmpdir(), "atp-pic-proj");
  const pkgDir = path.join(os.tmpdir(), "atp-pic-pkg");
  const agentBase = path.join(projectBase, ".cursor");

  beforeEach(() => {
    mockLoad.loadStationConfig.mockReset();
    mockLoad.loadSafehouseConfig.mockReset();
  });

  it("uses project layer and agentBase when promptScope is project", () => {
    mockLoad.loadSafehouseConfig.mockReturnValue({
      agent: "cursor",
      station_path: "/station",
      agent_path: null,
    });
    mockLoad.loadStationConfig.mockReturnValue(stationWithPaths(DEFAULT_AGENT_PATHS));

    const ctx: CatalogInstallContext = {
      pkgDir,
      manifest: { name: "p" },
      agentBase,
      bundlePathMap: undefined,
      installBinDir: undefined,
      catalogPkg: { name: "p", version: "1.0.0" },
      opts: { promptScope: "project", binaryScope: "user-bin", dependencies: false },
      projectBase,
    };

    const ic = buildProviderInstallContext(ctx);
    expect(ic.agent).toBe("cursor");
    expect(ic.layer).toBe("project");
    expect(ic.projectRoot).toBe(path.resolve(projectBase));
    expect(ic.stagingDir).toBe(path.resolve(pkgDir));
    expect(ic.layerRoot).toBe(path.resolve(agentBase));
  });

  it("uses user layer and expanded home when promptScope is station", () => {
    mockLoad.loadSafehouseConfig.mockReturnValue({
      agent: "gemini",
      station_path: "/station",
      agent_path: null,
    });
    mockLoad.loadStationConfig.mockReturnValue(stationWithPaths(DEFAULT_AGENT_PATHS));

    const ctx: CatalogInstallContext = {
      pkgDir,
      manifest: { name: "p" },
      agentBase: path.join(projectBase, ".gemini"),
      bundlePathMap: undefined,
      installBinDir: undefined,
      catalogPkg: { name: "p", version: "1.0.0" },
      opts: { promptScope: "station", binaryScope: "user-bin", dependencies: false },
      projectBase,
    };

    const ic = buildProviderInstallContext(ctx);
    expect(ic.agent).toBe("gemini");
    expect(ic.layer).toBe("user");
    expect(ic.layerRoot).toBe(path.normalize(path.join(os.homedir(), ".gemini")));
  });

  it("throws when safehouse agent is not a supported AgentId", () => {
    mockLoad.loadSafehouseConfig.mockReturnValue({
      agent: "kiro",
      station_path: "/station",
      agent_path: null,
    });
    mockLoad.loadStationConfig.mockReturnValue(stationWithPaths(DEFAULT_AGENT_PATHS));

    const ctx: CatalogInstallContext = {
      pkgDir,
      manifest: { name: "p" },
      agentBase,
      bundlePathMap: undefined,
      installBinDir: undefined,
      catalogPkg: { name: "p", version: "1.0.0" },
      opts: { promptScope: "project", binaryScope: "user-bin", dependencies: false },
      projectBase,
    };

    expect(() => buildProviderInstallContext(ctx)).toThrow(/Unsupported agent/);
  });
});
