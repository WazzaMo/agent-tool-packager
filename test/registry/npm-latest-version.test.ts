/**
 * Unit tests: npm registry dist-tag fetch helper.
 */

import { describe, it, expect, vi } from "vitest";

import { getNpmDistTagVersion } from "../../src/registry/npm-latest-version.js";

describe("getNpmDistTagVersion", () => {
  it("returns dist-tags.latest from JSON body", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ "dist-tags": { latest: "1.2.3" } }),
    });
    const v = await getNpmDistTagVersion(
      "@scope/pkg",
      "latest",
      "https://registry.npmjs.org",
      { fetchFn: fetchFn as unknown as typeof fetch, timeoutMs: 1000 }
    );
    expect(v).toBe("1.2.3");
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const url = String(fetchFn.mock.calls[0]?.[0]);
    expect(url).toBe(
      "https://registry.npmjs.org/%40scope%2Fpkg"
    );
  });

  it("returns null on non-OK response", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });
    const v = await getNpmDistTagVersion(
      "@wazzamo-agent-tools/packager",
      "latest",
      "https://registry.npmjs.org",
      { fetchFn: fetchFn as unknown as typeof fetch }
    );
    expect(v).toBeNull();
  });

  it("returns null on network throw", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("offline"));
    const v = await getNpmDistTagVersion(
      "@wazzamo-agent-tools/packager",
      "latest",
      "https://registry.npmjs.org",
      { fetchFn: fetchFn as unknown as typeof fetch }
    );
    expect(v).toBeNull();
  });

  it("returns null when tag is missing", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ "dist-tags": {} }),
    });
    const v = await getNpmDistTagVersion(
      "@wazzamo-agent-tools/packager",
      "latest",
      "https://registry.npmjs.org",
      { fetchFn: fetchFn as unknown as typeof fetch }
    );
    expect(v).toBeNull();
  });
});
