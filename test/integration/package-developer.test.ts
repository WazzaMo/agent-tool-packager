/**
 * Integration test for package developer workflow (Feature 2).
 * See docs/features/2-package-developer-support.md Test Approach.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { runAtp, runAtpExpectExit } from "./test-helpers.js";

describe("Integration: package developer workflow (Rule type)", () => {
  let stationDir: string;
  let pkgDir: string;
  let originalStationPath: string | undefined;

  beforeEach(() => {
    const base = path.join(os.tmpdir(), `atp-pkgdev-${Date.now()}`);
    fs.mkdirSync(base, { recursive: true });
    stationDir = path.join(base, "test-station");
    pkgDir = path.join(base, "pkg-dir");
    fs.mkdirSync(pkgDir, { recursive: true });
    // Do NOT create stationDir - let atp station init create it
    originalStationPath = process.env.STATION_PATH;
    process.env.STATION_PATH = stationDir;
  });

  afterEach(() => {
    process.env.STATION_PATH = originalStationPath;
    try {
      fs.rmSync(path.dirname(stationDir), { recursive: true });
    } catch {
      /* ignore */
    }
  });

  it("builds a Rule package and adds it to the station catalog", () => {
    // 1. Init station in test-station directory
    runAtp(["station", "init"], { env: { STATION_PATH: stationDir } });
    expect(fs.existsSync(path.join(stationDir, "atp-catalog.yaml"))).toBe(true);

    // 2. Create test-rule.md in pkg-dir
    const ruleContent = `# Rule Test Package

Being able to install this, means success.
`;
    fs.writeFileSync(path.join(pkgDir, "test-rule.md"), ruleContent);

    // 3. Create skeleton package
    runAtp(["create", "package", "skeleton"], {
      cwd: pkgDir,
      env: { STATION_PATH: stationDir },
    });
    expect(fs.existsSync(path.join(pkgDir, "atp-package.yaml"))).toBe(true);

    // 4. Set package type, name, and mandatory fields
    runAtp(["package", "type", "rule"], {
      cwd: pkgDir,
      env: { STATION_PATH: stationDir },
    });
    runAtp(["package", "name", "test-package-1"], {
      cwd: pkgDir,
      env: { STATION_PATH: stationDir },
    });
    runAtp(["package", "version", "0.1.0"], {
      cwd: pkgDir,
      env: { STATION_PATH: stationDir },
    });
    runAtp(["package", "usage", "Test rule for integration"], {
      cwd: pkgDir,
      env: { STATION_PATH: stationDir },
    });

    // 5. Stage the test markdown file
    runAtp(["package", "component", "add", "test-rule.md"], {
      cwd: pkgDir,
      env: { STATION_PATH: stationDir },
    });

    // 6. Add package to station catalog
    runAtp(["catalog", "add", "package"], {
      cwd: pkgDir,
      env: { STATION_PATH: stationDir },
    });

    // Assert: package appears in user_packages with atp-package.yaml and package.tar.gz
    const userPackagesDir = path.join(stationDir, "user_packages");
    const pkgDirInStation = path.join(userPackagesDir, "test-package-1");
    expect(fs.existsSync(pkgDirInStation)).toBe(true);
    expect(fs.existsSync(path.join(pkgDirInStation, "atp-package.yaml"))).toBe(
      true
    );
    expect(fs.existsSync(path.join(pkgDirInStation, "package.tar.gz"))).toBe(
      true
    );
  });
});

describe("Integration: package developer - validate fails when incomplete", () => {
  let stationDir: string;
  let pkgDir: string;

  beforeEach(() => {
    const base = path.join(os.tmpdir(), `atp-pkgval-${Date.now()}`);
    fs.mkdirSync(base, { recursive: true });
    stationDir = path.join(base, "station");
    pkgDir = path.join(base, "pkg");
    fs.mkdirSync(pkgDir, { recursive: true });
  });

  afterEach(() => {
    try {
      fs.rmSync(path.dirname(stationDir), { recursive: true });
    } catch {
      /* ignore */
    }
  });

  it("atp validate package exits non-zero when only type is set", () => {
    runAtp(["create", "package", "skeleton"], {
      cwd: pkgDir,
      env: { STATION_PATH: stationDir },
    });
    runAtp(["package", "type", "rule"], {
      cwd: pkgDir,
      env: { STATION_PATH: stationDir },
    });

    const result = runAtpExpectExit(
      ["validate", "package"],
      2,
      { cwd: pkgDir, env: { STATION_PATH: stationDir } }
    );
    expect(result.stdout + result.stderr).toMatch(/name|component|usage/i);
  });
});

