/**
 * Unit tests for bundleRemove.
 * Covers success path and all failure paths (no manifest, bundle not in manifest,
 * no stage.tar, empty stage.tar, bundle not in tar).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";
import { bundleRemove } from "../../src/package/bundle-remove.js";
import { bundleAdd } from "../../src/package/bundle-add.js";

function createTempDir(): string {
  const dir = path.join(os.tmpdir(), `atp-bundle-rm-test-${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

describe("bundleRemove", () => {
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

  it("removes bundle from manifest and stage.tar (happy path)", () => {
    // Setup: manifest with empty bundles, then bundleAdd to create stage.tar
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

    bundleRemove(pkgDir, "my-bundle");

    const manifest = fs.readFileSync(path.join(pkgDir, "atp-package.yaml"), "utf8");
    expect(manifest).not.toMatch(/my-bundle/);
    const list = execSync(`tar -tf "${path.join(pkgDir, "stage.tar")}"`, {
      encoding: "utf8",
      cwd: pkgDir,
    });
    expect(list).not.toMatch(/my-bundle/);
  });

  it("exits 1 when no atp-package.yaml exists", () => {
    expect(() => bundleRemove(pkgDir, "any-bundle")).toThrow("exit:1");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "No atp-package.yaml found. Run `atp create package skeleton` first."
    );
  });

  it("exits 1 when bundle not in manifest", () => {
    fs.writeFileSync(
      path.join(pkgDir, "atp-package.yaml"),
      `type: Command
name: test-pkg
version: 0.1.0
usage: test
bundles: []
`
    );
    expect(() => bundleRemove(pkgDir, "missing-bundle")).toThrow("exit:1");
    expect(consoleErrorSpy).toHaveBeenCalledWith("Bundle had not been included in the package.");
  });

  it("exits 1 when stage.tar does not exist", () => {
    fs.writeFileSync(
      path.join(pkgDir, "atp-package.yaml"),
      `type: Command
name: test-pkg
version: 0.1.0
usage: test
bundles:
  - my-bundle
`
    );
    expect(() => bundleRemove(pkgDir, "my-bundle")).toThrow("exit:1");
    expect(consoleErrorSpy).toHaveBeenCalledWith("Bundle had not been included in the package.");
  });

  it("exits 1 when stage.tar is empty", () => {
    fs.writeFileSync(path.join(pkgDir, "stage.tar"), "");
    fs.writeFileSync(
      path.join(pkgDir, "atp-package.yaml"),
      `type: Command
name: test-pkg
version: 0.1.0
usage: test
bundles:
  - my-bundle
`
    );
    expect(() => bundleRemove(pkgDir, "my-bundle")).toThrow("exit:1");
    expect(consoleErrorSpy).toHaveBeenCalledWith("Bundle had not been included in the package.");
  });

  it("exits 1 when bundle in manifest but not in stage.tar", () => {
    // Manifest says my-bundle, but stage.tar contains only other-stuff
    fs.writeFileSync(
      path.join(pkgDir, "atp-package.yaml"),
      `type: Command
name: test-pkg
version: 0.1.0
usage: test
bundles:
  - my-bundle
`
    );
    fs.mkdirSync(path.join(pkgDir, "other-stuff"), { recursive: true });
    fs.writeFileSync(path.join(pkgDir, "other-stuff", "file.txt"), "x");
    execSync(`tar -cf "${path.join(pkgDir, "stage.tar")}" -C "${pkgDir}" other-stuff`, {
      cwd: pkgDir,
      stdio: "pipe",
    });

    expect(() => bundleRemove(pkgDir, "my-bundle")).toThrow("exit:1");
    expect(consoleErrorSpy).toHaveBeenCalledWith("Bundle had not been included in the package.");
  });

  it("accepts execBase as full path (uses basename)", () => {
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
    bundleRemove(pkgDir, path.join(pkgDir, "my-bundle"));

    const manifest = fs.readFileSync(path.join(pkgDir, "atp-package.yaml"), "utf8");
    expect(manifest).not.toMatch(/my-bundle/);
  });
});
