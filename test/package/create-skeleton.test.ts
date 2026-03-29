/**
 * Unit tests for createPackageSkeleton.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createPackageSkeleton } from "../../src/package/create-skeleton.js";

function createTempDir(): string {
  const dir = path.join(os.tmpdir(), `atp-skeleton-test-${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

describe("createPackageSkeleton", () => {
  let cwd: string;

  beforeEach(() => {
    cwd = createTempDir();
  });

  afterEach(() => {
    try {
      fs.rmSync(cwd, { recursive: true });
    } catch {
      /* ignore */
    }
  });

  it("creates Multi atp-package.yaml with empty parts by default (Feature 4)", () => {
    createPackageSkeleton(cwd);
    expect(fs.existsSync(path.join(cwd, "atp-package.yaml"))).toBe(true);
    const content = fs.readFileSync(path.join(cwd, "atp-package.yaml"), "utf8");
    expect(content).toMatch(/type:\s*Multi/i);
    expect(content).toMatch(/parts:\s*\[\]/);
  });

  it("creates legacy skeleton with empty type when legacy option set", () => {
    createPackageSkeleton(cwd, { legacy: true });
    const content = fs.readFileSync(path.join(cwd, "atp-package.yaml"), "utf8");
    expect(content).toMatch(/type:\s*""/);
  });

  it("removes existing atp-package.yaml and stage.tar, creates fresh manifest", () => {
    fs.writeFileSync(path.join(cwd, "atp-package.yaml"), "name: old\n");
    fs.writeFileSync(path.join(cwd, "stage.tar"), "junk");

    createPackageSkeleton(cwd);

    expect(fs.existsSync(path.join(cwd, "stage.tar"))).toBe(false);
    const content = fs.readFileSync(path.join(cwd, "atp-package.yaml"), "utf8");
    expect(content).not.toMatch(/name: old/);
  });
});
