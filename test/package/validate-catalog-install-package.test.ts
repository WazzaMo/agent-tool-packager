/**
 * Unit tests for {@link validateCatalogInstallPackage}.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { validateCatalogInstallPackage } from "../../src/package/validate-catalog-install-package.js";

function tempPkgDir(): string {
  const dir = path.join(os.tmpdir(), `atp-cat-val-${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

describe("validateCatalogInstallPackage", () => {
  let pkgDir: string;

  beforeEach(() => {
    pkgDir = tempPkgDir();
  });

  afterEach(() => {
    try {
      fs.rmSync(pkgDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it("fails when manifest is missing", () => {
    const r = validateCatalogInstallPackage(pkgDir);
    expect(r.ok).toBe(false);
    expect(r.missing.some((m) => m.includes("atp-package.yaml"))).toBe(true);
  });

  it("passes for legacy Rule layout when manifest, assets, and files align", () => {
    fs.writeFileSync(
      path.join(pkgDir, "atp-package.yaml"),
      `type: Rule
name: leg-rule
version: 0.1.0
usage:
  - help
components:
  - rule.md
assets:
  - path: rule.md
    type: rule
    name: rule
`,
      "utf8"
    );
    fs.writeFileSync(path.join(pkgDir, "rule.md"), "# R\n\nBody.\n", "utf8");
    const r = validateCatalogInstallPackage(pkgDir);
    expect(r.ok).toBe(true);
  });

  it("fails when a declared component file is missing on disk", () => {
    fs.writeFileSync(
      path.join(pkgDir, "atp-package.yaml"),
      `type: Rule
name: leg-rule
version: 0.1.0
usage:
  - help
components:
  - missing.md
assets:
  - path: missing.md
    type: rule
    name: missing
`,
      "utf8"
    );
    const r = validateCatalogInstallPackage(pkgDir);
    expect(r.ok).toBe(false);
    expect(r.missing.some((m) => m.includes("staged file missing"))).toBe(true);
  });

  it("fails when assets list references a path that is not on disk", () => {
    fs.writeFileSync(
      path.join(pkgDir, "atp-package.yaml"),
      `type: Rule
name: leg-rule
version: 0.1.0
usage:
  - help
components:
  - rule.md
assets:
  - path: rule.md
    type: rule
    name: rule
  - path: ghost.md
    type: rule
    name: ghost
`,
      "utf8"
    );
    fs.writeFileSync(path.join(pkgDir, "rule.md"), "# R\n\nBody.\n", "utf8");
    const r = validateCatalogInstallPackage(pkgDir);
    expect(r.ok).toBe(false);
    expect(r.missing.some((m) => m.includes("ghost.md"))).toBe(true);
  });

  it("validates multi-part paths under part_N_Type on disk", () => {
    fs.writeFileSync(
      path.join(pkgDir, "atp-package.yaml"),
      `type: Multi
name: multi-p
version: 0.1.0
parts:
  - type: Rule
    usage:
      - u1
    components:
      - a.md
assets:
  - path: part_1_Rule/a.md
    type: rule
    name: a
`,
      "utf8"
    );
    fs.mkdirSync(path.join(pkgDir, "part_1_Rule"), { recursive: true });
    fs.writeFileSync(path.join(pkgDir, "part_1_Rule", "a.md"), "# A\n\nx.\n", "utf8");
    const r = validateCatalogInstallPackage(pkgDir);
    expect(r.ok).toBe(true);
  });
});