function setupPackageWorkflow(
  base: string,
  pkgName: string,
  pkgType: string,
  files: { path: string; content: string }[]
) {
  const stationDir = path.join(base, "test-station");
  const pkgDir = path.join(base, "pkg-dir");
  fs.mkdirSync(pkgDir, { recursive: true });

  runAtp(["station", "init"], { env: { STATION_PATH: stationDir } });

  for (const f of files) {
    fs.writeFileSync(path.join(pkgDir, f.path), f.content);
  }

  runAtp(["create", "package", "skeleton"], {
    cwd: pkgDir,
    env: { STATION_PATH: stationDir },
  });
  runAtp(["package", "type", pkgType], {
    cwd: pkgDir,
    env: { STATION_PATH: stationDir },
  });
  runAtp(["package", "name", pkgName], {
    cwd: pkgDir,
    env: { STATION_PATH: stationDir },
  });
  runAtp(["package", "version", "0.1.0"], {
    cwd: pkgDir,
    env: { STATION_PATH: stationDir },
  });
  runAtp(["package", "usage", `Usage for ${pkgName}`], {
    cwd: pkgDir,
    env: { STATION_PATH: stationDir },
  });

  for (const f of files) {
    runAtp(["package", "component", "add", f.path], {
      cwd: pkgDir,
      env: { STATION_PATH: stationDir },
    });
  }

  runAtp(["catalog", "add", "package"], {
    cwd: pkgDir,
    env: { STATION_PATH: stationDir },
  });

  return { stationDir, pkgDir };
}

describe("Integration: package developer workflow (Skill type)", () => {
  let base: string;

  beforeEach(() => {
    base = path.join(os.tmpdir(), `atp-skill-${Date.now()}`);
    fs.mkdirSync(base, { recursive: true });
  });

  afterEach(() => {
    try {
      fs.rmSync(base, { recursive: true });
    } catch {
      /* ignore */
    }
  });

  it("builds a Skill package with SKILL.md and adds to catalog", () => {
    const { stationDir } = setupPackageWorkflow(
      base,
      "test-skill-pkg",
      "skill",
      [
        {
          path: "SKILL.md",
          content: `# Test Skill

Use this skill to test package installation.
`,
        },
      ]
    );

    const pkgInStation = path.join(stationDir, "user_packages", "test-skill-pkg");
    expect(fs.existsSync(pkgInStation)).toBe(true);
    expect(fs.existsSync(path.join(pkgInStation, "atp-package.yaml"))).toBe(true);
    expect(fs.existsSync(path.join(pkgInStation, "package.tar.gz"))).toBe(true);
  });
});

describe("Integration: package developer workflow (Command type)", () => {
  let base: string;

  beforeEach(() => {
    base = path.join(os.tmpdir(), `atp-cmd-${Date.now()}`);
    fs.mkdirSync(base, { recursive: true });
  });

  afterEach(() => {
    try {
      fs.rmSync(base, { recursive: true });
    } catch {
      /* ignore */
    }
  });

  it("builds a Command package with shell script and adds to catalog", () => {
    const { stationDir } = setupPackageWorkflow(
      base,
      "test-command-pkg",
      "shell",
      [
        {
          path: "helper.sh",
          content: "#!/bin/bash\necho 'helper script'\n",
        },
      ]
    );

    const pkgInStation = path.join(stationDir, "user_packages", "test-command-pkg");
    expect(fs.existsSync(pkgInStation)).toBe(true);
    expect(fs.existsSync(path.join(pkgInStation, "atp-package.yaml"))).toBe(true);
    expect(fs.existsSync(path.join(pkgInStation, "package.tar.gz"))).toBe(true);
  });
});

