/**
 * Unit tests: npm registry base URL resolution from Station config.
 */

import { describe, it, expect } from "vitest";

import type { StationConfig } from "../../src/config/station-config.js";
import {
  DEFAULT_NPM_REGISTRY_BASE_URL,
  resolveNpmRegistryBaseUrl,
} from "../../src/registry/npm-registry-base-url.js";

function makeConfig(overrides?: { "npm-registry-base-url"?: string }): StationConfig {
  return {
    configuration: {
      version: "0.1.0",
      "agent-paths": {},
      "standard-catalog": { url: "https://example.com/cat/" },
      ...overrides,
    },
  };
}

describe("resolveNpmRegistryBaseUrl", () => {
  it("returns public npm default when config is null", () => {
    expect(resolveNpmRegistryBaseUrl(null)).toBe(DEFAULT_NPM_REGISTRY_BASE_URL);
  });

  it("returns public npm default when key is missing", () => {
    expect(resolveNpmRegistryBaseUrl(makeConfig())).toBe(
      DEFAULT_NPM_REGISTRY_BASE_URL
    );
  });

  it("returns public npm default when key is blank", () => {
    expect(
      resolveNpmRegistryBaseUrl(
        makeConfig({ "npm-registry-base-url": "  " })
      )
    ).toBe(DEFAULT_NPM_REGISTRY_BASE_URL);
  });

  it("returns HTTPS origin from configured URL", () => {
    expect(
      resolveNpmRegistryBaseUrl(
        makeConfig({ "npm-registry-base-url": "https://registry.example.com/v1/" })
      )
    ).toBe("https://registry.example.com");
  });

  it("returns null for http", () => {
    expect(
      resolveNpmRegistryBaseUrl(
        makeConfig({ "npm-registry-base-url": "http://registry.npmjs.org" })
      )
    ).toBeNull();
  });

  it("returns null for garbage", () => {
    expect(
      resolveNpmRegistryBaseUrl(
        makeConfig({ "npm-registry-base-url": "not-a-url" })
      )
    ).toBeNull();
  });
});
