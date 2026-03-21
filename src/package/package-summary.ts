/**
 * Print package summary: set items and missing (from validate).
 * See docs/features/2-package-developer-support.md.
 */

import { loadDevManifest } from "./load-manifest.js";
import { validatePackage } from "./validate.js";

/**
 * Print package summary and exit with validate exit code.
 * @param cwd - Package root directory
 */
export function packageSummary(cwd: string): void {
  const manifest = loadDevManifest(cwd);
  if (!manifest) {
    console.error("No atp-package.yaml found. Run `atp create package skeleton` first.");
    process.exit(1);
  }

  const validation = validatePackage(cwd);

  console.log("Package summary:");
  if (manifest.name) console.log(`  Name: ${manifest.name}`);
  if (manifest.type) console.log(`  Type: ${manifest.type}`);
  if (manifest.developer) console.log(`  Developer: ${manifest.developer}`);
  if (manifest.license) console.log(`  License: ${manifest.license}`);
  if (manifest.version) console.log(`  Version: ${manifest.version}`);
  if (manifest.copyright?.length) {
    console.log(`  Copyright: ${manifest.copyright.join(", ")}`);
  }
  if (manifest.usage?.length) console.log(`  Usage: ${manifest.usage.join(" ")}`);
  if (manifest.components?.length) {
    console.log(`  Components: ${manifest.components.join(", ")}`);
  }
  if (manifest.bundles?.length) {
    const paths = manifest.bundles.map((b) => (typeof b === "string" ? b : b.path));
    console.log(`  Bundles: ${paths.join(", ")}`);
  }

  if (validation.missing.length > 0) {
    console.log("\nMissing:");
    for (const m of validation.missing) {
      console.log(`  - ${m}`);
    }
    if (validation.missing.some((m) => m.includes("components") || m.includes("bundles"))) {
      console.log("\nFor a rule, a list of markdown files would be normal.");
    }
  } else {
    console.log("\nThis package can be added to the catalog.");
  }

  process.exit(validation.exitCode);
}