describe("Integration: package developer workflow (Experimental type)", () => {
  let base: string;

  beforeEach(() => {
    base = path.join(os.tmpdir(), `atp-exp-${Date.now()}`);
    fs.mkdirSync(base, { recursive: true });
  });

  afterEach(() => {
    try {
      fs.rmSync(base, { recursive: true });
    } catch {
      /* ignore */
    }
  });

  it("builds an Experimental package and adds to catalog", () => {
    const { stationDir } = setupPackageWorkflow(
      base,
      "test-experimental-pkg",
      "other",
      [
        {
          path: "payload.txt",
          content: "Experimental payload content\n",
        },
      ]
    );

    const pkgInStation = path.join(stationDir, "user_packages", "test-experimental-pkg");
    expect(fs.existsSync(pkgInStation)).toBe(true);
    expect(fs.existsSync(path.join(pkgInStation, "atp-package.yaml"))).toBe(true);
    expect(fs.existsSync(path.join(pkgInStation, "package.tar.gz"))).toBe(true);
  });
});

describe("Integration: package developer workflow - bundle with executable", () => {
  let stationDir: string;
  let pkgDir: string;
  const EXPECTED_MESSAGE = "ATP bundle test success";

  beforeEach(() => {
    const base = path.join(os.tmpdir(), `atp-bundle-${Date.now()}`);
    fs.mkdirSync(base, { recursive: true });
    stationDir = path.join(base, "station");
    pkgDir = path.join(base, "pkg");
    fs.mkdirSync(pkgDir, { recursive: true });
  });

  afterEach(() => {
    try {
      fs.rmSync(path.dirname(stationDir), { recursive: true });
    } catch {
      /* ignore */
    }
  });

  it("builds a Command package with a bundle containing an executable shell script and script outputs expected message", () => {
    runAtp(["station", "init"], { env: { STATION_PATH: stationDir } });

    const bundleDir = path.join(pkgDir, "echo-cmd", "bin");
    fs.mkdirSync(bundleDir, { recursive: true });
    const scriptPath = path.join(bundleDir, "echo-test.sh");
    fs.writeFileSync(
      scriptPath,
      `#!/bin/bash
echo "${EXPECTED_MESSAGE}"
`,
      "utf8"
    );
    fs.chmodSync(scriptPath, 0o755);

    runAtp(["create", "package", "skeleton"], {
      cwd: pkgDir,
      env: { STATION_PATH: stationDir },
    });
    runAtp(["package", "type", "shell"], {
      cwd: pkgDir,
      env: { STATION_PATH: stationDir },
    });
    runAtp(["package", "name", "test-bundle-echo"], {
      cwd: pkgDir,
      env: { STATION_PATH: stationDir },
    });
    runAtp(["package", "version", "0.1.0"], {
      cwd: pkgDir,
      env: { STATION_PATH: stationDir },
    });
    runAtp(["package", "usage", "Echo test script for bundle workflow"], {
      cwd: pkgDir,
      env: { STATION_PATH: stationDir },
    });
    runAtp(["package", "bundle", "add", "echo-cmd"], {
      cwd: pkgDir,
      env: { STATION_PATH: stationDir },
    });
    runAtp(["catalog", "add", "package"], {
      cwd: pkgDir,
      env: { STATION_PATH: stationDir },
    });

    const pkgInStation = path.join(stationDir, "user_packages", "test-bundle-echo");
    expect(fs.existsSync(pkgInStation)).toBe(true);
    expect(fs.existsSync(path.join(pkgInStation, "atp-package.yaml"))).toBe(true);
    expect(fs.existsSync(path.join(pkgInStation, "package.tar.gz"))).toBe(true);

    const scriptInStation = path.join(pkgInStation, "echo-cmd", "bin", "echo-test.sh");
    expect(fs.existsSync(scriptInStation)).toBe(true);

    const output = execSync(`bash "${scriptInStation}"`, { encoding: "utf8" });
    expect(output.trim()).toBe(EXPECTED_MESSAGE);
  });

  it("builds a Command package with a non-UNIX-conformant bundle (--exec-filter) and script outputs expected message", () => {
    runAtp(["station", "init"], { env: { STATION_PATH: stationDir } });

    // Non-UNIX: scripts/ instead of bin/, requires --exec-filter
    const scriptsDir = path.join(pkgDir, "scripts-util", "scripts");
    fs.mkdirSync(scriptsDir, { recursive: true });
    const scriptPath = path.join(scriptsDir, "run.sh");
    const msg = "ATP non-UNIX bundle success";
    fs.writeFileSync(
      scriptPath,
      `#!/bin/bash
echo "${msg}"
`,
      "utf8"
    );
    fs.chmodSync(scriptPath, 0o755);

    runAtp(["create", "package", "skeleton"], {
      cwd: pkgDir,
      env: { STATION_PATH: stationDir },
    });
    runAtp(["package", "type", "shell"], {
      cwd: pkgDir,
      env: { STATION_PATH: stationDir },
    });
    runAtp(["package", "name", "test-bundle-scripts"], {
      cwd: pkgDir,
      env: { STATION_PATH: stationDir },
    });
    runAtp(["package", "version", "0.1.0"], {
      cwd: pkgDir,
      env: { STATION_PATH: stationDir },
    });
    runAtp(["package", "usage", "Non-UNIX conformant bundle test"], {
      cwd: pkgDir,
      env: { STATION_PATH: stationDir },
    });
    runAtp(
      ["package", "bundle", "add", "scripts-util", "--exec-filter", "scripts-util/scripts/run.sh"],
      { cwd: pkgDir, env: { STATION_PATH: stationDir } }
    );
    runAtp(["catalog", "add", "package"], {
      cwd: pkgDir,
      env: { STATION_PATH: stationDir },
    });

    const pkgInStation = path.join(stationDir, "user_packages", "test-bundle-scripts");
    expect(fs.existsSync(pkgInStation)).toBe(true);
    const scriptInStation = path.join(pkgInStation, "scripts-util", "scripts", "run.sh");
    expect(fs.existsSync(scriptInStation)).toBe(true);

    const output = execSync(`bash "${scriptInStation}"`, { encoding: "utf8" });
    expect(output.trim()).toBe(msg);
  });

  it("atp package bundle remove removes bundle from stage.tar and manifest", () => {
    runAtp(["station", "init"], { env: { STATION_PATH: stationDir } });

    const bundleDir = path.join(pkgDir, "echo-cmd", "bin");
    fs.mkdirSync(bundleDir, { recursive: true });
    const scriptPath = path.join(bundleDir, "echo-test.sh");
    fs.writeFileSync(scriptPath, `#!/bin/bash\necho "bundled"\n`, "utf8");
    fs.chmodSync(scriptPath, 0o755);

    fs.writeFileSync(path.join(pkgDir, "readme.md"), "# Component\n");

    runAtp(["create", "package", "skeleton"], {
      cwd: pkgDir,
      env: { STATION_PATH: stationDir },
    });
    runAtp(["package", "type", "shell"], {
      cwd: pkgDir,
      env: { STATION_PATH: stationDir },
    });
    runAtp(["package", "name", "test-bundle-remove"], {
      cwd: pkgDir,
      env: { STATION_PATH: stationDir },
    });
    runAtp(["package", "version", "0.1.0"], {
      cwd: pkgDir,
      env: { STATION_PATH: stationDir },
    });
    runAtp(["package", "usage", "Bundle remove test"], {
      cwd: pkgDir,
      env: { STATION_PATH: stationDir },
    });
    runAtp(["package", "component", "add", "readme.md"], {
      cwd: pkgDir,
      env: { STATION_PATH: stationDir },
    });
    runAtp(["package", "bundle", "add", "echo-cmd"], {
      cwd: pkgDir,
      env: { STATION_PATH: stationDir },
    });

    expect(fs.existsSync(path.join(pkgDir, "stage.tar"))).toBe(true);
    const listBefore = execSync(`tar -tf "${path.join(pkgDir, "stage.tar")}"`, {
      encoding: "utf8",
      cwd: pkgDir,
    });
    expect(listBefore).toMatch(/echo-cmd/);

    runAtp(["package", "bundle", "remove", "echo-cmd"], {
      cwd: pkgDir,
      env: { STATION_PATH: stationDir },
    });

    const manifest = fs.readFileSync(path.join(pkgDir, "atp-package.yaml"), "utf8");
    expect(manifest).not.toMatch(/echo-cmd/);
    const listAfter = execSync(`tar -tf "${path.join(pkgDir, "stage.tar")}"`, {
      encoding: "utf8",
      cwd: pkgDir,
    });
    expect(listAfter).not.toMatch(/echo-cmd/);
    expect(listAfter).toMatch(/readme.md/);

    runAtp(["catalog", "add", "package"], {
      cwd: pkgDir,
      env: { STATION_PATH: stationDir },
    });
    const pkgInStation = path.join(stationDir, "user_packages", "test-bundle-remove");
    expect(fs.existsSync(pkgInStation)).toBe(true);
    expect(fs.existsSync(path.join(pkgInStation, "echo-cmd"))).toBe(false);
    expect(fs.existsSync(path.join(pkgInStation, "readme.md"))).toBe(true);
  });
});

