/**
 * Destination paths and markdown placeholder patching for package asset copy.
 */

import path from "node:path";

import type { PackageAsset } from "./types.js";

/**
 * When legacy `copyPackageAssets` runs for Claude (project layer), MCP targets repo `.mcp.json` and
 * packaged `hooks.json` merges into `.claude/settings.json`.
 */
export interface LegacyClaudeMergeContext {
  projectRoot: string;
  claudeAgentDir: string;
}

const ASSET_TYPES_TO_AGENT_SUBDIR: Record<string, string> = {
  skill: "skills",
  rule: "rules",
  prompt: "prompts",
  "sub-agent": "rules",
  program: "bin",
};

/**
 * Resolve destination directory and file path for a non-program asset under the agent tree.
 * Hook packages follow Cursor layout: `hooks.json` at the agent root, other files under `hooks/`.
 *
 * @param agentBase - Agent project directory (e.g. `.cursor/`).
 * @param asset - Asset row (must not be `program`).
 * @returns Parent directory to create and final file path.
 */
function isCodexAgentBase(agentBase: string): boolean {
  return path.basename(path.normalize(agentBase)) === ".codex";
}

export function agentDestinationForAsset(
  agentBase: string,
  asset: Pick<PackageAsset, "type" | "path">
): { dir: string; filePath: string } {
  const baseName = path.basename(asset.path);
  if (asset.type === "mcp") {
    const mcpFile = isCodexAgentBase(agentBase) ? "config.toml" : "mcp.json";
    return { dir: agentBase, filePath: path.join(agentBase, mcpFile) };
  }
  if (asset.type === "hook") {
    if (baseName === "hooks.json") {
      return { dir: agentBase, filePath: path.join(agentBase, "hooks.json") };
    }
    const dir = path.join(agentBase, "hooks");
    return { dir, filePath: path.join(dir, baseName) };
  }
  const subdir = ASSET_TYPES_TO_AGENT_SUBDIR[asset.type] ?? "skills";
  const dir = path.join(agentBase, subdir);
  return { dir, filePath: path.join(dir, baseName) };
}

/**
 * Uninstall path for files written by Cursor / Gemini {@link AgentProvider} (project layer).
 * Does not remove merged JSON wholesale (handled via journal / fragment strip) or provider skill trees.
 *
 * @param agentName - Safehouse agent key (e.g. `cursor`, `gemini`).
 * @param agentBase - Absolute agent project directory.
 * @param asset - Manifest row (not `program`).
 */
export function agentProviderRemovalDestination(
  agentName: string,
  agentBase: string,
  asset: Pick<PackageAsset, "type" | "path">
): { filePath: string } {
  const baseName = path.basename(asset.path);
  const agent = agentName.trim().toLowerCase();

  if (asset.type === "mcp") {
    if (agent === "gemini") {
      return { filePath: path.join(agentBase, "settings.json") };
    }
    if (agent === "claude") {
      return { filePath: path.normalize(path.join(agentBase, "..", ".mcp.json")) };
    }
    if (agent === "codex") {
      return { filePath: path.join(agentBase, "config.toml") };
    }
    return { filePath: path.join(agentBase, "mcp.json") };
  }
  if (asset.type === "hook") {
    if (baseName === "hooks.json") {
      if (agent === "gemini" || agent === "claude") {
        return { filePath: path.join(agentBase, "settings.json") };
      }
      return { filePath: path.join(agentBase, "hooks.json") };
    }
    return { filePath: path.join(agentBase, "hooks", baseName) };
  }

  if (agent === "gemini") {
    if (asset.type === "prompt") {
      return { filePath: path.join(agentBase, "prompts", baseName) };
    }
    if (asset.type === "sub-agent") {
      return { filePath: path.join(agentBase, "rules", baseName) };
    }
    if (asset.type === "rule") {
      if (baseName.toLowerCase().endsWith(".toml")) {
        return { filePath: path.join(agentBase, "commands", baseName) };
      }
      return { filePath: path.join(agentBase, "rules", baseName) };
    }
  }

  return agentDestinationForAsset(agentBase, asset);
}

/**
 * Escape special regex characters for safe use in `RegExp` construction.
 *
 * @param s - Raw placeholder fragment or string.
 * @returns Escaped string safe to embed in a character class or pattern.
 */
export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Patch {bundle_name} placeholders in markdown content.
 * Feature 3: replaces {bundle_name} with absolute install path for executables.
 *
 * @param content - Markdown or text content.
 * @param bundlePathMap - Map of bundle name to install path.
 * @returns Content with placeholders replaced (unchanged when map empty).
 */
export function patchMarkdownBundlePlaceholders(
  content: string,
  bundlePathMap?: Record<string, string>
): string {
  if (!bundlePathMap || Object.keys(bundlePathMap).length === 0) {
    return content;
  }
  let result = content;
  for (const [name, installPath] of Object.entries(bundlePathMap)) {
    result = result.replace(new RegExp(`\\{${escapeRegExp(name)}\\}`, "g"), installPath);
  }
  return result;
}
