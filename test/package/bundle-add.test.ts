/**
 * Unit tests for bundleAdd.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";
import { bundleAdd } from "../../src/package/bundle-add.js";

function createTempDir(): string {
  const dir = path.join(os.tmpdir(), `atp-bundle-add-test-${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

describe("bundleAdd", () => {
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

  it("adds bundle to manifest and stage.tar (UNIX conformant with bin/)", () => {
    fs.writeFileSync(
      path.join(pkgDir, "atp-package.yaml"),
      `type: Command
name: test-pkg
version: 0.1.0
usage:
  - test
`
    );
    const bundleDir = path.join(pkgDir, "my-bundle", "bin");
    fs.mkdirSync(bundleDir, { recursive: true });
    fs.writeFileSync(path.join(bundleDir, "script.sh"), "#!/bin/bash\necho ok\n");
    fs.chmodSync(path.join(bundleDir, "script.sh"), 0o755);

    bundleAdd(pkgDir, "my-bundle");

    expect(fs.existsSync(path.join(pkgDir, "stage.tar"))).toBe(true);
    const manifest = fs.readFileSync(path.join(pkgDir, "atp-package.yaml"), "utf8");
    expect(manifest).toMatch(/my-bundle/);
    const list = execSync(`tar -tf "${path.join(pkgDir, "stage.tar")}"`, {
      encoding: "utf8",
      cwd: pkgDir,
    });
    expect(list).toMatch(/my-bundle/);
  });

  it("adds non-UNIX bundle with --exec-filter", () => {
    fs.writeFileSync(
      path.join(pkgDir, "atp-package.yaml"),
      `type: Command
name: test-pkg
version: 0.1.0
usage:
  - test
`
    );
    const scriptsDir = path.join(pkgDir, "scripts-util", "scripts");
    fs.mkdirSync(scriptsDir, { recursive: true });
    fs.writeFileSync(path.join(scriptsDir, "run.sh"), "#!/bin/bash\necho ok\n");
    fs.chmodSync(path.join(scriptsDir, "run.sh"), 0o755);

    bundleAdd(pkgDir, "scripts-util", { execFilter: "scripts-util/scripts/run.sh" });

    expect(fs.existsSync(path.join(pkgDir, "stage.tar"))).toBe(true);
    const manifest = fs.readFileSync(path.join(pkgDir, "atp-package.yaml"), "utf8");
    expect(manifest).toMatch(/scripts-util/);
  });

  it("exits 1 when no manifest", () => {
    fs.mkdirSync(path.join(pkgDir, "my-bundle", "bin"), { recursive: true });
    expect(() => bundleAdd(pkgDir, "my-bundle")).toThrow("exit:1");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "No atp-package.yaml found. Run `atp create package skeleton` first."
    );
  });

  it("exits 1 when path is invalid (outside pkg)", () => {
    fs.writeFileSync(path.join(pkgDir, "atp-package.yaml"), "type: Rule\nname: x\nversion: 0.1.0\nusage: [x]\n");
    expect(() => bundleAdd(pkgDir, "../other")).toThrow("exit:1");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Invalid path")
    );
  });

  it("exits 1 when bundle path does not exist", () => {
    fs.writeFileSync(path.join(pkgDir, "atp-package.yaml"), "type: Rule\nname: x\nversion: 0.1.0\nusage: [x]\n");
    expect(() => bundleAdd(pkgDir, "missing-dir")).toThrow("exit:1");
    expect(consoleErrorSpy).toHaveBeenCalledWith("Nominated path or directory does not exist.");
  });

  it("exits 1 when path is not a directory", () => {
    fs.writeFileSync(path.join(pkgDir, "atp-package.yaml"), "type: Rule\nname: x\nversion: 0.1.0\nusage: [x]\n");
    fs.writeFileSync(path.join(pkgDir, "a-file"), "");
    expect(() => bundleAdd(pkgDir, "a-file")).toThrow("exit:1");
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("not a directory"));
  });

  it("exits 1 when no bin/ and no --exec-filter", () => {
    fs.writeFileSync(path.join(pkgDir, "atp-package.yaml"), "type: Rule\nname: x\nversion: 0.1.0\nusage: [x]\n");
    fs.mkdirSync(path.join(pkgDir, "flat-bundle"), { recursive: true });
    fs.writeFileSync(path.join(pkgDir, "flat-bundle", "x.sh"), "");
    expect(() => bundleAdd(pkgDir, "flat-bundle")).toThrow("exit:1");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("bin/")
    );
  });

  it("is idempotent when bundle already in manifest", () => {
    fs.writeFileSync(
      path.join(pkgDir, "atp-package.yaml"),
      `type: Command
name: test
version: 0.1.0
usage:
  - x
bundles:
  - my-bundle
`
    );
    fs.mkdirSync(path.join(pkgDir, "my-bundle", "bin"), { recursive: true });
    bundleAdd(pkgDir, "my-bundle");
    expect(fs.existsSync(path.join(pkgDir, "stage.tar"))).toBe(false);
  });
});
