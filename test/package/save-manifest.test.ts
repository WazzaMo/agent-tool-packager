/**
 * Unit tests for saveDevManifest.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import yaml from "js-yaml";
import { saveDevManifest } from "../../src/package/save-manifest.js";

function createTempDir(): string {
  const dir = path.join(os.tmpdir(), `atp-save-manifest-${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

describe("saveDevManifest", () => {
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

  it("writes atp-package.yaml with manifest content", () => {
    saveDevManifest(cwd, {
      name: "test-pkg",
      type: "Rule",
      version: "0.1.0",
      usage: ["help"],
    });
    const content = fs.readFileSync(path.join(cwd, "atp-package.yaml"), "utf8");
    const data = yaml.load(content) as Record<string, unknown>;
    expect(data.name).toBe("test-pkg");
    expect(data.type).toBe("Rule");
    expect(data.version).toBe("0.1.0");
    expect(data.usage).toEqual(["help"]);
  });

  it("writes components and bundles when provided", () => {
    saveDevManifest(cwd, {
      name: "pkg",
      type: "Command",
      version: "1.0.0",
      usage: ["x"],
      components: ["a.md"],
      bundles: ["bin-pkg"],
    });
    const content = fs.readFileSync(path.join(cwd, "atp-package.yaml"), "utf8");
    const data = yaml.load(content) as Record<string, unknown>;
    expect(data.components).toEqual(["a.md"]);
    expect(data.bundles).toEqual(["bin-pkg"]);
  });

  it("omits bundles when empty array", () => {
    saveDevManifest(cwd, {
      name: "pkg",
      type: "Rule",
      version: "0.1.0",
      usage: ["u"],
      bundles: [],
    });
    const content = fs.readFileSync(path.join(cwd, "atp-package.yaml"), "utf8");
    expect(content).not.toMatch(/bundles:/);
  });

  it("truncates long strings to 80 chars", () => {
    const long = "a".repeat(100);
    saveDevManifest(cwd, {
      name: long,
      type: "Rule",
      version: "0.1.0",
      usage: ["x"],
    });
    const content = fs.readFileSync(path.join(cwd, "atp-package.yaml"), "utf8");
    const data = yaml.load(content) as Record<string, unknown>;
    expect((data.name as string).length).toBe(80);
  });
});
