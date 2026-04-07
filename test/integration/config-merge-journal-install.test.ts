/**
 * Integration: Safehouse config merge journal (SHA + fragments), exact rollback, drift fallback.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

import { sha256HexCanonicalJson } from "../../src/config/canonical-json.js";
import {
  CONFIG_JOURNAL_FILE_VERSION,
  type ConfigJournalFileV1,
} from "../../src/config/config-merge-journal.js";
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

function readManifestRow(
  projectDir: string,
  pkgName: string
): { config_journal_path?: string } | undefined {
  const raw = fs.readFileSync(
    path.join(projectDir, ".atp_safehouse", "manifest.yaml"),
    "utf8"
  );
  const doc = yaml.load(raw) as Record<string, unknown>;
  const inner = (doc["Safehouse-Manifest"] ?? doc) as Record<string, unknown>;
  const packages = inner.packages as Array<{ name: string; config_journal_path?: string }>;
  return packages.find((p) => p.name === pkgName);
}

describe("Integration: config journal — MCP exact rollback after --force-config", () => {
  let base: string;
  let stationDir: string;
  let pkgDir: string;
  let projectDir: string;
  let origStationPath: string | undefined;
  let agentBase: string;
  let mcpPath: string;

  const initialMcpDoc = {
    keepTopLevel: true,
    mcpServers: {
      "atp-force-mcp": { command: "legacy", args: ["old"] },
      "user-preserved": { url: "http://127.0.0.1:7" },
    },
  };

  const pkgPayload = {
    mcpServers: {
      "atp-force-mcp": { command: "from-pkg", args: ["new"] },
    },
  };

  beforeEach(() => {
    const env = createTempPackageEnv("atp-jrnl-mcp");
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
      JSON.stringify(pkgPayload, null, 2),
      "utf8"
    );

    initPackage(pkgDir, stationDir, {
      type: "mcp",
      name: "jrnl-mcp-pkg",
      version: "1.0.0",
      usage: "Journal MCP test",
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

  it("writes journal with hashes; remove restores exact pre-install mcp.json", () => {
    const snapshot = cloneJson(JSON.parse(fs.readFileSync(mcpPath, "utf8")));

    runAtp(["install", "jrnl-mcp-pkg", "--project", "--force-config"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });

    const row = readManifestRow(projectDir, "jrnl-mcp-pkg");
    expect(row?.config_journal_path).toMatch(/^config-journal\//);

    const journalAbs = path.join(
      projectDir,
      ".atp_safehouse",
      ...(row!.config_journal_path!.split("/"))
    );
    expect(fs.existsSync(journalAbs)).toBe(true);
    const journal = JSON.parse(fs.readFileSync(journalAbs, "utf8")) as ConfigJournalFileV1;
    expect(journal.version).toBe(CONFIG_JOURNAL_FILE_VERSION);
    expect(journal.entries.length).toBe(1);
    const e = journal.entries[0];
    expect(e.kind).toBe("mcp");
    expect(e.before_absent).toBe(false);
    expect(e.fragments.type).toBe("mcp");
    if (e.fragments.type === "mcp") {
      expect(e.fragments.server_names).toContain("atp-force-mcp");
    }
    expect(e.before_sha256).not.toBe(e.after_sha256);

    const onDisk = JSON.parse(fs.readFileSync(mcpPath, "utf8")) as Record<string, unknown>;
    expect(sha256HexCanonicalJson(onDisk)).toBe(e.after_sha256);

    runAtp(["remove", "safehouse", "jrnl-mcp-pkg"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });

    const restored = JSON.parse(fs.readFileSync(mcpPath, "utf8")) as Record<string, unknown>;
    expect(restored).toEqual(snapshot);
    expect(fs.existsSync(journalAbs)).toBe(false);
  });

  it("warns on drift and fragment-removes only package servers when user edits mcp.json", () => {
    runAtp(["install", "jrnl-mcp-pkg", "--project", "--force-config"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });

    const edited = JSON.parse(fs.readFileSync(mcpPath, "utf8")) as Record<string, unknown>;
    edited.user_tamper_marker = true;
    fs.writeFileSync(mcpPath, JSON.stringify(edited, null, 2), "utf8");

    const r = runAtpSpawn(["remove", "safehouse", "jrnl-mcp-pkg"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    expect(r.status).toBe(0);
    expect(r.stderr).toMatch(/changed since install|fragment rollback only/i);

    const out = JSON.parse(fs.readFileSync(mcpPath, "utf8")) as Record<string, unknown>;
    expect(out.user_tamper_marker).toBe(true);
    const servers = out.mcpServers as Record<string, unknown>;
    expect(servers["user-preserved"]).toEqual({ url: "http://127.0.0.1:7" });
    expect(servers["atp-force-mcp"]).toBeUndefined();
  });
});

describe("Integration: config journal — MCP before_absent unlink on remove", () => {
  let base: string;
  let stationDir: string;
  let pkgDir: string;
  let projectDir: string;
  let origStationPath: string | undefined;
  let mcpPath: string;

  beforeEach(() => {
    const env = createTempPackageEnv("atp-jrnl-fresh");
    base = env.base;
    stationDir = env.stationDir;
    pkgDir = env.pkgDir;
    origStationPath = env.origStationPath;

    projectDir = path.join(base, "proj2");
    fs.mkdirSync(path.join(projectDir, ".git"), { recursive: true });
    mcpPath = path.join(projectDir, ".cursor", "mcp.json");

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
      path.join(pkgDir, "only-mcp.json"),
      JSON.stringify({
        mcpServers: { solo_srv: { command: "solo" } },
      }),
      "utf8"
    );

    initPackage(pkgDir, stationDir, {
      type: "mcp",
      name: "jrnl-fresh-mcp",
      version: "1.0.0",
      usage: "Fresh MCP journal",
      components: ["only-mcp.json"],
      catalogAdd: true,
    });

    runAtp(["safehouse", "init"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
    runAtp(["agent", "cursor"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
    fs.mkdirSync(path.dirname(mcpPath), { recursive: true });
    expect(fs.existsSync(mcpPath)).toBe(false);
  });

  afterEach(() => {
    cleanupTempPackageEnv(base, origStationPath);
  });

  it("records before_absent; remove deletes mcp.json entirely", () => {
    runAtp(["install", "jrnl-fresh-mcp", "--project"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });

    expect(fs.existsSync(mcpPath)).toBe(true);

    const row = readManifestRow(projectDir, "jrnl-fresh-mcp");
    expect(row?.config_journal_path).toBeDefined();
    const journalAbs = path.join(
      projectDir,
      ".atp_safehouse",
      ...(row!.config_journal_path!.split("/"))
    );
    const journal = JSON.parse(fs.readFileSync(journalAbs, "utf8")) as ConfigJournalFileV1;
    expect(journal.entries[0].before_absent).toBe(true);

    runAtp(["remove", "safehouse", "jrnl-fresh-mcp"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });

    expect(fs.existsSync(mcpPath)).toBe(false);
  });
});

describe("Integration: config journal — hooks exact rollback after --force-config", () => {
  let base: string;
  let stationDir: string;
  let pkgDir: string;
  let projectDir: string;
  let origStationPath: string | undefined;
  let hooksPath: string;
  const eventName = "beforeSubmit";

  const initialHooksDoc = {
    version: 1,
    hooks: {
      [eventName]: [
        { id: "jrnl-hook", command: "./legacy.sh" },
        { id: "user-hook", command: "./user.sh" },
      ],
    },
  };

  const pkgHooksPayload = {
    version: 1,
    hooks: {
      [eventName]: [{ id: "jrnl-hook", command: "./from-pkg.sh" }],
    },
  };

  beforeEach(() => {
    const env = createTempPackageEnv("atp-jrnl-hooks");
    base = env.base;
    stationDir = env.stationDir;
    pkgDir = env.pkgDir;
    origStationPath = env.origStationPath;

    projectDir = path.join(base, "proj-hooks");
    fs.mkdirSync(path.join(projectDir, ".git"), { recursive: true });
    hooksPath = path.join(projectDir, ".cursor", "hooks.json");

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
      name: "jrnl-hooks-pkg",
      version: "1.0.0",
      usage: "Journal hooks test",
      components: ["hooks.json"],
      catalogAdd: true,
    });

    runAtp(["safehouse", "init"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
    runAtp(["agent", "cursor"], { cwd: projectDir, env: { STATION_PATH: stationDir } });

    fs.mkdirSync(path.dirname(hooksPath), { recursive: true });
    fs.writeFileSync(hooksPath, JSON.stringify(initialHooksDoc, null, 2), "utf8");
  });

  afterEach(() => {
    cleanupTempPackageEnv(base, origStationPath);
  });

  it("journal records hooks merge; remove restores pre-install hooks.json", () => {
    const snapshot = cloneJson(JSON.parse(fs.readFileSync(hooksPath, "utf8")));

    runAtp(["install", "jrnl-hooks-pkg", "--project", "--force-config"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });

    const row = readManifestRow(projectDir, "jrnl-hooks-pkg");
    expect(row?.config_journal_path).toBeDefined();
    const journalAbs = path.join(
      projectDir,
      ".atp_safehouse",
      ...(row!.config_journal_path!.split("/"))
    );
    const journal = JSON.parse(fs.readFileSync(journalAbs, "utf8")) as ConfigJournalFileV1;
    expect(journal.entries.length).toBe(1);
    expect(journal.entries[0].kind).toBe("hooks");
    expect(journal.entries[0].fragments.type).toBe("hooks");

    const onDisk = JSON.parse(fs.readFileSync(hooksPath, "utf8")) as Record<string, unknown>;
    expect(sha256HexCanonicalJson(onDisk)).toBe(journal.entries[0].after_sha256);

    runAtp(["remove", "safehouse", "jrnl-hooks-pkg"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });

    expect(JSON.parse(fs.readFileSync(hooksPath, "utf8"))).toEqual(snapshot);
  });

  it("warns on drift and fragment-removes only package hooks when user edits hooks.json", () => {
    runAtp(["install", "jrnl-hooks-pkg", "--project", "--force-config"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });

    const edited = JSON.parse(fs.readFileSync(hooksPath, "utf8")) as Record<string, unknown>;
    edited.user_tamper_marker = true;
    fs.writeFileSync(hooksPath, JSON.stringify(edited, null, 2), "utf8");

    const r = runAtpSpawn(["remove", "safehouse", "jrnl-hooks-pkg"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    expect(r.status).toBe(0);
    expect(r.stderr + r.stdout).toMatch(/changed since install|fragment rollback only/i);

    const out = JSON.parse(fs.readFileSync(hooksPath, "utf8")) as Record<string, unknown>;
    expect(out.user_tamper_marker).toBe(true);
    const hooks = out.hooks as Record<string, unknown[]>;
    const list = hooks[eventName];
    expect(list.some((h) => (h as { id?: string }).id === "user-hook")).toBe(true);
    expect(list.some((h) => (h as { id?: string }).id === "jrnl-hook")).toBe(false);
  });
});

describe("Integration: config journal — hooks before_absent unlink on remove", () => {
  let base: string;
  let stationDir: string;
  let pkgDir: string;
  let projectDir: string;
  let origStationPath: string | undefined;
  let hooksPath: string;

  beforeEach(() => {
    const env = createTempPackageEnv("atp-jrnl-hooks-fresh");
    base = env.base;
    stationDir = env.stationDir;
    pkgDir = env.pkgDir;
    origStationPath = env.origStationPath;

    projectDir = path.join(base, "proj-hooks-fresh");
    fs.mkdirSync(path.join(projectDir, ".git"), { recursive: true });
    hooksPath = path.join(projectDir, ".cursor", "hooks.json");

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
      JSON.stringify(
        {
          version: 1,
          hooks: {
            afterFileEdit: [{ id: "solo-hook", command: "./solo.sh" }],
          },
        },
        null,
        2
      ),
      "utf8"
    );

    initPackage(pkgDir, stationDir, {
      type: "hook",
      name: "jrnl-fresh-hooks",
      version: "1.0.0",
      usage: "Fresh hooks journal",
      components: ["hooks.json"],
      catalogAdd: true,
    });

    runAtp(["safehouse", "init"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
    runAtp(["agent", "cursor"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
    fs.mkdirSync(path.dirname(hooksPath), { recursive: true });
    expect(fs.existsSync(hooksPath)).toBe(false);
  });

  afterEach(() => {
    cleanupTempPackageEnv(base, origStationPath);
  });

  it("records before_absent; remove deletes hooks.json entirely", () => {
    runAtp(["install", "jrnl-fresh-hooks", "--project"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });

    expect(fs.existsSync(hooksPath)).toBe(true);

    const row = readManifestRow(projectDir, "jrnl-fresh-hooks");
    expect(row?.config_journal_path).toBeDefined();
    const journalAbs = path.join(
      projectDir,
      ".atp_safehouse",
      ...(row!.config_journal_path!.split("/"))
    );
    const journal = JSON.parse(fs.readFileSync(journalAbs, "utf8")) as ConfigJournalFileV1;
    expect(journal.entries[0].kind).toBe("hooks");
    expect(journal.entries[0].before_absent).toBe(true);

    runAtp(["remove", "safehouse", "jrnl-fresh-hooks"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });

    expect(fs.existsSync(hooksPath)).toBe(false);
  });
});
