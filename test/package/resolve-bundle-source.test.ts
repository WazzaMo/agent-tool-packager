/**
 * Unit tests for bundle path resolution (manifest key vs absolute source).
 */

import { describe, it, expect } from "vitest";
import path from "node:path";
import os from "node:os";

import {
  bundleManifestPath,
  isBundleDirectoryUnderPackage,
  resolveBundleSourcePath,
} from "../../src/package/resolve-bundle-source.js";

describe("resolveBundleSourcePath", () => {
  it("resolves relative paths from package cwd", () => {
    const pkg = path.join(os.tmpdir(), "atp-rbs-pkg");
    expect(resolveBundleSourcePath(pkg, "foo/bar")).toBe(path.resolve(pkg, "foo/bar"));
  });

  it("normalises absolute paths", () => {
    const pkg = path.join(os.tmpdir(), "atp-rbs-pkg2");
    const abs = path.join(pkg, "a", "b");
    expect(resolveBundleSourcePath(pkg, abs)).toBe(path.resolve(abs));
  });
});

describe("bundleManifestPath", () => {
  it("returns relative path when bundle is under package root", () => {
    const pkg = path.join(os.tmpdir(), "atp-bmp-in");
    const bundle = path.join(pkg, "vendor", "tool");
    expect(bundleManifestPath(pkg, bundle)).toBe(`vendor/tool`);
  });

  it("returns basename when bundle is outside package root", () => {
    const pkg = path.join(os.tmpdir(), "atp-bmp-pkg");
    const bundle = path.join(os.tmpdir(), "atp-bmp-peer", "my-mcp");
    expect(bundleManifestPath(pkg, bundle)).toBe("my-mcp");
  });
});

describe("isBundleDirectoryUnderPackage", () => {
  it("is true for nested directory inside package", () => {
    const pkg = path.join(os.tmpdir(), "atp-ubp-pkg");
    const bundle = path.join(pkg, "sub", "b");
    expect(isBundleDirectoryUnderPackage(pkg, bundle)).toBe(true);
  });

  it("is false for peer directory", () => {
    const base = path.join(os.tmpdir(), "atp-ubp-root");
    const pkg = path.join(base, "pkg");
    const bundle = path.join(base, "peer");
    expect(isBundleDirectoryUnderPackage(pkg, bundle)).toBe(false);
  });
});
