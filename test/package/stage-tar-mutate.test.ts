/**
 * Unit tests for stage.tar extract/mutate/repack.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";
import {
  mutateStageTarContents,
  removePathUnderExtractRoot,
} from "../../src/package/stage-tar-mutate.js";

function createTempPkg(): string {
  const dir = path.join(os.tmpdir(), `atp-mut-${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

describe("mutateStageTarContents", () => {
  let pkg: string;

  beforeEach(() => {
    pkg = createTempPkg();
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "atp-build-tar-"));
    try {
      fs.mkdirSync(path.join(tmp, "part_1_Skill"), { recursive: true });
      fs.writeFileSync(path.join(tmp, "part_1_Skill", "A.md"), "a", "utf8");
      fs.mkdirSync(path.join(tmp, "part_2_Mcp", "b"), { recursive: true });
      fs.writeFileSync(path.join(tmp, "part_2_Mcp", "b", "x"), "x", "utf8");
      execSync(`tar -cf "${path.join(pkg, "stage.tar")}" -C "${tmp}" .`, { stdio: "pipe" });
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    try {
      fs.rmSync(pkg, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it("removes a nested path and rebuilds tar", () => {
    mutateStageTarContents(pkg, (root) => {
      removePathUnderExtractRoot(root, ["part_2_Mcp", "b"]);
    });
    const list = execSync(`tar -tf "${path.join(pkg, "stage.tar")}"`, {
      encoding: "utf8",
    });
    expect(list).toMatch(/part_1_Skill\/A\.md/);
    expect(list).not.toMatch(/part_2_Mcp\/b\/x/);
  });
});
