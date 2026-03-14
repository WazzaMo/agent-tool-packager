/**
 * Create package skeleton: atp create package skeleton
 * Deletes atp-package.yaml and stage.tar if present, creates empty atp-package.yaml.
 */

import fs from "node:fs";
import path from "node:path";

const PACKAGE_FILE = "atp-package.yaml";
const STAGE_FILE = "stage.tar";

export function createPackageSkeleton(cwd: string): void {
  const pkgPath = path.join(cwd, PACKAGE_FILE);
  const stagePath = path.join(cwd, STAGE_FILE);

  if (fs.existsSync(pkgPath)) {
    fs.unlinkSync(pkgPath);
  }
  if (fs.existsSync(stagePath)) {
    fs.unlinkSync(stagePath);
  }

  fs.writeFileSync(pkgPath, "type: \"\"\n", "utf8");
}
