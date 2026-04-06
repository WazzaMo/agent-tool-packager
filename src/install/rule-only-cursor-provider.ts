/**
 * Detect when catalog install should use {@link CursorAgentProvider} for Cursor project assets.
 */

import type { InstallContext } from "../file-ops/install-context.js";

import type { InstallOptions, PackageManifest } from "./types.js";

const CURSOR_PROVIDER_ASSET_TYPES = new Set([
  "rule",
  "skill",
  "prompt",
  "hook",
  "sub-agent",
  "mcp",
]);

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
  if (providerCtx.agent !== "cursor") {
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
    (a) => a.type === "program" || CURSOR_PROVIDER_ASSET_TYPES.has(a.type)
  );
}
