/**
 * Unit tests for componentRemove.
 * Covers success path and failure paths (no manifest, component not in manifest).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";
import { componentAdd } from "../../src/package/component-add.js";
import { componentRemove } from "../../src/package/component-remove.js";

function createTempDir(): string {
  const dir = path.join(os.tmpdir(), `atp-comp-rm-test-${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

describe("componentRemove", () => {
  let pkgDir: string;
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    pkgDir = createTempDir();
    exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as () => never);
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    exitSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    try {
      fs.rmSync(pkgDir, { recursive: true });
    } catch {
      /* ignore */
    }
  });

  it("removes component from manifest and stage.tar (happy path)", () => {
    fs.writeFileSync(
      path.join(pkgDir, "atp-package.yaml"),
      `type: Rule
name: test
version: 0.1.0
usage:
  - x
`
    );
    fs.writeFileSync(path.join(pkgDir, "keep.md"), "# Keep");
    fs.writeFileSync(path.join(pkgDir, "remove.md"), "# Remove");

    componentAdd(pkgDir, "keep.md");
    componentAdd(pkgDir, "remove.md");

    let list = execSync(`tar -tf "${path.join(pkgDir, "stage.tar")}"`, {
      encoding: "utf8",
      cwd: pkgDir,
    });
    expect(list).toMatch(/remove\.md/);

    componentRemove(pkgDir, "remove.md");

    const manifest = fs.readFileSync(path.join(pkgDir, "atp-package.yaml"), "utf8");
    expect(manifest).not.toMatch(/remove\.md/);
    expect(manifest).toMatch(/keep\.md/);

    list = execSync(`tar -tf "${path.join(pkgDir, "stage.tar")}"`, {
      encoding: "utf8",
      cwd: pkgDir,
    });
    expect(list).not.toMatch(/remove\.md/);
    expect(list).toMatch(/keep\.md/);
  });

  it("exits 1 when component not in manifest", () => {
    fs.writeFileSync(
      path.join(pkgDir, "atp-package.yaml"),
      `type: Rule
name: test
version: 0.1.0
usage: [x]
components: [a.md]
`
    );
    fs.writeFileSync(path.join(pkgDir, "stage.tar"), "x");
    expect(() => componentRemove(pkgDir, "never-added.md")).toThrow("exit:1");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Component had not been included in the package."
    );
  });

  it("exits 1 when no manifest", () => {
    fs.writeFileSync(path.join(pkgDir, "a.md"), "");
    expect(() => componentRemove(pkgDir, "a.md")).toThrow("exit:1");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "No atp-package.yaml found. Run `atp create package skeleton` first."
    );
  });
});
