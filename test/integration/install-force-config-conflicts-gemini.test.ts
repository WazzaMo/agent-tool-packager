/**
 * Integration: `--force-config` MCP / hooks conflicts for Gemini (`.gemini/settings.json`, dist CLI).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";

import { runAtp, runAtpSpawn } from "./test-helpers.js";
import {
  atpCwd,
  initPackage,
  createTempPackageEnv,
  cleanupTempPackageEnv,
} from "./package-developer-helpers.js";

function cloneJson<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function readJsonFile(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
}

describe("Integration: install --force-config MCP conflict (Gemini)", () => {
  let base: string;
  let stationDir: string;
  let pkgDir: string;
  let projectDir: string;
  let origStationPath: string | undefined;
  let settingsPath: string;

  const pkgMcpPayload = {
    mcpServers: {
      "atp-force-mcp": {
        command: "node",
        args: ["from-package.js", "v2"],
      },
    },
  };

  const initialSettingsDoc = {
    keepTopLevel: true,
    mcpServers: {
      "atp-force-mcp": {
        command: "legacy-before-install",
        args: ["old"],
      },
      "user-preserved": {
        url: "http://127.0.0.1:7777",
      },
    },
  };

  beforeEach(() => {
    const env = createTempPackageEnv("atp-gem-force-mcp");
    base = env.base;
    stationDir = env.stationDir;
    pkgDir = env.pkgDir;
    origStationPath = env.origStationPath;

    projectDir = path.join(base, "proj-gem-mcp");
    fs.mkdirSync(path.join(projectDir, ".git"), { recursive: true });
    settingsPath = path.join(projectDir, ".gemini", "settings.json");

    runAtp(["station", "init"], atpCwd(pkgDir, stationDir));
    fs.writeFileSync(
      path.join(stationDir, "atp-config.yaml"),
      `configuration:
  version: 0.1.0
  agent-paths:
    gemini:
      project_path: .gemini/
`
    );
    fs.writeFileSync(path.join(stationDir, "atp-safehouse-list.yaml"), "safehouse_paths: []\n");

    fs.writeFileSync(
      path.join(pkgDir, "packaged-mcp.json"),
      JSON.stringify(pkgMcpPayload, null, 2),
      "utf8"
    );

    initPackage(pkgDir, stationDir, {
      type: "mcp",
      name: "gem-force-mcp-pkg",
      version: "1.0.0",
      usage: "Gemini MCP force-config integration test",
      components: ["packaged-mcp.json"],
      catalogAdd: true,
    });

    runAtp(["safehouse", "init"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
    runAtp(["agent", "gemini"], { cwd: projectDir, env: { STATION_PATH: stationDir } });

    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(settingsPath, JSON.stringify(initialSettingsDoc, null, 2), "utf8");
  });

  afterEach(() => {
    cleanupTempPackageEnv(base, origStationPath);
  });

  it("without --force-config: stderr mentions .gemini/settings.json; file unchanged", () => {
    const snapshot = cloneJson(readJsonFile(settingsPath)) as Record<string, unknown>;

    const r = runAtpSpawn(["install", "gem-force-mcp-pkg", "--project"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    expect(r.status).not.toBe(0);
    expect(r.stderr + r.stdout).toMatch(/\.gemini\/settings\.json/);

    expect(readJsonFile(settingsPath)).toEqual(snapshot);
  });

  it("with --force-config: overwrites conflicting server in settings.json", () => {
    const out = runAtp(["install", "gem-force-mcp-pkg", "--project", "--force-config"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    expect(out).toContain("Installed gem-force-mcp-pkg");

    const after = readJsonFile(settingsPath) as Record<string, unknown>;
    const mcp = after.mcpServers as Record<string, unknown>;
    expect(mcp["atp-force-mcp"]).toEqual(pkgMcpPayload.mcpServers["atp-force-mcp"]);
    expect(mcp["user-preserved"]).toEqual({ url: "http://127.0.0.1:7777" });
  });
});

describe("Integration: install --force-config hooks conflict (Gemini)", () => {
  let base: string;
  let stationDir: string;
  let pkgDir: string;
  let projectDir: string;
  let origStationPath: string | undefined;
  let settingsPath: string;
  const eventName = "beforeSubmit";

  const pkgHooksPayload = {
    version: 1,
    hooks: {
      [eventName]: [
        {
          id: "atp-force-hook",
          command: "./hooks/from-package.sh",
        },
      ],
    },
  };

  const initialSettingsDoc = {
    version: 1,
    hooks: {
      [eventName]: [
        { id: "atp-force-hook", command: "./hooks/legacy.sh" },
        { id: "user-preserved-hook", command: "./hooks/user.sh" },
      ],
    },
  };

  beforeEach(() => {
    const env = createTempPackageEnv("atp-gem-force-hooks");
    base = env.base;
    stationDir = env.stationDir;
    pkgDir = env.pkgDir;
    origStationPath = env.origStationPath;

    projectDir = path.join(base, "proj-gem-hooks");
    fs.mkdirSync(path.join(projectDir, ".git"), { recursive: true });
    settingsPath = path.join(projectDir, ".gemini", "settings.json");

    runAtp(["station", "init"], atpCwd(pkgDir, stationDir));
    fs.writeFileSync(
      path.join(stationDir, "atp-config.yaml"),
      `configuration:
  version: 0.1.0
  agent-paths:
    gemini:
      project_path: .gemini/
`
    );
    fs.writeFileSync(path.join(stationDir, "atp-safehouse-list.yaml"), "safehouse_paths: []\n");

    fs.writeFileSync(
      path.join(pkgDir, "hooks.json"),
      JSON.stringify(pkgHooksPayload, null, 2),
      "utf8"
    );

    initPackage(pkgDir, stationDir, {
      type: "hook",
      name: "gem-force-hooks-pkg",
      version: "1.0.0",
      usage: "Gemini hooks force-config integration test",
      components: ["hooks.json"],
      catalogAdd: true,
    });

    runAtp(["safehouse", "init"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
    runAtp(["agent", "gemini"], { cwd: projectDir, env: { STATION_PATH: stationDir } });

    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(settingsPath, JSON.stringify(initialSettingsDoc, null, 2), "utf8");
  });

  afterEach(() => {
    cleanupTempPackageEnv(base, origStationPath);
  });

  it("without --force-config: stderr mentions .gemini/settings.json; file unchanged", () => {
    const snapshot = cloneJson(readJsonFile(settingsPath)) as Record<string, unknown>;

    const r = runAtpSpawn(["install", "gem-force-hooks-pkg", "--project"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    expect(r.status).not.toBe(0);
    expect(r.stderr + r.stdout).toMatch(/\.gemini\/settings\.json/);

    expect(readJsonFile(settingsPath)).toEqual(snapshot);
  });

  it("with --force-config: replaces conflicting handler in settings.json", () => {
    const out = runAtp(["install", "gem-force-hooks-pkg", "--project", "--force-config"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    expect(out).toContain("Installed gem-force-hooks-pkg");

    const after = readJsonFile(settingsPath) as Record<string, unknown>;
    const hooks = after.hooks as Record<string, unknown[]>;
    const list = hooks[eventName];
    const atp = list.find((h) => (h as { id?: string }).id === "atp-force-hook") as Record<
      string,
      unknown
    >;
    expect(atp).toEqual(pkgHooksPayload.hooks[eventName][0]);
  });
});