describe("Integration: package developer - Feature 2 acceptance", () => {
  let stationDir: string;
  let pkgDir: string;
  let base: string;

  beforeEach(() => {
    base = path.join(os.tmpdir(), `atp-f2-${Date.now()}`);
    fs.mkdirSync(base, { recursive: true });
    stationDir = path.join(base, "station");
    pkgDir = path.join(base, "pkg");
    fs.mkdirSync(pkgDir, { recursive: true });
    process.env.STATION_PATH = stationDir;
  });

  afterEach(() => {
    try {
      fs.rmSync(base, { recursive: true });
    } catch {
      /* ignore */
    }
  });

  it("catalog add package fails with exit 1 when package is incomplete", () => {
    runAtp(["station", "init"], { env: { STATION_PATH: stationDir } });
    runAtp(["create", "package", "skeleton"], {
      cwd: pkgDir,
      env: { STATION_PATH: stationDir },
    });
    runAtp(["package", "type", "rule"], {
      cwd: pkgDir,
      env: { STATION_PATH: stationDir },
    });

    const result = runAtpExpectExit(
      ["catalog", "add", "package"],
      1,
      { cwd: pkgDir, env: { STATION_PATH: stationDir } }
    );
    const output = result.stdout + result.stderr;
    expect(output).toMatch(/Package definition is not yet complete|validation/i);
    expect(output).toMatch(/name|component|usage/i);
  });

  it("stage.tar is deleted from cwd after successful catalog add package", () => {
    runAtp(["station", "init"], { env: { STATION_PATH: stationDir } });
    fs.writeFileSync(path.join(pkgDir, "a.md"), "# A\n");
    runAtp(["create", "package", "skeleton"], {
      cwd: pkgDir,
      env: { STATION_PATH: stationDir },
    });
    runAtp(["package", "type", "rule"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
    runAtp(["package", "name", "stage-cleanup-pkg"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
    runAtp(["package", "version", "0.1.0"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
    runAtp(["package", "usage", "Test"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
    runAtp(["package", "component", "add", "a.md"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });

    expect(fs.existsSync(path.join(pkgDir, "stage.tar"))).toBe(true);

    runAtp(["catalog", "add", "package"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });

    expect(fs.existsSync(path.join(pkgDir, "stage.tar"))).toBe(false);
  });

  it("validate package exits 0 with success message when package complete", () => {
    runAtp(["station", "init"], { env: { STATION_PATH: stationDir } });
    fs.writeFileSync(path.join(pkgDir, "rule.md"), "# Rule\n");
    runAtp(["create", "package", "skeleton"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
    runAtp(["package", "type", "rule"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
    runAtp(["package", "name", "validate-pkg"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
    runAtp(["package", "version", "0.1.0"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
    runAtp(["package", "usage", "Validate test"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
    runAtp(["package", "component", "add", "rule.md"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });

    runAtp(["validate", "package"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
  });

  it("component add accepts multiple paths in one call", () => {
    runAtp(["station", "init"], { env: { STATION_PATH: stationDir } });
    fs.writeFileSync(path.join(pkgDir, "doc-guide.md"), "# Doc guide\n");
    fs.writeFileSync(path.join(pkgDir, "coding-standard.md"), "# Coding\n");
    runAtp(["create", "package", "skeleton"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
    runAtp(["package", "type", "rule"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
    runAtp(["package", "name", "multi-comp-pkg"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
    runAtp(["package", "version", "0.1.0"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
    runAtp(["package", "usage", "Multi component"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });

    runAtp(["package", "component", "add", "doc-guide.md", "coding-standard.md"], {
      cwd: pkgDir,
      env: { STATION_PATH: stationDir },
    });

    const list = execSync(`tar -tf "${path.join(pkgDir, "stage.tar")}"`, {
      encoding: "utf8",
      cwd: pkgDir,
    });
    expect(list).toMatch(/doc-guide\.md/);
    expect(list).toMatch(/coding-standard\.md/);
    const manifest = fs.readFileSync(path.join(pkgDir, "atp-package.yaml"), "utf8");
    expect(manifest).toMatch(/doc-guide\.md/);
    expect(manifest).toMatch(/coding-standard\.md/);
  });

  it("package appears in atp-catalog.yaml with name, version, location after catalog add", () => {
    runAtp(["station", "init"], { env: { STATION_PATH: stationDir } });
    fs.writeFileSync(path.join(pkgDir, "x.md"), "# X\n");
    runAtp(["create", "package", "skeleton"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
    runAtp(["package", "type", "rule"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
    runAtp(["package", "name", "catalog-entry-pkg"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
    runAtp(["package", "version", "1.2.3"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
    runAtp(["package", "usage", "Catalog entry test"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
    runAtp(["package", "component", "add", "x.md"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });

    runAtp(["catalog", "add", "package"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });

    const catalogPath = path.join(stationDir, "atp-catalog.yaml");
    const catalog = fs.readFileSync(catalogPath, "utf8");
    expect(catalog).toMatch(/catalog-entry-pkg/);
    expect(catalog).toMatch(/1\.2\.3/);
    expect(catalog).toMatch(/file:\/\//);
  });

  it("create package skeleton deletes previous atp-package.yaml and stage.tar", () => {
    runAtp(["station", "init"], { env: { STATION_PATH: stationDir } });
    fs.writeFileSync(path.join(pkgDir, "old.md"), "# Old\n");
    runAtp(["create", "package", "skeleton"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
    runAtp(["package", "type", "rule"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
    runAtp(["package", "name", "skeleton-pkg"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
    runAtp(["package", "version", "0.1.0"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
    runAtp(["package", "usage", "Test"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
    runAtp(["package", "component", "add", "old.md"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });

    expect(fs.existsSync(path.join(pkgDir, "stage.tar"))).toBe(true);
    const manifestBefore = fs.readFileSync(path.join(pkgDir, "atp-package.yaml"), "utf8");
    expect(manifestBefore).toMatch(/skeleton-pkg/);

    runAtp(["create", "package", "skeleton"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });

    expect(fs.existsSync(path.join(pkgDir, "stage.tar"))).toBe(false);
    const manifestAfter = fs.readFileSync(path.join(pkgDir, "atp-package.yaml"), "utf8");
    expect(manifestAfter).not.toMatch(/skeleton-pkg/);
  });

  it("component add with invalid path exits 1", () => {
    runAtp(["station", "init"], { env: { STATION_PATH: stationDir } });
    runAtp(["create", "package", "skeleton"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
    runAtp(["package", "type", "rule"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
    runAtp(["package", "name", "x"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
    runAtp(["package", "version", "0.1.0"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
    runAtp(["package", "usage", "x"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });

    const result = runAtpExpectExit(
      ["package", "component", "add", "../other/file.md"],
      1,
      { cwd: pkgDir, env: { STATION_PATH: stationDir } }
    );
    expect(result.stdout + result.stderr).toMatch(/Invalid path/);
  });

  it("bundle remove when bundle not in package exits 1", () => {
    runAtp(["station", "init"], { env: { STATION_PATH: stationDir } });
    fs.writeFileSync(path.join(pkgDir, "only.md"), "# Only component\n");
    runAtp(["create", "package", "skeleton"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
    runAtp(["package", "type", "rule"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
    runAtp(["package", "name", "no-bundle-pkg"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
    runAtp(["package", "version", "0.1.0"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
    runAtp(["package", "usage", "No bundle"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
    runAtp(["package", "component", "add", "only.md"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });

    const result = runAtpExpectExit(
      ["package", "bundle", "remove", "nonexistent-bundle"],
      1,
      { cwd: pkgDir, env: { STATION_PATH: stationDir } }
    );
    expect(result.stdout + result.stderr).toMatch(/had not been included|not.*included/i);
  });

  it("builds MCP type package and adds to catalog", () => {
    runAtp(["station", "init"], { env: { STATION_PATH: stationDir } });
    fs.writeFileSync(path.join(pkgDir, "SKILL.md"), "# MCP skill\n");
    runAtp(["create", "package", "skeleton"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
    runAtp(["package", "type", "mcp"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
    runAtp(["package", "name", "test-mcp-pkg"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
    runAtp(["package", "version", "0.1.0"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
    runAtp(["package", "usage", "MCP test"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
    runAtp(["package", "component", "add", "SKILL.md"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });

    runAtp(["catalog", "add", "package"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });

    const pkgInStation = path.join(stationDir, "user_packages", "test-mcp-pkg");
    expect(fs.existsSync(pkgInStation)).toBe(true);
    expect(fs.existsSync(path.join(pkgInStation, "atp-package.yaml"))).toBe(true);
    expect(fs.existsSync(path.join(pkgInStation, "package.tar.gz"))).toBe(true);
  });

  it("bundle with bin/ and share/ structure is staged correctly", () => {
    runAtp(["station", "init"], { env: { STATION_PATH: stationDir } });
    const binDir = path.join(pkgDir, "exec-base", "bin");
    const shareDir = path.join(pkgDir, "exec-base", "share", "schema");
    fs.mkdirSync(binDir, { recursive: true });
    fs.mkdirSync(shareDir, { recursive: true });
    fs.writeFileSync(path.join(binDir, "parser"), "#!/bin/bash\necho parser\n");
    fs.writeFileSync(path.join(shareDir, "schema.schm"), "schema content\n");
    fs.chmodSync(path.join(binDir, "parser"), 0o755);

    runAtp(["create", "package", "skeleton"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
    runAtp(["package", "type", "shell"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
    runAtp(["package", "name", "bin-share-pkg"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
    runAtp(["package", "version", "0.1.0"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
    runAtp(["package", "usage", "Bin and share test"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
    runAtp(["package", "bundle", "add", "exec-base"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });

    const list = execSync(`tar -tf "${path.join(pkgDir, "stage.tar")}"`, {
      encoding: "utf8",
      cwd: pkgDir,
    });
    expect(list).toMatch(/exec-base\/bin\/parser/);
    expect(list).toMatch(/exec-base\/share\/schema\/schema\.schm/);

    runAtp(["catalog", "add", "package"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
    const pkgInStation = path.join(stationDir, "user_packages", "bin-share-pkg");
    expect(fs.existsSync(path.join(pkgInStation, "exec-base", "bin", "parser"))).toBe(true);
    expect(fs.existsSync(path.join(pkgInStation, "exec-base", "share", "schema", "schema.schm"))).toBe(true);
  });

  it("component add produces flat layout in stage.tar (base names only)", () => {
    runAtp(["station", "init"], { env: { STATION_PATH: stationDir } });
    fs.writeFileSync(path.join(pkgDir, "doc-guide.md"), "# Doc\n");
    fs.writeFileSync(path.join(pkgDir, "coding-standard.md"), "# Coding\n");
    runAtp(["create", "package", "skeleton"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
    runAtp(["package", "type", "rule"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
    runAtp(["package", "name", "flat-pkg"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
    runAtp(["package", "version", "0.1.0"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
    runAtp(["package", "usage", "Flat layout"], { cwd: pkgDir, env: { STATION_PATH: stationDir } });
    runAtp(["package", "component", "add", "doc-guide.md", "coding-standard.md"], {
      cwd: pkgDir,
      env: { STATION_PATH: stationDir },
    });

    const list = execSync(`tar -tf "${path.join(pkgDir, "stage.tar")}"`, {
      encoding: "utf8",
      cwd: pkgDir,
    });
    const lines = list.split("\n").map((l) => l.trim()).filter(Boolean);
    expect(lines).toContain("doc-guide.md");
    expect(lines).toContain("coding-standard.md");
  });
});

