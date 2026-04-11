/**
 * Safehouse journalling for merged agent JSON (MCP, hooks): hashes + fragments for rollback.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { removeHookHandlersFromDocument } from "../file-ops/hooks-merge/hooks-json-merge.js";
import {
  applyCodexHooksFeatureRollbackToRoot,
  parseCodexConfigTomlRoot,
  removeMcpServerNamesFromCodexTomlParsedRoot,
  stringifyCodexConfigTomlRoot,
} from "../file-ops/mcp-merge/mcp-codex-toml-merge.js";
import { formatJsonDocument } from "../file-ops/mcp-merge/mcp-json-helpers.js";
import { removeMcpServersByNamesFromDocument } from "../file-ops/mcp-merge/remove-mcp-servers.js";

import { sha256HexCanonicalJson } from "./canonical-json.js";

/** Journal file on disk (`config-journal/<name>.json`). */
export const CONFIG_JOURNAL_DIR = "config-journal";

export const CONFIG_JOURNAL_FILE_VERSION = 1;

/** One merge applied during install (e.g. `.cursor/mcp.json`, `.cursor/hooks.json`, or `.gemini/settings.json`). */
export interface ConfigMergeJournalEntryV1 {
  agent_relative_path: string;
  /**
   * When `project`, {@link ConfigMergeJournalEntryV1.agent_relative_path} is under the repo root
   * (e.g. `.mcp.json`). When `user_home`, under the user home directory (e.g. `.claude.json`). Default: agent layer.
   */
  configRoot?: "layer" | "project" | "user_home";
  kind: "mcp" | "hooks" | "codex_features";
  /** True when the target file did not exist before this merge. */
  before_absent: boolean;
  before_sha256: string;
  after_sha256: string;
  fragments:
    | { type: "mcp"; server_names: string[] }
    | { type: "hooks"; hooks_delta: Record<string, unknown[]> }
    | { type: "codex_features"; codex_hooks_before: boolean | null };
  /** Canonical JSON of the parsed document before merge (empty object when absent). */
  before_canonical: string;
}

export interface ConfigJournalFileV1 {
  version: typeof CONFIG_JOURNAL_FILE_VERSION;
  entries: ConfigMergeJournalEntryV1[];
}

/**
 * Safe filename stem for a package name.
 *
 * @param packageName - Catalog package name.
 * @returns Filesystem-safe stem.
 */
export function configJournalFileStem(packageName: string): string {
  return packageName.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

/**
 * Relative path from Safehouse root to the journal file for a package.
 *
 * @param packageName - Installed package name.
 * @returns Posix-style relative path (e.g. `config-journal/foo.json`).
 */
export function configJournalRelativePath(packageName: string): string {
  return path.posix.join(CONFIG_JOURNAL_DIR, `${configJournalFileStem(packageName)}.json`);
}

/**
 * Write journal entries for an installed package.
 *
 * @param safehousePath - Absolute `.atp_safehouse` path.
 * @param packageName - Package name.
 * @param entries - Merge records (empty array deletes any existing journal file).
 */
export function writePackageConfigJournalFile(
  safehousePath: string,
  packageName: string,
  entries: ConfigMergeJournalEntryV1[]
): void {
  const rel = configJournalRelativePath(packageName);
  const abs = path.join(safehousePath, ...rel.split("/"));
  const dir = path.dirname(abs);
  if (entries.length === 0) {
    if (fs.existsSync(abs)) {
      fs.unlinkSync(abs);
    }
    return;
  }
  fs.mkdirSync(dir, { recursive: true });
  const body: ConfigJournalFileV1 = {
    version: CONFIG_JOURNAL_FILE_VERSION,
    entries,
  };
  fs.writeFileSync(abs, `${JSON.stringify(body, null, 2)}\n`, "utf8");
}

/**
 * Load journal entries for a package, or empty when missing / invalid.
 *
 * @param safehousePath - Absolute `.atp_safehouse` path.
 * @param relativePath - Path as stored on the manifest row.
 */
export function loadPackageConfigJournalEntries(
  safehousePath: string,
  relativePath: string
): ConfigMergeJournalEntryV1[] {
  const abs = path.join(safehousePath, ...relativePath.split(/[/\\]/));
  if (!fs.existsSync(abs)) {
    return [];
  }
  try {
    const raw = JSON.parse(fs.readFileSync(abs, "utf8")) as ConfigJournalFileV1;
    if (raw?.version !== CONFIG_JOURNAL_FILE_VERSION || !Array.isArray(raw.entries)) {
      return [];
    }
    return raw.entries;
  } catch {
    return [];
  }
}

/**
 * Delete a package journal file if present.
 *
 * @param safehousePath - Absolute `.atp_safehouse` path.
 * @param relativePath - Manifest `config_journal_path` value.
 */
export function deletePackageConfigJournalFile(
  safehousePath: string,
  relativePath: string | undefined
): void {
  if (!relativePath) return;
  const abs = path.join(safehousePath, ...relativePath.split(/[/\\]/));
  if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
    fs.unlinkSync(abs);
  }
}

