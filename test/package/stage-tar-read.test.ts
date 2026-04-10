/**
 * Unit tests for stage.tar listing and single-member reads.
 */

import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  listStageTarEntries,
  readStageTarMemberUtf8,
} from "../../src/package/stage-tar-read.js";

describe("readStageTarMemberUtf8", () => {
  it("reads members from archives created with tar -C <dir> . (./-prefixed headers)", () => {
    const work = fs.mkdtempSync(path.join(os.tmpdir(), "atp-stage-read-"));
    const contentRoot = path.join(work, "tree");
    const tarPath = path.join(work, "stage.tar");
    try {
      const nested = path.join(contentRoot, "part_1_Rule");
      fs.mkdirSync(nested, { recursive: true });
      const body = "# R1\n\nok\n";
      fs.writeFileSync(path.join(nested, "r1.md"), body, "utf8");

      execSync(`tar -cf "${tarPath}" -C "${contentRoot}" .`, { stdio: "pipe" });

      const rawList = execSync(`tar -tf "${tarPath}"`, { encoding: "utf8", stdio: "pipe" });
      expect(rawList).toMatch(/\.\/part_1_Rule\/r1\.md|part_1_Rule\/r1\.md/);

      expect(listStageTarEntries(tarPath)).toContain("part_1_Rule/r1.md");

      expect(readStageTarMemberUtf8(tarPath, "part_1_Rule/r1.md")).toBe(body);
    } finally {
      fs.rmSync(work, { recursive: true, force: true });
    }
  });
});
