/**
 * Integration: Gemini Safehouse config merge journal into `.gemini/settings.json`.
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

describe("Integration: Gemini config journal — MCP exact rollback after --force-config", () => {
  let base: string;
  let stationDir: string;
  let pkgDir: string;
  let projectDir: string;
  let settingsPath: string;

  const initialSettingsDoc = {
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
    const env = createTempPackageEnv("atp-gem-jrnl-mcp");
    base = env.base;
    stationDir = env.stationDir;
    pkgDir = env.pkgDir;

    projectDir = path.join(base, "gem-proj");
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
      JSON.stringify(pkgPayload, null, 2),
      "utf8"
    );

    initPackage(pkgDir, stationDir, {
      type: "mcp",
      name: "gem-jrnl-mcp-pkg",
      version: "1.0.0",
      usage: "Gemini journal MCP test",
      components: ["packaged-mcp.json"],
      catalogAdd: true,
    });

    runAtp(["safehouse", "init"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
    runAtp(["agent", "gemini"], { cwd: projectDir, env: { STATION_PATH: stationDir } });

    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(settingsPath, JSON.stringify(initialSettingsDoc, null, 2), "utf8");
  });

  afterEach(() => {
    cleanupTempPackageEnv(base);
  });

  it("writes journal targeting settings.json; remove restores exact pre-install file", () => {
    const snapshot = cloneJson(JSON.parse(fs.readFileSync(settingsPath, "utf8")));

    runAtp(["install", "gem-jrnl-mcp-pkg", "--project", "--force-config"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });

    const row = readManifestRow(projectDir, "gem-jrnl-mcp-pkg");
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
    expect(e.agent_relative_path).toBe("settings.json");
    expect(e.before_absent).toBe(false);
    expect(e.fragments.type).toBe("mcp");
    if (e.fragments.type === "mcp") {
      expect(e.fragments.server_names).toContain("atp-force-mcp");
    }
    expect(e.before_sha256).not.toBe(e.after_sha256);

    const onDisk = JSON.parse(fs.readFileSync(settingsPath, "utf8")) as Record<string, unknown>;
    expect(sha256HexCanonicalJson(onDisk)).toBe(e.after_sha256);

    runAtp(["remove", "safehouse", "gem-jrnl-mcp-pkg"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });

    const restored = JSON.parse(fs.readFileSync(settingsPath, "utf8")) as Record<string, unknown>;
    expect(restored).toEqual(snapshot);
    expect(fs.existsSync(journalAbs)).toBe(false);
  });

  it("warns on drift and fragment-removes only package servers when user edits settings.json", () => {
    runAtp(["install", "gem-jrnl-mcp-pkg", "--project", "--force-config"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });

    const edited = JSON.parse(fs.readFileSync(settingsPath, "utf8")) as Record<string, unknown>;
    edited.user_tamper_marker = true;
    fs.writeFileSync(settingsPath, JSON.stringify(edited, null, 2), "utf8");

    const r = runAtpSpawn(["remove", "safehouse", "gem-jrnl-mcp-pkg"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    expect(r.status).toBe(0);
    expect(r.stderr).toMatch(/changed since install|fragment rollback only/i);

    const out = JSON.parse(fs.readFileSync(settingsPath, "utf8")) as Record<string, unknown>;
    expect(out.user_tamper_marker).toBe(true);
    const servers = out.mcpServers as Record<string, unknown>;
    expect(servers["user-preserved"]).toEqual({ url: "http://127.0.0.1:7" });
    expect(servers["atp-force-mcp"]).toBeUndefined();
  });
});

describe("Integration: Gemini config journal — MCP before_absent unlink on remove", () => {
  let base: string;
  let stationDir: string;
  let pkgDir: string;
  let projectDir: string;
  let settingsPath: string;

  beforeEach(() => {
    const env = createTempPackageEnv("atp-gem-jrnl-fresh");
    base = env.base;
    stationDir = env.stationDir;
    pkgDir = env.pkgDir;

    projectDir = path.join(base, "gem-proj2");
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
      path.join(pkgDir, "only-mcp.json"),
      JSON.stringify({
        mcpServers: { solo_srv: { command: "solo" } },
      }),
      "utf8"
    );

    initPackage(pkgDir, stationDir, {
      type: "mcp",
      name: "gem-jrnl-fresh-mcp",
      version: "1.0.0",
      usage: "Gemini fresh MCP journal",
      components: ["only-mcp.json"],
      catalogAdd: true,
    });

    runAtp(["safehouse", "init"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
    runAtp(["agent", "gemini"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    expect(fs.existsSync(settingsPath)).toBe(false);
  });

  afterEach(() => {
    cleanupTempPackageEnv(base);
  });

  it("records before_absent; remove deletes settings.json entirely", () => {
    runAtp(["install", "gem-jrnl-fresh-mcp", "--project"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });

    expect(fs.existsSync(settingsPath)).toBe(true);

    const row = readManifestRow(projectDir, "gem-jrnl-fresh-mcp");
    expect(row?.config_journal_path).toBeDefined();
    const journalAbs = path.join(
      projectDir,
      ".atp_safehouse",
      ...(row!.config_journal_path!.split("/"))
    );
    const journal = JSON.parse(fs.readFileSync(journalAbs, "utf8")) as ConfigJournalFileV1;
    expect(journal.entries[0].kind).toBe("mcp");
    expect(journal.entries[0].agent_relative_path).toBe("settings.json");
    expect(journal.entries[0].before_absent).toBe(true);

    runAtp(["remove", "safehouse", "gem-jrnl-fresh-mcp"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });

    expect(fs.existsSync(settingsPath)).toBe(false);
  });
});

describe("Integration: Gemini config journal — hooks exact rollback after --force-config", () => {
  let base: string;
  let stationDir: string;
  let pkgDir: string;
  let projectDir: string;
  let settingsPath: string;
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
    const env = createTempPackageEnv("atp-gem-jrnl-hooks");
    base = env.base;
    stationDir = env.stationDir;
    pkgDir = env.pkgDir;

    projectDir = path.join(base, "gem-proj-hooks");
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
      name: "gem-jrnl-hooks-pkg",
      version: "1.0.0",
      usage: "Gemini journal hooks test",
      components: ["hooks.json"],
      catalogAdd: true,
    });

    runAtp(["safehouse", "init"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
    runAtp(["agent", "gemini"], { cwd: projectDir, env: { STATION_PATH: stationDir } });

    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(settingsPath, JSON.stringify(initialHooksDoc, null, 2), "utf8");
  });

  afterEach(() => {
    cleanupTempPackageEnv(base);
  });

  it("journal records hooks merge into settings.json; remove restores pre-install file", () => {
    const snapshot = cloneJson(JSON.parse(fs.readFileSync(settingsPath, "utf8")));

    runAtp(["install", "gem-jrnl-hooks-pkg", "--project", "--force-config"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });

    const row = readManifestRow(projectDir, "gem-jrnl-hooks-pkg");
    expect(row?.config_journal_path).toBeDefined();
    const journalAbs = path.join(
      projectDir,
      ".atp_safehouse",
      ...(row!.config_journal_path!.split("/"))
    );
    const journal = JSON.parse(fs.readFileSync(journalAbs, "utf8")) as ConfigJournalFileV1;
    expect(journal.entries.length).toBe(1);
    expect(journal.entries[0].kind).toBe("hooks");
    expect(journal.entries[0].agent_relative_path).toBe("settings.json");
    expect(journal.entries[0].fragments.type).toBe("hooks");

    const onDisk = JSON.parse(fs.readFileSync(settingsPath, "utf8")) as Record<string, unknown>;
    expect(sha256HexCanonicalJson(onDisk)).toBe(journal.entries[0].after_sha256);

    runAtp(["remove", "safehouse", "gem-jrnl-hooks-pkg"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });

    expect(JSON.parse(fs.readFileSync(settingsPath, "utf8"))).toEqual(snapshot);
  });

  it("warns on drift and fragment-removes only package hooks when user edits settings.json", () => {
    runAtp(["install", "gem-jrnl-hooks-pkg", "--project", "--force-config"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });

    const edited = JSON.parse(fs.readFileSync(settingsPath, "utf8")) as Record<string, unknown>;
    edited.user_tamper_marker = true;
    fs.writeFileSync(settingsPath, JSON.stringify(edited, null, 2), "utf8");

    const r = runAtpSpawn(["remove", "safehouse", "gem-jrnl-hooks-pkg"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });
    expect(r.status).toBe(0);
    expect(r.stderr + r.stdout).toMatch(/changed since install|fragment rollback only/i);

    const out = JSON.parse(fs.readFileSync(settingsPath, "utf8")) as Record<string, unknown>;
    expect(out.user_tamper_marker).toBe(true);
    const hooks = out.hooks as Record<string, unknown[]>;
    const list = hooks[eventName];
    expect(list.some((h) => (h as { id?: string }).id === "user-hook")).toBe(true);
    expect(list.some((h) => (h as { id?: string }).id === "jrnl-hook")).toBe(false);
  });
});

describe("Integration: Gemini config journal — hooks before_absent unlink on remove", () => {
  let base: string;
  let stationDir: string;
  let pkgDir: string;
  let projectDir: string;
  let settingsPath: string;

  beforeEach(() => {
    const env = createTempPackageEnv("atp-gem-jrnl-hooks-fresh");
    base = env.base;
    stationDir = env.stationDir;
    pkgDir = env.pkgDir;

    projectDir = path.join(base, "gem-proj-hooks-fresh");
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
      name: "gem-jrnl-fresh-hooks",
      version: "1.0.0",
      usage: "Gemini fresh hooks journal",
      components: ["hooks.json"],
      catalogAdd: true,
    });

    runAtp(["safehouse", "init"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
    runAtp(["agent", "gemini"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    expect(fs.existsSync(settingsPath)).toBe(false);
  });

  afterEach(() => {
    cleanupTempPackageEnv(base);
  });

  it("records before_absent; remove deletes settings.json entirely", () => {
    runAtp(["install", "gem-jrnl-fresh-hooks", "--project"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });

    expect(fs.existsSync(settingsPath)).toBe(true);

    const row = readManifestRow(projectDir, "gem-jrnl-fresh-hooks");
    expect(row?.config_journal_path).toBeDefined();
    const journalAbs = path.join(
      projectDir,
      ".atp_safehouse",
      ...(row!.config_journal_path!.split("/"))
    );
    const journal = JSON.parse(fs.readFileSync(journalAbs, "utf8")) as ConfigJournalFileV1;
    expect(journal.entries[0].kind).toBe("hooks");
    expect(journal.entries[0].agent_relative_path).toBe("settings.json");
    expect(journal.entries[0].before_absent).toBe(true);

    runAtp(["remove", "safehouse", "gem-jrnl-fresh-hooks"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });

    expect(fs.existsSync(settingsPath)).toBe(false);
  });
});

describe("Integration: Gemini config journal — multi-part MCP then hooks into one settings.json", () => {
  let base: string;
  let stationDir: string;
  let pkgDir: string;
  let projectDir: string;
  let settingsPath: string;
  const eventName = "beforeSubmit";

  const pkgMcp = {
    mcpServers: {
      "gem-dual-mcp": { command: "dual-cmd", args: ["1"] },
    },
  };

  const pkgHooks = {
    version: 1,
    hooks: {
      [eventName]: [{ id: "gem-dual-hook", command: "./dual.sh" }],
    },
  };

  beforeEach(() => {
    const env = createTempPackageEnv("atp-gem-jrnl-dual");
    base = env.base;
    stationDir = env.stationDir;
    pkgDir = env.pkgDir;

    projectDir = path.join(base, "gem-proj-dual");
    fs.mkdirSync(path.join(projectDir, ".git"), { recursive: true });
    settingsPath = path.join(projectDir, ".gemini", "settings.json");

    const o = atpCwd(pkgDir, stationDir);
    runAtp(["station", "init"], o);
    fs.writeFileSync(
      path.join(stationDir, "atp-config.yaml"),
      `configuration:
  version: 0.1.0
  agent-paths:
    gemini:
      project_path: .gemini/
`
    );

    runAtp(["create", "package"], o);
    fs.writeFileSync(
      path.join(pkgDir, "packaged-mcp.json"),
      JSON.stringify(pkgMcp, null, 2),
      "utf8"
    );
    fs.writeFileSync(path.join(pkgDir, "hooks.json"), JSON.stringify(pkgHooks, null, 2), "utf8");

    runAtp(["package", "name", "gem-jrnl-dual"], o);
    runAtp(["package", "version", "1.0.0"], o);
    runAtp(["package", "newpart", "mcp"], o);
    runAtp(["package", "part", "1", "usage", "Dual MCP part"], o);
    runAtp(["package", "part", "1", "component", "packaged-mcp.json"], o);
    runAtp(["package", "newpart", "hook"], o);
    runAtp(["package", "part", "2", "usage", "Dual hook part"], o);
    runAtp(["package", "part", "2", "component", "hooks.json"], o);
    runAtp(["validate", "package"], o);
    runAtp(["catalog", "add", "package"], o);

    runAtp(["safehouse", "init"], { cwd: projectDir, env: { STATION_PATH: stationDir } });
    runAtp(["agent", "gemini"], { cwd: projectDir, env: { STATION_PATH: stationDir } });

    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(
      settingsPath,
      JSON.stringify(
        {
          user_marker: true,
          mcpServers: { "user-kept": { url: "http://keep.example" } },
          version: 1,
          hooks: {
            [eventName]: [{ id: "user-hook", command: "./user-only.sh" }],
          },
        },
        null,
        2
      ),
      "utf8"
    );
  });

  afterEach(() => {
    cleanupTempPackageEnv(base);
  });

  it("journal has two entries for settings.json; remove restores combined pre-install state", () => {
    const snapshot = cloneJson(JSON.parse(fs.readFileSync(settingsPath, "utf8")));

    runAtp(["install", "gem-jrnl-dual", "--project", "--force-config"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });

    const row = readManifestRow(projectDir, "gem-jrnl-dual");
    expect(row?.config_journal_path).toBeDefined();
    const journalAbs = path.join(
      projectDir,
      ".atp_safehouse",
      ...(row!.config_journal_path!.split("/"))
    );
    const journal = JSON.parse(fs.readFileSync(journalAbs, "utf8")) as ConfigJournalFileV1;
    expect(journal.entries.length).toBe(2);
    expect(journal.entries[0].kind).toBe("mcp");
    expect(journal.entries[0].agent_relative_path).toBe("settings.json");
    expect(journal.entries[1].kind).toBe("hooks");
    expect(journal.entries[1].agent_relative_path).toBe("settings.json");

    const merged = JSON.parse(fs.readFileSync(settingsPath, "utf8")) as Record<string, unknown>;
    const servers = merged.mcpServers as Record<string, unknown>;
    expect(servers["user-kept"]).toEqual({ url: "http://keep.example" });
    expect(servers["gem-dual-mcp"]).toEqual({ command: "dual-cmd", args: ["1"] });
    const hooks = merged.hooks as Record<string, unknown[]>;
    const list = hooks[eventName] as { id?: string }[];
    expect(list.some((h) => h.id === "user-hook")).toBe(true);
    expect(list.some((h) => h.id === "gem-dual-hook")).toBe(true);

    runAtp(["remove", "safehouse", "gem-jrnl-dual"], {
      cwd: projectDir,
      env: { STATION_PATH: stationDir },
    });

    expect(JSON.parse(fs.readFileSync(settingsPath, "utf8"))).toEqual(snapshot);
    expect(fs.existsSync(journalAbs)).toBe(false);
  });
});
