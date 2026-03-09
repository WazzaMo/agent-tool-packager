/**
 * Unit tests for package resolution.
 * Acceptance: Resolve package from catalog, load manifest, resolve file:// paths.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import {
  resolvePackage,
  loadPackageManifest,
  resolvePackagePath,
} from "../../src/install/resolve.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_PKG = path.resolve(__dirname, "../fixtures/test-package");

describe("resolvePackage", () => {
  const originalStationPath = process.env.STATION_PATH;

  beforeEach(() => {
    const tmpStation = path.join(os.tmpdir(), `ahq-test-${Date.now()}`);
    fs.mkdirSync(tmpStation, { recursive: true });
    fs.writeFileSync(
      path.join(tmpStation, "ahq-catalog.yaml"),
      `packages:
  - name: test-package
    version: 1.0.0
    location: file://${FIXTURE_PKG.replace(/\\/g, "/")}
`
    );
    process.env.STATION_PATH = tmpStation;
  });

  afterEach(() => {
    if (originalStationPath !== undefined) {
      process.env.STATION_PATH = originalStationPath;
    } else {
      delete process.env.STATION_PATH;
    }
  });

  it("finds package from user catalog", () => {
    const pkg = resolvePackage("test-package", process.cwd());
    expect(pkg).not.toBeNull();
    expect(pkg!.name).toBe("test-package");
    expect(pkg!.version).toBe("1.0.0");
  });

  it("returns null for unknown package", () => {
    expect(resolvePackage("nonexistent-pkg", process.cwd())).toBeNull();
  });
});

describe("loadPackageManifest", () => {
  it("loads ahq-package.yaml", () => {
    const manifest = loadPackageManifest(FIXTURE_PKG);
    expect(manifest).not.toBeNull();
    expect(manifest!.name).toBe("test-package");
    expect(manifest!.version).toBe("1.0.0");
    expect(manifest!.assets).toHaveLength(1);
    expect(manifest!.assets![0]).toMatchObject({
      path: "skills/test-skill.md",
      type: "skill",
      name: "test-skill",
    });
  });

  it("returns null for directory without manifest", () => {
    expect(loadPackageManifest(os.tmpdir())).toBeNull();
  });
});

describe("resolvePackagePath", () => {
  it("resolves file:// absolute path to directory", () => {
    const resolved = resolvePackagePath(
      `file://${FIXTURE_PKG.replace(/\\/g, "/")}`,
      process.cwd()
    );
    expect(resolved).toBe(FIXTURE_PKG);
  });

  it("resolves file:// relative path", () => {
    const relPath = path.relative(process.cwd(), FIXTURE_PKG);
    const location = `file://${relPath.replace(/\\/g, "/")}`;
    const resolved = resolvePackagePath(location, process.cwd());
    expect(resolved).toBe(FIXTURE_PKG);
  });

  it("returns null for non-file location", () => {
    expect(resolvePackagePath("https://example.com/pkg", process.cwd())).toBeNull();
  });

  it("returns null for nonexistent directory", () => {
    expect(
      resolvePackagePath("file:///nonexistent/dir/12345", process.cwd())
    ).toBeNull();
  });
});
