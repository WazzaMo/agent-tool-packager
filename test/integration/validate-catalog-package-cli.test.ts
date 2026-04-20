/**
 * Integration: `atp validate catalog-package` (pre-install / catalog extract).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { runAtp, runAtpExpectExit, FIXTURE_PKG, PROJECT_ROOT } from "./test-helpers.js";

describe("Integration: validate catalog-package CLI", () => {
  it("exits 0 for the test fixture catalog layout", () => {
    const out = runAtp(["validate", "catalog-package", FIXTURE_PKG], { cwd: PROJECT_ROOT });
    expect(out).toMatch(/passes pre-install validation/i);
  });

  let emptyDir: string;

  beforeEach(() => {
    emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), "atp-val-cat-empty-"));
  });

  afterEach(() => {
    try {
      fs.rmSync(emptyDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it("exits non-zero when manifest is missing", () => {
    const r = runAtpExpectExit(["validate", "catalog-package", emptyDir], 2, {
      cwd: PROJECT_ROOT,
    });
    expect(r.stderr + r.stdout).toMatch(/atp-package\.yaml|package\.yaml/i);
  });
});
