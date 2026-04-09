/**
 * Catalog install routing: when a package install should use Cursor, Gemini, or Claude
 * {@link AgentProvider} (vs generic asset copy).
 */

import type { InstallContext } from "../file-ops/install-context.js";

import type { InstallOptions, PackageManifest } from "./types.js";

const PROVIDER_PROJECT_ASSET_TYPES = new Set([
  "rule",
  "skill",
  "prompt",
  "hook",
  "sub-agent",
  "mcp",
]);

function usesAgentProviderProjectInstallForAgent(
  providerCtx: InstallContext,
  manifest: PackageManifest,
  opts: InstallOptions,
  agent: "cursor" | "gemini" | "claude"
): boolean {
  if (providerCtx.agent !== agent) {
    return false;
  }
  if (providerCtx.layer !== "project") {
    return false;
  }
  if (opts.promptScope !== "project") {
    return false;
  }
  const assets = manifest.assets ?? [];
  if (assets.length === 0) {
    return false;
  }
  return assets.every(
    (a) => a.type === "program" || PROVIDER_PROJECT_ASSET_TYPES.has(a.type)
  );
}

/**
 * True when every **non-program** asset is a type the Cursor provider materialises under the
 * project agent tree (`install-package-assets` still copies `program` rows separately).
 *
 * @param providerCtx - Built provider context.
 * @param manifest - Catalog package manifest.
 * @param opts - Install CLI options.
 */
export function usesCursorAgentProviderProjectInstall(
  providerCtx: InstallContext,
  manifest: PackageManifest,
  opts: InstallOptions
): boolean {
  return usesAgentProviderProjectInstallForAgent(providerCtx, manifest, opts, "cursor");
}

/**
 * True when every **non-program** asset is a type the Gemini provider materialises under the project
 * **`.gemini/`** tree only—not **`.agents/`**—including **`settings.json`** merges for MCP and hooks.
 */
export function usesGeminiAgentProviderProjectInstall(
  providerCtx: InstallContext,
  manifest: PackageManifest,
  opts: InstallOptions
): boolean {
  return usesAgentProviderProjectInstallForAgent(providerCtx, manifest, opts, "gemini");
}

/**
 * True when Claude should use {@link AgentProvider} for this install: project scope + project layer
 * (repo `.claude/` and `.mcp.json`), or station scope + user layer (`~/.claude/` and `~/.claude.json`).
 */
export function usesClaudeAgentProviderCatalogInstall(
  providerCtx: InstallContext,
  manifest: PackageManifest,
  opts: InstallOptions
): boolean {
  if (providerCtx.agent !== "claude") {
    return false;
  }
  const layerMatches =
    (providerCtx.layer === "project" && opts.promptScope === "project") ||
    (providerCtx.layer === "user" && opts.promptScope === "station");
  if (!layerMatches) {
    return false;
  }
  const assets = manifest.assets ?? [];
  if (assets.length === 0) {
    return false;
  }
  return assets.every(
    (a) => a.type === "program" || PROVIDER_PROJECT_ASSET_TYPES.has(a.type)
  );
}
