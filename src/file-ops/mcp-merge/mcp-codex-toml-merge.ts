/**
 * Merge packaged MCP JSON (`mcpServers`) into Codex **`config.toml`** under `[mcp_servers.<name>]`
 * (in-memory as `mcp_servers` tables). Reuses the same name-level conflict rules as JSON merges.
 */

import * as TOML from "@iarna/toml";

import { McpMergeInvalidDocumentError } from "./errors.js";
import { mergeMcpServerRecordsByName, type McpMergeOptions, type McpMergeOutcomeStatus } from "./mcp-json-merge.js";
import { isPlainObject, normalizeMcpServersPayload } from "./mcp-json-helpers.js";

export interface McpCodexTomlMergeOutcome {
  status: McpMergeOutcomeStatus;
  /** Full `config.toml` body (UTF-8, trailing newline when non-empty). */
  content: string;
  mcpServersTouched: boolean;
}

/**
 * Read `mcp_servers` tables from a parsed Codex config root (TOML `[mcp_servers.x]`).
 */
export function readMcpServersFromCodexTomlRoot(root: Record<string, unknown>): Record<string, unknown> {
  if (!("mcp_servers" in root)) {
    return {};
  }
  const m = root.mcp_servers;
  if (m === undefined) {
    return {};
  }
  if (!isPlainObject(m)) {
    throw new McpMergeInvalidDocumentError('Existing document: "mcp_servers" must be a table when present.');
  }
  return { ...m };
}

/**
 * Parse Codex `config.toml` to a plain object root, or `{}` when missing/blank.
 */
export function parseCodexConfigTomlRoot(raw: string | null | undefined): Record<string, unknown> {
  if (raw === null || raw === undefined || raw.trim() === "") {
    return {};
  }
  try {
    const v = TOML.parse(raw) as unknown;
    if (v === null || typeof v !== "object" || Array.isArray(v)) {
      throw new McpMergeInvalidDocumentError("Codex config.toml root must be a table.");
    }
    return v as Record<string, unknown>;
  } catch (e) {
    if (e instanceof McpMergeInvalidDocumentError) {
      throw e;
    }
    throw new McpMergeInvalidDocumentError(`Invalid TOML in Codex config: ${(e as Error).message}`);
  }
}

/** Serialize a Codex config root to TOML (UTF-8, trailing newline when non-empty). */
export function stringifyCodexConfigTomlRoot(root: Record<string, unknown>): string {
  const body = TOML.stringify(root as TOML.JsonMap);
  return body === "" ? "" : `${body}\n`;
}

/**
 * Merge `incoming` JSON (`mcpServers`) into an existing or new Codex `config.toml` body.
 *
 * @param existingRaw - Current file UTF-8, or null/undefined/empty when missing.
 */
export function mergeCodexConfigTomlMcp(
  existingRaw: string | null | undefined,
  incoming: unknown,
  options: McpMergeOptions = {}
): McpCodexTomlMergeOutcome {
  if (options.skipConfig) {
    if (existingRaw === null || existingRaw === undefined || existingRaw.trim() === "") {
      return { status: "skipped", content: "", mcpServersTouched: false };
    }
    return { status: "skipped", content: existingRaw, mcpServersTouched: false };
  }

  const root = parseCodexConfigTomlRoot(existingRaw);

  const mcpBefore = readMcpServersFromCodexTomlRoot(root);
  const payload = normalizeMcpServersPayload(incoming);
  const { mergedServers, changed } = mergeMcpServerRecordsByName(
    mcpBefore,
    payload.mcpServers,
    options
  );

  const nextRoot: Record<string, unknown> = {
    ...root,
    mcp_servers: mergedServers,
  };

  return {
    status: changed ? "applied" : "noop",
    content: stringifyCodexConfigTomlRoot(nextRoot),
    mcpServersTouched: changed,
  };
}

/**
 * Remove named MCP servers from a Codex `config.toml` string (uninstall / fragment rollback).
 */
export function removeMcpServerNamesFromCodexConfigToml(
  existingRaw: string,
  serverNames: readonly string[]
): { content: string; changed: boolean } {
  if (existingRaw.trim() === "" || serverNames.length === 0) {
    return { content: existingRaw, changed: false };
  }
  const root = parseCodexConfigTomlRoot(existingRaw);
  const servers = { ...readMcpServersFromCodexTomlRoot(root) };
  let changed = false;
  for (const name of serverNames) {
    if (name in servers) {
      delete servers[name];
      changed = true;
    }
  }
  if (!changed) {
    return { content: existingRaw, changed: false };
  }
  const nextRoot: Record<string, unknown> = { ...root, mcp_servers: servers };
  return { content: stringifyCodexConfigTomlRoot(nextRoot), changed: true };
}

/**
 * Remove named servers from a parsed Codex config root (journal fragment rollback).
 */
export function removeMcpServerNamesFromCodexTomlParsedRoot(
  root: Record<string, unknown>,
  serverNames: readonly string[]
): { root: Record<string, unknown>; changed: boolean } {
  const servers = { ...readMcpServersFromCodexTomlRoot(root) };
  let changed = false;
  for (const name of serverNames) {
    if (name in servers) {
      delete servers[name];
      changed = true;
    }
  }
  if (!changed) {
    return { root, changed: false };
  }
  return { root: { ...root, mcp_servers: servers }, changed: true };
}
