/**
 * Print package summary: set items and missing (from validate).
 */

import { loadDevManifest } from "./load-manifest.js";
import { isMultiDevManifest } from "./manifest-layout.js";
import {
  printManifestCommonHeader,
  printMultiTypePartsSection,
  printSingleTypePayloadSection,
} from "./package-summary-sections.js";
import { validatePackage } from "./validate.js";

/**
 * Print package summary (metadata, parts or root payload, missing list) and exit
 * with the same code as {@link validatePackage}.
 *
 * @param cwd - Package root directory.
 */
export function packageSummary(cwd: string): void {
  const manifest = loadDevManifest(cwd);
  if (!manifest) {
    console.error("No atp-package.yaml found. Run `atp create package skeleton` first.");
    process.exit(1);
  }

  const validation = validatePackage(cwd);

  console.log("Package summary:");
  printManifestCommonHeader(manifest);

  if (isMultiDevManifest(manifest)) {
    printMultiTypePartsSection(manifest);
  } else {
    printSingleTypePayloadSection(manifest);
  }

  if (validation.missing.length > 0) {
    console.log("\nMissing:");
    for (const m of validation.missing) {
      console.log(`  - ${m}`);
    }
    if (validation.missing.some((m) => m.includes("components") || m.includes("bundles"))) {
      console.log(
        "\nFor markdown-based types (rule, prompt, skill), component files are typical; for Hook, ship hooks.json and hook scripts (see Feature 2)."
      );
    }
  } else {
    console.log("\nThis package can be added to the catalog.");
  }

  process.exit(validation.exitCode);
}
