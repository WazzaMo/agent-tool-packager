/**
 * Unit tests for loadDevManifest.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { loadDevManifest } from "../../src/package/load-manifest.js";

function createTempDir(): string {
  const dir = path.join(os.tmpdir(), `atp-load-manifest-${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

describe("loadDevManifest", () => {
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

  it("returns null when atp-package.yaml does not exist", () => {
    expect(loadDevManifest(cwd)).toBeNull();
  });

  it("returns flat manifest when file has flat YAML", () => {
    fs.writeFileSync(
      path.join(cwd, "atp-package.yaml"),
      `type: Rule
name: test-pkg
version: 0.1.0
usage:
  - help text
components:
  - a.md
`
    );
    const m = loadDevManifest(cwd);
    expect(m).not.toBeNull();
    expect(m?.type).toBe("Rule");
    expect(m?.name).toBe("test-pkg");
    expect(m?.version).toBe("0.1.0");
    expect(m?.usage).toEqual(["help text"]);
    expect(m?.components).toEqual(["a.md"]);
  });

  it("returns parsed manifest from Package list format", () => {
    fs.writeFileSync(
      path.join(cwd, "atp-package.yaml"),
      `Package:
  - Name: legacy-pkg
    Type: Skill
    Version: 1.0.0
    Usage: legacy usage
    components: [x.md]
`
    );
    const m = loadDevManifest(cwd);
    expect(m).not.toBeNull();
    expect(m?.name).toBe("legacy-pkg");
    expect(m?.type).toBe("Skill");
    expect(m?.version).toBe("1.0.0");
    expect(m?.usage).toEqual(["legacy usage"]);
    expect(m?.components).toEqual(["x.md"]);
  });

  it("returns {} for empty or non-object content", () => {
    fs.writeFileSync(path.join(cwd, "atp-package.yaml"), "");
    expect(loadDevManifest(cwd)).toEqual({});
  });
});
