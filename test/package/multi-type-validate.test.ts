/**
 * Unit tests for Multi-type package validation (Feature 4).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";
import { validatePackage } from "../../src/package/validate.js";

function createTempDir(): string {
  const dir = path.join(os.tmpdir(), `atp-multi-val-${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Build a minimal tar with one file at the given archive-relative path. */
function writeTarWithEntry(cwd: string, archiveRelPath: string, fileContent: string): void {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "atp-tar-"));
  try {
    const segments = archiveRelPath.split("/");
    const base = segments.pop()!;
    let cur = tmp;
    for (const seg of segments) {
      cur = path.join(cur, seg);
      fs.mkdirSync(cur, { recursive: true });
    }
    fs.writeFileSync(path.join(cur, base), fileContent, "utf8");
    const tarPath = path.join(cwd, "stage.tar");
    const top = archiveRelPath.split("/")[0];
    execSync(`tar -cf "${tarPath}" -C "${tmp}" "${top}"`, { stdio: "pipe" });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

describe("validatePackage Multi-type (Feature 4)", () => {
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

  it("fails with exit 2 when Multi has no parts", () => {
    fs.writeFileSync(
      path.join(cwd, "atp-package.yaml"),
      `type: Multi
name: x
version: 0.1.0
parts: []
`,
      "utf8"
    );
    writeTarWithEntry(cwd, "dummy.txt", "x");
    const r = validatePackage(cwd);
    expect(r.ok).toBe(false);
    expect(r.exitCode).toBe(2);
    expect(r.missing.some((m) => m.includes("parts"))).toBe(true);
  });

  it("passes when Multi has one Skill part with usage, component, and staged part_1_Skill file", () => {
    fs.writeFileSync(
      path.join(cwd, "atp-package.yaml"),
      `type: Multi
name: mt-pkg
version: 0.1.0
parts:
  - type: Skill
    usage:
      - Skill usage line
    components:
      - SKILL.md
`,
      "utf8"
    );
    writeTarWithEntry(cwd, "part_1_Skill/SKILL.md", "# Skill\n");
    const r = validatePackage(cwd);
    expect(r.ok).toBe(true);
    expect(r.exitCode).toBe(0);
  });

  it("fails when staged path missing for a part component", () => {
    fs.writeFileSync(
      path.join(cwd, "atp-package.yaml"),
      `type: Multi
name: bad-stage
version: 0.1.0
parts:
  - type: Skill
    usage:
      - u
    components:
      - SKILL.md
`,
      "utf8"
    );
    writeTarWithEntry(cwd, "wrong.txt", "x");
    const r = validatePackage(cwd);
    expect(r.ok).toBe(false);
    expect(r.missing.some((m) => m.includes("staged file missing"))).toBe(true);
  });
});
