/**
 * Unit tests: config merge journal rollback (exact vs fragment).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import { canonicalJsonStringify, sha256HexCanonicalJson } from "../../src/config/canonical-json.js";
import {
  rollbackMergedConfigJournal,
  type ConfigMergeJournalEntryV1,
} from "../../src/config/config-merge-journal.js";
import { formatJsonDocument } from "../../src/file-ops/mcp-merge/mcp-json-helpers.js";

describe("rollbackMergedConfigJournal — Gemini settings.json path", () => {
  let tmp: string;
  let agentBase: string;
  let projectRoot: string;

  beforeEach(() => {
    tmp = path.join(os.tmpdir(), `atp-jrnl-gem-${Date.now()}`);
    projectRoot = path.join(tmp, "proj");
    agentBase = path.join(projectRoot, ".gemini");
    fs.mkdirSync(agentBase, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("exact-restore MCP entry when agent_relative_path is settings.json under .gemini/", () => {
    const beforeObj = { mcpServers: { keep: { url: "http://x" } }, other: true };
    const afterObj = {
      mcpServers: {
        keep: { url: "http://x" },
        pkg: { command: "c" },
      },
      other: true,
    };
    const settingsPath = path.join(agentBase, "settings.json");
    fs.writeFileSync(settingsPath, formatJsonDocument(afterObj), "utf8");

    const entry: ConfigMergeJournalEntryV1 = {
      agent_relative_path: "settings.json",
      kind: "mcp",
      before_absent: false,
      before_sha256: sha256HexCanonicalJson(beforeObj),
      after_sha256: sha256HexCanonicalJson(afterObj),
      fragments: { type: "mcp", server_names: ["pkg"] },
      before_canonical: canonicalJsonStringify(beforeObj),
    };

    const warnings = rollbackMergedConfigJournal(agentBase, projectRoot, [entry]);
    expect(warnings).toEqual([]);

    const restored = JSON.parse(fs.readFileSync(settingsPath, "utf8")) as Record<string, unknown>;
    expect(restored).toEqual(beforeObj);
  });

  it("reverse order: hooks then MCP entries both targeting settings.json restore fully", () => {
    const afterBoth = {
      mcpServers: { srv: { command: "m" } },
      hooks: { evt: [{ id: "h", command: "c" }] },
    };
    const afterMcpOnly = { mcpServers: { srv: { command: "m" } } };
    const beforeAll = { note: "user" };

    const settingsPath = path.join(agentBase, "settings.json");
    fs.writeFileSync(settingsPath, formatJsonDocument(afterBoth), "utf8");

    const mcpEntry: ConfigMergeJournalEntryV1 = {
      agent_relative_path: "settings.json",
      kind: "mcp",
      before_absent: false,
      before_sha256: sha256HexCanonicalJson(beforeAll),
      after_sha256: sha256HexCanonicalJson(afterMcpOnly),
      fragments: { type: "mcp", server_names: ["srv"] },
      before_canonical: canonicalJsonStringify(beforeAll),
    };

    const hooksEntry: ConfigMergeJournalEntryV1 = {
      agent_relative_path: "settings.json",
      kind: "hooks",
      before_absent: false,
      before_sha256: sha256HexCanonicalJson(afterMcpOnly),
      after_sha256: sha256HexCanonicalJson(afterBoth),
      fragments: { type: "hooks", hooks_delta: { evt: [{ id: "h", command: "c" }] } },
      before_canonical: canonicalJsonStringify(afterMcpOnly),
    };

    const warnings = rollbackMergedConfigJournal(agentBase, projectRoot, [mcpEntry, hooksEntry]);
    expect(warnings).toEqual([]);

    const restored = JSON.parse(fs.readFileSync(settingsPath, "utf8")) as Record<string, unknown>;
    expect(restored).toEqual(beforeAll);
  });
});

describe("rollbackMergedConfigJournal", () => {
  let tmp: string;
  let agentBase: string;
  let projectRoot: string;

  beforeEach(() => {
    tmp = path.join(os.tmpdir(), `atp-jrnl-${Date.now()}`);
    projectRoot = tmp;
    agentBase = path.join(tmp, ".cursor");
    fs.mkdirSync(agentBase, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("exact-restore when current file matches after_sha256", () => {
    const beforeObj = { mcpServers: { keep: { url: "http://x" } } };
    const afterObj = {
      mcpServers: {
        keep: { url: "http://x" },
        pkg: { command: "c" },
      },
    };
    const mcpPath = path.join(agentBase, "mcp.json");
    fs.writeFileSync(mcpPath, formatJsonDocument(afterObj), "utf8");

    const entry: ConfigMergeJournalEntryV1 = {
      agent_relative_path: "mcp.json",
      kind: "mcp",
      before_absent: false,
      before_sha256: sha256HexCanonicalJson(beforeObj),
      after_sha256: sha256HexCanonicalJson(afterObj),
      fragments: { type: "mcp", server_names: ["pkg"] },
      before_canonical: canonicalJsonStringify(beforeObj),
    };

    const warnings = rollbackMergedConfigJournal(agentBase, projectRoot, [entry]);
    expect(warnings).toEqual([]);

    const restored = JSON.parse(fs.readFileSync(mcpPath, "utf8")) as Record<string, unknown>;
    expect(restored).toEqual(beforeObj);
  });

  it("unlinks file when before_absent and current matches after", () => {
    const afterObj = { mcpServers: { only: { command: "x" } } };
    const mcpPath = path.join(agentBase, "mcp.json");
    fs.writeFileSync(mcpPath, formatJsonDocument(afterObj), "utf8");

    const entry: ConfigMergeJournalEntryV1 = {
      agent_relative_path: "mcp.json",
      kind: "mcp",
      before_absent: true,
      before_sha256: sha256HexCanonicalJson({}),
      after_sha256: sha256HexCanonicalJson(afterObj),
      fragments: { type: "mcp", server_names: ["only"] },
      before_canonical: canonicalJsonStringify({}),
    };

    const warnings = rollbackMergedConfigJournal(agentBase, projectRoot, [entry]);
    expect(warnings).toEqual([]);
    expect(fs.existsSync(mcpPath)).toBe(false);
  });

  it("fragment fallback when file was edited (hash mismatch)", () => {
    const afterObj = {
      mcpServers: {
        user: { url: "http://u" },
        pkg: { command: "p" },
      },
    };
    const tampered = {
      mcpServers: {
        user: { url: "http://u" },
        pkg: { command: "p" },
      },
      user_edit: true,
    };
    const mcpPath = path.join(agentBase, "mcp.json");
    fs.writeFileSync(mcpPath, formatJsonDocument(tampered), "utf8");

    const entry: ConfigMergeJournalEntryV1 = {
      agent_relative_path: "mcp.json",
      kind: "mcp",
      before_absent: false,
      before_sha256: sha256HexCanonicalJson({ mcpServers: { user: { url: "http://u" } } }),
      after_sha256: sha256HexCanonicalJson(afterObj),
      fragments: { type: "mcp", server_names: ["pkg"] },
      before_canonical: canonicalJsonStringify({ mcpServers: { user: { url: "http://u" } } }),
    };

    const warnings = rollbackMergedConfigJournal(agentBase, projectRoot, [entry]);
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toMatch(/changed since install|fragment rollback/i);

    const out = JSON.parse(fs.readFileSync(mcpPath, "utf8")) as Record<string, unknown>;
    expect(out.user_edit).toBe(true);
    expect(out.mcpServers).toEqual({ user: { url: "http://u" } });
  });

  it("exact-restore project-root .mcp.json when configRoot is project", () => {
    const proj = path.join(tmp, "repo");
    const claudeDir = path.join(proj, ".claude");
    fs.mkdirSync(claudeDir, { recursive: true });
    const beforeObj = { mcpServers: { keep: { url: "http://x" } } };
    const afterObj = {
      mcpServers: {
        keep: { url: "http://x" },
        pkg: { command: "c" },
      },
    };
    const mcpPath = path.join(proj, ".mcp.json");
    fs.writeFileSync(mcpPath, formatJsonDocument(afterObj), "utf8");

    const entry: ConfigMergeJournalEntryV1 = {
      agent_relative_path: ".mcp.json",
      configRoot: "project",
      kind: "mcp",
      before_absent: false,
      before_sha256: sha256HexCanonicalJson(beforeObj),
      after_sha256: sha256HexCanonicalJson(afterObj),
      fragments: { type: "mcp", server_names: ["pkg"] },
      before_canonical: canonicalJsonStringify(beforeObj),
    };

    const warnings = rollbackMergedConfigJournal(claudeDir, proj, [entry]);
    expect(warnings).toEqual([]);
    expect(JSON.parse(fs.readFileSync(mcpPath, "utf8"))).toEqual(beforeObj);
  });

  it("exact-restore user_home .claude.json when configRoot is user_home", () => {
    const fakeHome = path.join(tmp, "home-claude");
    const prevHome = process.env.HOME;
    process.env.HOME = fakeHome;
    try {
      fs.mkdirSync(fakeHome, { recursive: true });
      const beforeObj = { mcpServers: { keep: { url: "http://x" } } };
      const afterObj = {
        mcpServers: {
          keep: { url: "http://x" },
          pkg: { command: "c" },
        },
      };
      const claudeJson = path.join(fakeHome, ".claude.json");
      fs.writeFileSync(claudeJson, formatJsonDocument(afterObj), "utf8");

      const entry: ConfigMergeJournalEntryV1 = {
        agent_relative_path: ".claude.json",
        configRoot: "user_home",
        kind: "mcp",
        before_absent: false,
        before_sha256: sha256HexCanonicalJson(beforeObj),
        after_sha256: sha256HexCanonicalJson(afterObj),
        fragments: { type: "mcp", server_names: ["pkg"] },
        before_canonical: canonicalJsonStringify(beforeObj),
      };

      const agentLayer = path.join(tmp, "dummy-claude-dir");
      const warnings = rollbackMergedConfigJournal(agentLayer, path.join(tmp, "dummy-proj"), [entry]);
      expect(warnings).toEqual([]);
      expect(JSON.parse(fs.readFileSync(claudeJson, "utf8"))).toEqual(beforeObj);
    } finally {
      process.env.HOME = prevHome;
    }
  });

  it("exact-restore hooks when current matches after_sha256", () => {
    const beforeObj = {
      version: 1,
      hooks: { evt: [{ id: "u", command: "a" }] },
    };
    const afterObj = {
      version: 1,
      hooks: {
        evt: [
          { id: "u", command: "a" },
          { id: "p", command: "b" },
        ],
      },
    };
    const hooksPath = path.join(agentBase, "hooks.json");
    fs.writeFileSync(hooksPath, formatJsonDocument(afterObj), "utf8");

    const entry: ConfigMergeJournalEntryV1 = {
      agent_relative_path: "hooks.json",
      kind: "hooks",
      before_absent: false,
      before_sha256: sha256HexCanonicalJson(beforeObj),
      after_sha256: sha256HexCanonicalJson(afterObj),
      fragments: { type: "hooks", hooks_delta: { evt: [{ id: "p", command: "b" }] } },
      before_canonical: canonicalJsonStringify(beforeObj),
    };

    const warnings = rollbackMergedConfigJournal(agentBase, projectRoot, [entry]);
    expect(warnings).toEqual([]);
    expect(JSON.parse(fs.readFileSync(hooksPath, "utf8"))).toEqual(beforeObj);
  });

  it("unlinks hooks.json when before_absent and current matches after", () => {
    const afterObj = { version: 1, hooks: { x: [{ id: "1", command: "c" }] } };
    const hooksPath = path.join(agentBase, "hooks.json");
    fs.writeFileSync(hooksPath, formatJsonDocument(afterObj), "utf8");

    const entry: ConfigMergeJournalEntryV1 = {
      agent_relative_path: "hooks.json",
      kind: "hooks",
      before_absent: true,
      before_sha256: sha256HexCanonicalJson({}),
      after_sha256: sha256HexCanonicalJson(afterObj),
      fragments: { type: "hooks", hooks_delta: { x: [{ id: "1", command: "c" }] } },
      before_canonical: canonicalJsonStringify({}),
    };

    const warnings = rollbackMergedConfigJournal(agentBase, projectRoot, [entry]);
    expect(warnings).toEqual([]);
    expect(fs.existsSync(hooksPath)).toBe(false);
  });

  it("fragment fallback for hooks when file was edited (hash mismatch)", () => {
    const afterObj = {
      version: 1,
      hooks: {
        evt: [
          { id: "u", command: "keep" },
          { id: "p", command: "pkg" },
        ],
      },
    };
    const tampered = { ...afterObj, edited: true };
    const hooksPath = path.join(agentBase, "hooks.json");
    fs.writeFileSync(hooksPath, formatJsonDocument(tampered), "utf8");

    const beforeOnlyUser = {
      version: 1,
      hooks: { evt: [{ id: "u", command: "keep" }] },
    };

    const entry: ConfigMergeJournalEntryV1 = {
      agent_relative_path: "hooks.json",
      kind: "hooks",
      before_absent: false,
      before_sha256: sha256HexCanonicalJson(beforeOnlyUser),
      after_sha256: sha256HexCanonicalJson(afterObj),
      fragments: { type: "hooks", hooks_delta: { evt: [{ id: "p", command: "pkg" }] } },
      before_canonical: canonicalJsonStringify(beforeOnlyUser),
    };

    const warnings = rollbackMergedConfigJournal(agentBase, projectRoot, [entry]);
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toMatch(/changed since install|fragment rollback/i);

    const out = JSON.parse(fs.readFileSync(hooksPath, "utf8")) as Record<string, unknown>;
    expect(out.edited).toBe(true);
    expect(out.hooks).toEqual({ evt: [{ id: "u", command: "keep" }] });
  });
});
