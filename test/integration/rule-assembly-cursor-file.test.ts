/**
 * Integration tests: write assembled `.mdc` to disk and compare to golden fixture.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

import { writeAssembledCursorMdcFile } from "../../src/provider/rule-assembly/write-cursor-mdc.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GOLDEN_PATH = path.join(__dirname, "../fixtures/provider/cursor-rule-expected.mdc");

const FRONT = `description: Test rule for ATP golden file
globs:
  - "**/*.ts"
alwaysApply: false`;

const BODY = `# Rule body

Use TypeScript carefully.`;

describe("writeAssembledCursorMdcFile", () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "atp-mdc-"));
  });

  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  it("writes nested path and matches golden content", async () => {
    const dest = path.join(tmp, ".cursor", "rules", "golden.mdc");
    await writeAssembledCursorMdcFile(dest, FRONT, BODY);

    const written = await fs.readFile(dest, "utf8");
    const golden = await fs.readFile(GOLDEN_PATH, "utf8");
    expect(written).toBe(golden);
  });
});
