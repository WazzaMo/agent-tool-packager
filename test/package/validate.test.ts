/**
 * Unit tests for validatePackage.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { validatePackage } from "../../src/package/validate.js";

function createTempDir(): string {
  const dir = path.join(os.tmpdir(), `atp-validate-test-${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

describe("validatePackage", () => {
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

  it("returns ok:false when atp-package.yaml does not exist", () => {
    const result = validatePackage(cwd);
    expect(result.ok).toBe(false);
    expect(result.exitCode).toBe(2);
    expect(result.missing).toContain("atp-package.yaml");
  });

  it("returns ok:false when only type is set", () => {
    fs.writeFileSync(
      path.join(cwd, "atp-package.yaml"),
      "type: Rule\n"
    );
    const result = validatePackage(cwd);
    expect(result.ok).toBe(false);
    expect(result.missing).toContain("name");
    expect(result.missing).toContain("version");
    expect(result.missing).toContain("usage");
    expect(result.missing).toContain("components or bundles");
  });

  it("returns ok:false when stage.tar is missing", () => {
    fs.writeFileSync(
      path.join(cwd, "atp-package.yaml"),
      `type: Rule
name: test
version: 0.1.0
usage: test pkg
components: [a.md]
`
    );
    const result = validatePackage(cwd);
    expect(result.ok).toBe(false);
    expect(result.missing).toContain("stage.tar (non-empty)");
  });

  it("returns ok:true when all required fields and stage.tar exist", () => {
    fs.writeFileSync(
      path.join(cwd, "atp-package.yaml"),
      `type: Rule
name: test
version: 0.1.0
usage:
  - test pkg
components:
  - a.md
`
    );
    fs.writeFileSync(path.join(cwd, "stage.tar"), "x"); // non-empty
    const result = validatePackage(cwd);
    expect(result.ok).toBe(true);
    expect(result.exitCode).toBe(0);
  });

  it("accepts bundles instead of components", () => {
    fs.writeFileSync(
      path.join(cwd, "atp-package.yaml"),
      `type: Command
name: cmd-pkg
version: 0.1.0
usage: cmd
bundles:
  - my-bundle
`
    );
    fs.writeFileSync(path.join(cwd, "stage.tar"), "x");
    const result = validatePackage(cwd);
    expect(result.ok).toBe(true);
  });
});
