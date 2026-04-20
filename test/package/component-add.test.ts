/**
 * Unit tests for componentAdd.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";
import { componentAdd } from "../../src/package/component-add.js";

function createTempDir(): string {
  const dir = path.join(os.tmpdir(), `atp-component-add-test-${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

describe("componentAdd", () => {
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

  it("adds component to manifest and stage.tar", () => {
    fs.writeFileSync(
      path.join(pkgDir, "atp-package.yaml"),
      `type: Rule
name: test
version: 0.1.0
usage:
  - x
`
    );
    fs.writeFileSync(path.join(pkgDir, "readme.md"), "# Readme");

    componentAdd(pkgDir, "readme.md");

    expect(fs.existsSync(path.join(pkgDir, "stage.tar"))).toBe(true);
    const manifest = fs.readFileSync(path.join(pkgDir, "atp-package.yaml"), "utf8");
    expect(manifest).toMatch(/readme\.md/);
    const list = execSync(`tar -tf "${path.join(pkgDir, "stage.tar")}"`, {
      encoding: "utf8",
      cwd: pkgDir,
    });
    expect(list).toMatch(/readme\.md/);
  });

  it("exits 1 when no manifest", () => {
    fs.writeFileSync(path.join(pkgDir, "a.md"), "");
    expect(() => componentAdd(pkgDir, "a.md")).toThrow("exit:1");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "No atp-package.yaml found. Run `atp create package skeleton` first."
    );
  });

  it("adds component from path outside package (../ relative)", () => {
    fs.writeFileSync(
      path.join(pkgDir, "atp-package.yaml"),
      `type: Rule
name: test
version: 0.1.0
usage:
  - x
`
    );
    const extDir = path.join(path.dirname(pkgDir), `atp-ext-${Date.now()}`);
    fs.mkdirSync(extDir, { recursive: true });
    fs.writeFileSync(path.join(extDir, "upstream.md"), "# Upstream");
    try {
      componentAdd(pkgDir, path.join("..", path.basename(extDir), "upstream.md"));
      const manifest = fs.readFileSync(path.join(pkgDir, "atp-package.yaml"), "utf8");
      expect(manifest).toMatch(/upstream\.md/);
      const list = execSync(`tar -tf "${path.join(pkgDir, "stage.tar")}"`, {
        encoding: "utf8",
        cwd: pkgDir,
      });
      expect(list).toMatch(/upstream\.md/);
    } finally {
      try {
        fs.rmSync(extDir, { recursive: true });
      } catch {
        /* ignore */
      }
    }
  });

  it("adds component from absolute path", () => {
    fs.writeFileSync(
      path.join(pkgDir, "atp-package.yaml"),
      `type: Rule
name: test
version: 0.1.0
usage:
  - x
`
    );
    const absDir = path.join(path.dirname(pkgDir), `atp-abs-${Date.now()}`);
    fs.mkdirSync(absDir, { recursive: true });
    const absFile = path.join(absDir, "abs.md");
    fs.writeFileSync(absFile, "# Abs");
    try {
      componentAdd(pkgDir, absFile);
      const manifest = fs.readFileSync(path.join(pkgDir, "atp-package.yaml"), "utf8");
      expect(manifest).toMatch(/abs\.md/);
    } finally {
      try {
        fs.rmSync(absDir, { recursive: true });
      } catch {
        /* ignore */
      }
    }
  });

  it("exits 1 when file does not exist", () => {
    fs.writeFileSync(path.join(pkgDir, "atp-package.yaml"), "type: Rule\nname: x\nversion: 0.1.0\nusage: [x]\n");
    expect(() => componentAdd(pkgDir, "missing.md")).toThrow("exit:1");
    expect(consoleErrorSpy).toHaveBeenCalledWith("Nominated path or file does not exist.");
  });

  it("exits 1 when path is not a file", () => {
    fs.writeFileSync(path.join(pkgDir, "atp-package.yaml"), "type: Rule\nname: x\nversion: 0.1.0\nusage: [x]\n");
    fs.mkdirSync(path.join(pkgDir, "adir"), { recursive: true });
    expect(() => componentAdd(pkgDir, "adir")).toThrow("exit:1");
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("not a file"));
  });

  it("is idempotent when component already in manifest", () => {
    fs.writeFileSync(
      path.join(pkgDir, "atp-package.yaml"),
      `type: Rule
name: x
version: 0.1.0
usage:
  - x
components:
  - a.md
`
    );
    fs.writeFileSync(path.join(pkgDir, "a.md"), "");
    componentAdd(pkgDir, "a.md");
    const manifest = fs.readFileSync(path.join(pkgDir, "atp-package.yaml"), "utf8");
    const count = (manifest.match(/a\.md/g) ?? []).length;
    expect(count).toBe(1);
  });
});
