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
