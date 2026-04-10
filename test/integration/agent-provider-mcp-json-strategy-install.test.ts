/**
 * Integration: MCP part with `atpJsonDocumentStrategy` installs via Cursor / Gemini providers.
 */

import { describe, it, expect, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";

import { runAtp } from "./test-helpers.js";
import {
  atpCwd,
  initPackage,
  createTempPackageEnv,
  cleanupTempPackageEnv,
} from "./package-developer-helpers.js";

const COMBINED_MCP = {
  mcpServers: {
    "atp-strategy-mcp": { command: "node", args: ["./srv.js"] },
  },
  atpJsonDocumentStrategy: {
    strategy: { mode: "deep_assign_paths", paths: [[]] },
    payload: {
      atp_strategy_marker: { installed: true },
    },
  },
};

function writeCursorStation(stationDir: string): void {
  fs.writeFileSync(
    path.join(stationDir, "atp-config.yaml"),
    `configuration:
  version: 0.1.0
  agent-paths:
    cursor:
      project_path: .cursor/
`
  );
}

function writeGeminiStation(stationDir: string): void {
  fs.writeFileSync(
    path.join(stationDir, "atp-config.yaml"),
    `configuration:
  version: 0.1.0
  agent-paths:
    gemini:
      project_path: .gemini/
`
  );
}

describe("Integration: MCP JSON strategy via catalog install", () => {
  let base: string;
  let stationDir: string;
  let pkgDir: string;

  afterEach(() => {
    cleanupTempPackageEnv(base);
  });

  it("Cursor: mcp.json receives mcpServers and strategy payload", () => {
    const env = createTempPackageEnv("atp-mcp-strat-cursor");
    base = env.base;
    stationDir = env.stationDir;
    pkgDir = env.pkgDir;

    const projectDir = path.join(base, "proj");
    fs.mkdirSync(path.join(projectDir, ".git"), { recursive: true });

    runAtp(["station", "init"], atpCwd(pkgDir, stationDir));
    writeCursorStation(stationDir);
    fs.writeFileSync(path.join(stationDir, "atp-safehouse-list.yaml"), "safehouse_paths: []\n");

    fs.writeFileSync(
      path.join(pkgDir, "strat-mcp.json"),
      JSON.stringify(COMBINED_MCP, null, 2),
      "utf8"
    );

    initPackage(pkgDir, stationDir, {
      type: "mcp",
      name: "mcp-strat-cursor-pkg",
      version: "1.0.0",
      usage: "Strategy MCP test",
      components: ["strat-mcp.json"],
      catalogAdd: true,
    });

    runAtp(["safehouse", "init"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
    runAtp(["agent", "cursor"], { cwd: projectDir, env: { STATION_PATH: stationDir } });

    const out = runAtp(["install", "mcp-strat-cursor-pkg", "--project"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    expect(out).toMatch(/Installed mcp-strat-cursor-pkg|success/i);

    const mcpPath = path.join(projectDir, ".cursor", "mcp.json");
    const doc = JSON.parse(fs.readFileSync(mcpPath, "utf8")) as Record<string, unknown>;
    const servers = doc.mcpServers as Record<string, unknown>;
    expect(servers["atp-strategy-mcp"]).toEqual({ command: "node", args: ["./srv.js"] });
    expect(doc.atp_strategy_marker).toEqual({ installed: true });
  });

  it("Gemini: settings.json receives mcpServers and strategy payload", () => {
    const env = createTempPackageEnv("atp-mcp-strat-gemini");
    base = env.base;
    stationDir = env.stationDir;
    pkgDir = env.pkgDir;

    const projectDir = path.join(base, "proj-g");
    fs.mkdirSync(path.join(projectDir, ".git"), { recursive: true });

    runAtp(["station", "init"], atpCwd(pkgDir, stationDir));
    writeGeminiStation(stationDir);
    fs.writeFileSync(path.join(stationDir, "atp-safehouse-list.yaml"), "safehouse_paths: []\n");

    fs.writeFileSync(
      path.join(pkgDir, "strat-mcp.json"),
      JSON.stringify(COMBINED_MCP, null, 2),
      "utf8"
    );

    initPackage(pkgDir, stationDir, {
      type: "mcp",
      name: "mcp-strat-gemini-pkg",
      version: "1.0.0",
      usage: "Strategy MCP Gemini test",
      components: ["strat-mcp.json"],
      catalogAdd: true,
    });

    runAtp(["safehouse", "init"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
    runAtp(["agent", "gemini"], { cwd: projectDir, env: { STATION_PATH: stationDir } });

    const out = runAtp(["install", "mcp-strat-gemini-pkg", "--project"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    expect(out).toMatch(/Installed mcp-strat-gemini-pkg|success/i);

    const settingsPath = path.join(projectDir, ".gemini", "settings.json");
    const doc = JSON.parse(fs.readFileSync(settingsPath, "utf8")) as Record<string, unknown>;
    const servers = doc.mcpServers as Record<string, unknown>;
    expect(servers["atp-strategy-mcp"]).toEqual({ command: "node", args: ["./srv.js"] });
    expect(doc.atp_strategy_marker).toEqual({ installed: true });
  });
});
