/**
 * Unit tests for resolveComponentSourcePath.
 */

import { describe, it, expect } from "vitest";
import path from "node:path";
import { resolveComponentSourcePath } from "../../src/package/resolve-component-source.js";

describe("resolveComponentSourcePath", () => {
  it("resolves relative paths from package cwd", () => {
    const pkg = "/project/pkg";
    expect(resolveComponentSourcePath(pkg, "docs/a.md")).toBe(path.normalize("/project/pkg/docs/a.md"));
  });

  it("resolves parent-relative paths", () => {
    const pkg = "/project/pkg";
    expect(resolveComponentSourcePath(pkg, "../docs/a.md")).toBe(path.normalize("/project/docs/a.md"));
  });

  it("normalises absolute paths", () => {
    const abs = path.resolve("/tmp", "x", "y.md");
    expect(resolveComponentSourcePath("/any/cwd", abs)).toBe(path.normalize(abs));
  });
});
