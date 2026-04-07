/**
 * Integration: `--force-config` resolves MCP / hooks merge conflicts end-to-end (dist CLI).
 * Pre-seeds agent config, snapshots it, verifies failed install leaves files unchanged,
 * then forced install replaces only conflicting fragments without duplication or stray keys.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";

import { runAtp, runAtpExpectExit } from "./test-helpers.js";
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

function assertMcpShapeHealthy(
  doc: Record<string, unknown>,
  initial: Record<string, unknown>,
  expectedConflictServerConfig: Record<string, unknown>
): void {
  const mcp = doc.mcpServers as Record<string, unknown> | undefined;
  expect(mcp).toBeDefined();
  const keys = Object.keys(mcp!);
  expect(new Set(keys).size).toBe(keys.length);

  expect(doc.keepTopLevel).toBe(initial.keepTopLevel);

  const initialServers = initial.mcpServers as Record<string, unknown>;
  expect(mcp!["user-preserved"]).toEqual(initialServers["user-preserved"]);

  expect(mcp!["atp-force-mcp"]).toEqual(expectedConflictServerConfig);
  expect(mcp!["atp-force-mcp"]).not.toEqual(initialServers["atp-force-mcp"]);

  expect(keys.sort()).toEqual(Object.keys(initialServers).sort());
}

function countHookIds(
  hooksDoc: Record<string, unknown>,
  event: string,
  id: string
): number {
  const hooks = hooksDoc.hooks as Record<string, unknown[]> | undefined;
  const arr = hooks?.[event];
  if (!arr) return 0;
  return arr.filter(
    (h) => h !== null && typeof h === "object" && (h as { id?: string }).id === id
  ).length;
}

function assertHooksShapeHealthy(
  doc: Record<string, unknown>,
  initial: Record<string, unknown>,
  event: string,
  expectedAtpHandler: Record<string, unknown>
): void {
  expect(doc.version).toBe(initial.version);

  const hooks = doc.hooks as Record<string, unknown[]>;
  const initialHooks = initial.hooks as Record<string, unknown[]>;
  expect(hooks[event].length).toBe(initialHooks[event].length);

  expect(countHookIds(doc, event, "atp-force-hook")).toBe(1);
  expect(countHookIds(doc, event, "user-preserved-hook")).toBe(1);

  const atp = hooks[event].find(
    (h) => (h as { id?: string }).id === "atp-force-hook"
  ) as Record<string, unknown>;
  expect(atp).toEqual(expectedAtpHandler);

  const user = hooks[event].find(
    (h) => (h as { id?: string }).id === "user-preserved-hook"
  ) as Record<string, unknown>;
  const initialUser = initialHooks[event].find(
    (h) => (h as { id?: string }).id === "user-preserved-hook"
  ) as Record<string, unknown>;
  expect(user).toEqual(initialUser);
}

describe("Integration: install --force-config MCP conflict (Cursor)", () => {
  let base: string;
  let stationDir: string;
  let pkgDir: string;
  let projectDir: string;
  let origStationPath: string | undefined;
  let agentBase: string;
  let mcpPath: string;

  const pkgMcpPayload = {
    mcpServers: {
      "atp-force-mcp": {
        command: "node",
        args: ["from-package.js", "v2"],
      },
    },
  };

  const initialMcpDoc = {
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
    const env = createTempPackageEnv("atp-force-mcp");
    base = env.base;
    stationDir = env.stationDir;
    pkgDir = env.pkgDir;
    origStationPath = env.origStationPath;

    projectDir = path.join(base, "proj");
    fs.mkdirSync(path.join(projectDir, ".git"), { recursive: true });
    agentBase = path.join(projectDir, ".cursor");
    mcpPath = path.join(agentBase, "mcp.json");

    runAtp(["station", "init"], atpCwd(pkgDir, stationDir));
    fs.writeFileSync(
      path.join(stationDir, "atp-config.yaml"),
      `configuration:
  version: 0.1.0
  agent-paths:
    cursor:
      project_path: .cursor/
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
      name: "force-mcp-pkg",
      version: "1.0.0",
      usage: "MCP force-config integration test",
      components: ["packaged-mcp.json"],
      catalogAdd: true,
    });

    runAtp(["safehouse", "init"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
    runAtp(["agent", "cursor"], { cwd: projectDir, env: { STATION_PATH: stationDir } });

    fs.mkdirSync(agentBase, { recursive: true });
    fs.writeFileSync(mcpPath, JSON.stringify(initialMcpDoc, null, 2), "utf8");
  });

  afterEach(() => {
    cleanupTempPackageEnv(base, origStationPath);
  });

  it("without --force-config: install fails and mcp.json matches the pre-install snapshot", () => {
    const snapshot = cloneJson(readJsonFile(mcpPath)) as Record<string, unknown>;

    runAtpExpectExit(
      ["install", "force-mcp-pkg", "--project"],
      1,
      { cwd: projectDir, env: { STATION_PATH: stationDir } }
    );

    const afterFail = readJsonFile(mcpPath) as Record<string, unknown>;
    expect(afterFail).toEqual(snapshot);
  });

  it("with --force-config: overwrites conflicting server, preserves others, no duplicate keys", () => {
    const snapshotBefore = cloneJson(readJsonFile(mcpPath)) as Record<string, unknown>;

    const out = runAtp(["install", "force-mcp-pkg", "--project", "--force-config"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    expect(out).toContain("Installed force-mcp-pkg");

    const after = readJsonFile(mcpPath) as Record<string, unknown>;
    expect(after).not.toEqual(snapshotBefore);

    assertMcpShapeHealthy(
      after,
      snapshotBefore,
      pkgMcpPayload.mcpServers["atp-force-mcp"] as Record<string, unknown>
    );
  });
});

describe("Integration: install --force-config hooks conflict (Cursor)", () => {
  let base: string;
  let stationDir: string;
  let pkgDir: string;
  let projectDir: string;
  let origStationPath: string | undefined;
  let agentBase: string;
  let hooksPath: string;

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

  const initialHooksDoc = {
    version: 1,
    hooks: {
      [eventName]: [
        { id: "atp-force-hook", command: "./hooks/legacy.sh" },
        { id: "user-preserved-hook", command: "./hooks/user.sh" },
      ],
    },
  };

  beforeEach(() => {
    const env = createTempPackageEnv("atp-force-hooks");
    base = env.base;
    stationDir = env.stationDir;
    pkgDir = env.pkgDir;
    origStationPath = env.origStationPath;

    projectDir = path.join(base, "proj-h");
    fs.mkdirSync(path.join(projectDir, ".git"), { recursive: true });
    agentBase = path.join(projectDir, ".cursor");
    hooksPath = path.join(agentBase, "hooks.json");

    runAtp(["station", "init"], atpCwd(pkgDir, stationDir));
    fs.writeFileSync(
      path.join(stationDir, "atp-config.yaml"),
      `configuration:
  version: 0.1.0
  agent-paths:
    cursor:
      project_path: .cursor/
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
      name: "force-hooks-pkg",
      version: "1.0.0",
      usage: "Hooks force-config integration test",
      components: ["hooks.json"],
      catalogAdd: true,
    });

    runAtp(["safehouse", "init"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
    runAtp(["agent", "cursor"], { cwd: projectDir, env: { STATION_PATH: stationDir } });

    fs.mkdirSync(agentBase, { recursive: true });
    fs.writeFileSync(hooksPath, JSON.stringify(initialHooksDoc, null, 2), "utf8");
  });

  afterEach(() => {
    cleanupTempPackageEnv(base, origStationPath);
  });

  it("without --force-config: install fails and hooks.json matches the pre-install snapshot", () => {
    const snapshot = cloneJson(readJsonFile(hooksPath)) as Record<string, unknown>;

    runAtpExpectExit(
      ["install", "force-hooks-pkg", "--project"],
      1,
      { cwd: projectDir, env: { STATION_PATH: stationDir } }
    );

    const afterFail = readJsonFile(hooksPath) as Record<string, unknown>;
    expect(afterFail).toEqual(snapshot);
  });

  it("with --force-config: replaces conflicting handler, preserves others, no duplicate ids", () => {
    const snapshotBefore = cloneJson(readJsonFile(hooksPath)) as Record<string, unknown>;

    const out = runAtp(["install", "force-hooks-pkg", "--project", "--force-config"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    expect(out).toContain("Installed force-hooks-pkg");

    const after = readJsonFile(hooksPath) as Record<string, unknown>;
    expect(after).not.toEqual(snapshotBefore);

    assertHooksShapeHealthy(
      after,
      snapshotBefore,
      eventName,
      pkgHooksPayload.hooks[eventName][0] as Record<string, unknown>
    );
  });
});