function readConfigMergeDocumentRoot(absolutePath: string): Record<string, unknown> {
  const raw = fs.readFileSync(absolutePath, "utf8");
  if (absolutePath.toLowerCase().endsWith(".toml")) {
    return parseCodexConfigTomlRoot(raw);
  }
  const parsed = JSON.parse(raw) as unknown;
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Expected JSON object in ${absolutePath}`);
  }
  return parsed as Record<string, unknown>;
}

function journalConfigRootBase(
  entry: ConfigMergeJournalEntryV1,
  agentLayerRoot: string,
  projectRoot: string
): string {
  if (entry.configRoot === "project") {
    return projectRoot;
  }
  if (entry.configRoot === "user_home") {
    return os.homedir();
  }
  return agentLayerRoot;
}

function loadJournalRollbackCurrentState(
  dest: string,
  agentRelativePath: string,
  warnings: string[]
): { currentValue: unknown; currentSha: string } {
  if (!fs.existsSync(dest)) {
    const empty: Record<string, unknown> = {};
    return { currentValue: empty, currentSha: sha256HexCanonicalJson(empty) };
  }
  try {
    const currentValue = readConfigMergeDocumentRoot(dest);
    return { currentValue, currentSha: sha256HexCanonicalJson(currentValue) };
  } catch (e) {
    warnings.push(
      `ATP: could not parse ${agentRelativePath} during journal rollback; trying fragment removal only. ${(e as Error).message}`
    );
    const empty: Record<string, unknown> = {};
    return { currentValue: empty, currentSha: "" };
  }
}

/**
 * @returns True when the entry was fully handled (caller should continue the loop).
 */
function tryExactJournalRollback(
  entry: ConfigMergeJournalEntryV1,
  dest: string,
  currentSha: string,
  warnings: string[]
): boolean {
  if (currentSha !== entry.after_sha256) {
    return false;
  }

  if (entry.before_absent) {
    if (fs.existsSync(dest)) {
      fs.unlinkSync(dest);
    }
    return true;
  }

  let restored: unknown;
  try {
    restored = JSON.parse(entry.before_canonical) as unknown;
  } catch {
    warnings.push(`ATP: invalid before_canonical in journal for ${entry.agent_relative_path}; skipping.`);
    return true;
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (dest.toLowerCase().endsWith(".toml")) {
    if (restored === null || typeof restored !== "object" || Array.isArray(restored)) {
      warnings.push(
        `ATP: invalid before_canonical for TOML ${entry.agent_relative_path}; skipping exact restore.`
      );
      return true;
    }
    fs.writeFileSync(
      dest,
      stringifyCodexConfigTomlRoot(restored as Record<string, unknown>),
      "utf8"
    );
    return true;
  }
  fs.writeFileSync(dest, formatJsonDocument(restored), "utf8");
  return true;
}

function applyMcpFragmentRollback(
  dest: string,
  currentValue: unknown,
  serverNames: string[]
): void {
  if (dest.toLowerCase().endsWith(".toml")) {
    const { root, changed } = removeMcpServerNamesFromCodexTomlParsedRoot(
      currentValue as Record<string, unknown>,
      serverNames
    );
    if (changed) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, stringifyCodexConfigTomlRoot(root), "utf8");
    }
    return;
  }
  const { document, changed } = removeMcpServersByNamesFromDocument(currentValue, serverNames);
  if (changed) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, formatJsonDocument(document), "utf8");
  }
}

function applyHooksFragmentRollback(
  dest: string,
  currentValue: unknown,
  hooksDelta: Record<string, unknown[]>
): void {
  const pkgPayload = { hooks: hooksDelta };
  const { document, changed } = removeHookHandlersFromDocument(currentValue, pkgPayload);
  if (changed) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, formatJsonDocument(document), "utf8");
  }
}

function applyCodexFeaturesFragmentRollback(
  dest: string,
  currentValue: unknown,
  codexHooksBefore: boolean | null
): void {
  const { root: rolled, changed: featChanged } = applyCodexHooksFeatureRollbackToRoot(
    currentValue as Record<string, unknown>,
    codexHooksBefore
  );
  if (featChanged) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, stringifyCodexConfigTomlRoot(rolled), "utf8");
  }
}

function applyDriftFragmentRollback(
  entry: ConfigMergeJournalEntryV1,
  dest: string,
  currentValue: unknown,
  warnings: string[]
): void {
  warnings.push(
    `ATP: ${entry.agent_relative_path} changed since install (expected after SHA ${entry.after_sha256.slice(0, 12)}…); applying fragment rollback only.`
  );

  const { fragments } = entry;
  if (fragments.type === "mcp") {
    applyMcpFragmentRollback(dest, currentValue, fragments.server_names);
    return;
  }
  if (fragments.type === "hooks") {
    applyHooksFragmentRollback(dest, currentValue, fragments.hooks_delta);
    return;
  }
  applyCodexFeaturesFragmentRollback(dest, currentValue, fragments.codex_hooks_before);
}

/**
 * Roll back merged config using journal entries (reverse order).
 *
 * When the on-disk file still hashes to `after_sha256`, restores `before_canonical` or unlinks
 * when `before_absent`. Otherwise warns and removes only ATP fragments (server names / hook handlers).
 *
 * @param agentLayerRoot - Agent layer directory (e.g. project `.cursor/` or `.claude/`).
 * @param projectRoot - Repository root (for entries with `configRoot: "project"`).
 * @param entries - Journal entries in forward install order.
 * @returns Human-readable warnings (e.g. drift detected).
 */
export function rollbackMergedConfigJournal(
  agentLayerRoot: string,
  projectRoot: string,
  entries: ConfigMergeJournalEntryV1[]
): string[] {
  const warnings: string[] = [];
  const reversed = [...entries].reverse();

  for (const entry of reversed) {
    const rel = entry.agent_relative_path.replace(/\\/g, "/");
    if (rel.includes("..") || path.posix.isAbsolute(rel)) {
      warnings.push(`ATP: refusing journal rollback path "${rel}" (must be relative with no ..).`);
      continue;
    }
    const dest = path.join(journalConfigRootBase(entry, agentLayerRoot, projectRoot), rel);
    const { currentValue, currentSha } = loadJournalRollbackCurrentState(dest, entry.agent_relative_path, warnings);

    if (tryExactJournalRollback(entry, dest, currentSha, warnings)) {
      continue;
    }

    applyDriftFragmentRollback(entry, dest, currentValue, warnings);
  }

  return warnings;
}
