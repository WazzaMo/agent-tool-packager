/**
 * Integration tests for package developer workflow (Rule, Skill, Command, Experimental, Bundle).
 * See docs/features/2-package-developer-support.md Test Approach.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { runAtp, runAtpExpectExit } from "./test-helpers.js";
import {
  atpCwd,
  initPackage,
  expectPackageInStation,
  setupPackageWorkflow,
  listStageTar,
  createTempPackageEnv,
  cleanupTempPackageEnv,
} from "./package-developer-helpers.js";

describe("Integration: package developer workflow (Rule type)", () => {
  let base: string;
  let stationDir: string;
  let pkgDir: string;
  let origStationPath: string | undefined;

  beforeEach(() => {
    const env = createTempPackageEnv("atp-pkgdev");
    base = env.base;
    stationDir = env.stationDir;
    pkgDir = env.pkgDir;
    origStationPath = env.origStationPath;
  });

  afterEach(() => {
    cleanupTempPackageEnv(base, origStationPath);
  });

  it("builds a Rule package and adds it to the station catalog", () => {
    const ruleContent = `# Rule Test Package

Being able to install this, means success.
`;
    fs.writeFileSync(path.join(pkgDir, "test-rule.md"), ruleContent);

    initPackage(pkgDir, stationDir, {
      type: "rule",
      name: "test-package-1",
      usage: "Test rule for integration",
      components: ["test-rule.md"],
      catalogAdd: true,
    });

    expectPackageInStation(stationDir, "test-package-1");
  });
});

describe("Integration: package developer - validate fails when incomplete", () => {
  let base: string;
  let stationDir: string;
  let pkgDir: string;
  let origStationPath: string | undefined;

  beforeEach(() => {
    const env = createTempPackageEnv("atp-pkgval");
    base = env.base;
    stationDir = env.stationDir;
    pkgDir = env.pkgDir;
    origStationPath = env.origStationPath;
  });

  afterEach(() => {
    cleanupTempPackageEnv(base, origStationPath);
  });

  it("atp validate package exits non-zero when only type is set", () => {
    const o = atpCwd(pkgDir, stationDir);
    runAtp(["create", "package", "skeleton", "--legacy"], o);
    runAtp(["package", "type", "rule"], o);

    const result = runAtpExpectExit(["validate", "package"], 2, o);
    expect(result.stdout + result.stderr).toMatch(/name|component|usage/i);
  });
});

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

    expectPackageInStation(stationDir, "test-skill-pkg");
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

    expectPackageInStation(stationDir, "test-command-pkg");
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

    expectPackageInStation(stationDir, "test-experimental-pkg");
  });
});

describe("Integration: package developer workflow - bundle with executable", () => {
  let base: string;
  let stationDir: string;
  let pkgDir: string;
  let origStationPath: string | undefined;
  const EXPECTED_MESSAGE = "ATP bundle test success";

  beforeEach(() => {
    const env = createTempPackageEnv("atp-bundle");
    base = env.base;
    stationDir = env.stationDir;
    pkgDir = env.pkgDir;
    origStationPath = env.origStationPath;
  });

  afterEach(() => {
    cleanupTempPackageEnv(base, origStationPath);
  });

  it("builds a Command package with a bundle containing an executable shell script and script outputs expected message", () => {
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

    initPackage(pkgDir, stationDir, {
      type: "shell",
      name: "test-bundle-echo",
      usage: "Echo test script for bundle workflow",
      bundles: [{ path: "echo-cmd" }],
      catalogAdd: true,
    });

    expectPackageInStation(stationDir, "test-bundle-echo");
    const scriptInStation = path.join(stationDir, "user_packages", "test-bundle-echo", "echo-cmd", "bin", "echo-test.sh");
    expect(fs.existsSync(scriptInStation)).toBe(true);

    const output = execSync(`bash "${scriptInStation}"`, { encoding: "utf8" });
    expect(output.trim()).toBe(EXPECTED_MESSAGE);
  });

  it("builds a Command package with a non-UNIX-conformant bundle (--exec-filter) and script outputs expected message", () => {
    const msg = "ATP non-UNIX bundle success";
    const scriptsDir = path.join(pkgDir, "scripts-util", "scripts");
    fs.mkdirSync(scriptsDir, { recursive: true });
    const scriptPath = path.join(scriptsDir, "run.sh");
    fs.writeFileSync(
      scriptPath,
      `#!/bin/bash
echo "${msg}"
`,
      "utf8"
    );
    fs.chmodSync(scriptPath, 0o755);

    initPackage(pkgDir, stationDir, {
      type: "shell",
      name: "test-bundle-scripts",
      usage: "Non-UNIX conformant bundle test",
      bundles: [{ path: "scripts-util", execFilter: "scripts-util/scripts/run.sh" }],
      catalogAdd: true,
    });

    const scriptInStation = path.join(stationDir, "user_packages", "test-bundle-scripts", "scripts-util", "scripts", "run.sh");
    expect(fs.existsSync(scriptInStation)).toBe(true);
    const output = execSync(`bash "${scriptInStation}"`, { encoding: "utf8" });
    expect(output.trim()).toBe(msg);
  });

  it("atp package bundle remove removes bundle from stage.tar and manifest", () => {
    const o = atpCwd(pkgDir, stationDir);
    const bundleDir = path.join(pkgDir, "echo-cmd", "bin");
    fs.mkdirSync(bundleDir, { recursive: true });
    const scriptPath = path.join(bundleDir, "echo-test.sh");
    fs.writeFileSync(scriptPath, `#!/bin/bash\necho "bundled"\n`, "utf8");
    fs.chmodSync(scriptPath, 0o755);
    fs.writeFileSync(path.join(pkgDir, "readme.md"), "# Component\n");

    initPackage(pkgDir, stationDir, {
      type: "shell",
      name: "test-bundle-remove",
      usage: "Bundle remove test",
      components: ["readme.md"],
      bundles: [{ path: "echo-cmd" }],
      catalogAdd: false,
    });

    expect(fs.existsSync(path.join(pkgDir, "stage.tar"))).toBe(true);
    expect(listStageTar(pkgDir)).toMatch(/echo-cmd/);

    runAtp(["package", "bundle", "remove", "echo-cmd"], o);

    const manifest = fs.readFileSync(path.join(pkgDir, "atp-package.yaml"), "utf8");
    expect(manifest).not.toMatch(/echo-cmd/);
    const listAfter = listStageTar(pkgDir);
    expect(listAfter).not.toMatch(/echo-cmd/);
    expect(listAfter).toMatch(/readme.md/);

    runAtp(["catalog", "add", "package"], o);
    const pkgInStation = path.join(stationDir, "user_packages", "test-bundle-remove");
    expect(fs.existsSync(pkgInStation)).toBe(true);
    expect(fs.existsSync(path.join(pkgInStation, "echo-cmd"))).toBe(false);
    expect(fs.existsSync(path.join(pkgInStation, "readme.md"))).toBe(true);
  });
});
