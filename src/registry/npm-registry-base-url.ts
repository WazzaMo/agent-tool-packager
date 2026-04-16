/**
 * Resolve the npm registry API base URL from Station `atp-config.yaml`.
 * Uses {@link DEFAULT_NPM_REGISTRY_BASE_URL} when config is missing or the key is empty.
 */

import type { StationConfig } from "../config/station-config.js";

/** Public npm registry origin used when Station omits `npm-registry-base-url`. */
export const DEFAULT_NPM_REGISTRY_BASE_URL = "https://registry.npmjs.org";

/**
 * Resolves the npm registry API base URL (HTTPS origin only) from Station config.
 *
 * @param stationConfig - Parsed Station config, or `null` when Station/config is absent.
 * @returns Normalized origin string, or `null` when the configured value is non-HTTPS or unparsable.
 */
export function resolveNpmRegistryBaseUrl(
  stationConfig: StationConfig | null
): string | null {
  const raw =
    stationConfig?.configuration?.["npm-registry-base-url"]?.trim() ?? "";
  const candidate = raw === "" ? DEFAULT_NPM_REGISTRY_BASE_URL : raw;
  try {
    const u = new URL(candidate);
    if (u.protocol !== "https:") {
      return null;
    }
    return u.origin;
  } catch {
    return null;
  }
}
