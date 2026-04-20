/**
 * Read an npm dist-tag version from the registry HTTP JSON API.
 */

export type GetNpmDistTagVersionOptions = {
  /** Wall-clock timeout for the request (default 3000). */
  timeoutMs?: number;
  /** Injected fetch (tests); defaults to `globalThis.fetch`. */
  fetchFn?: typeof fetch;
  /** Optional outer abort (e.g. process shutdown). */
  signal?: AbortSignal;
};

/**
 * Fetches `dist-tags[tag]` for a package from the registry JSON document.
 *
 * @param packageName - Full npm package name (e.g. `@scope/name`).
 * @param tag - Dist-tag name (usually `latest`).
 * @param registryBaseUrl - HTTPS origin from {@link resolveNpmRegistryBaseUrl}.
 * @param options - Timeout and optional fetch override.
 * @returns Tag version string, or `null` on failure, non-OK response, or missing tag.
 */
export async function getNpmDistTagVersion(
  packageName: string,
  tag: string,
  registryBaseUrl: string,
  options: GetNpmDistTagVersionOptions = {}
): Promise<string | null> {
  const timeoutMs = options.timeoutMs ?? 3000;
  const fetchFn = options.fetchFn ?? globalThis.fetch;
  const pathPart = encodeURIComponent(packageName);
  const url = `${registryBaseUrl.replace(/\/+$/, "")}/${pathPart}`;

  const timeoutController = new AbortController();
  const timer = setTimeout(() => timeoutController.abort(), timeoutMs);
  const outer = options.signal;
  const signal =
    outer != null
      ? AbortSignal.any([timeoutController.signal, outer])
      : timeoutController.signal;

  try {
    const res = await fetchFn(url, {
      signal,
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      return null;
    }
    const data = (await res.json()) as {
      "dist-tags"?: Record<string, string | undefined>;
    };
    const v = data["dist-tags"]?.[tag];
    return typeof v === "string" && v.length > 0 ? v : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
