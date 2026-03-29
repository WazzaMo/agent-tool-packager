/**
 * Read `atp-package.yaml` and format a short type summary for list output (Feature 4).
 */

import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

/** Thrown when `atp-package.yaml` cannot be parsed; list commands should exit 2. */
export class AtpPackageYamlParseError extends Error {
  constructor(message = "Invalid atp-package.yaml") {
    super(message);
    this.name = "AtpPackageYamlParseError";
  }
}

/**
 * Build a bracket suffix such as ` (Skill, Mcp)` from a loaded manifest object.
 *
 * @param rec - Parsed YAML root.
 * @returns Summary including leading space, or empty string when unknown.
 */
export function typeSummarySuffixFromRecord(rec: Record<string, unknown>): string {
  const parts = rec.parts;
  if (Array.isArray(parts) && parts.length > 0) {
    const types = parts.map((p) => {
      if (p && typeof p === "object" && p !== null && "type" in p) {
        return String((p as { type: unknown }).type);
      }
      return "?";
    });
    return ` (${types.join(", ")})`;
  }
  const t = rec.type;
  if (typeof t === "string" && t.trim() !== "") {
    return ` (${t})`;
  }
  return "";
}

/**
 * Load `atp-package.yaml` under `pkgDir` and return {@link typeSummarySuffixFromRecord}.
 *
 * @param pkgDir - Package root (catalog install dir or project package).
 * @returns Type suffix, or empty string when the file is missing.
 * @throws {@link AtpPackageYamlParseError} on YAML parse failure.
 */
export function readTypeSummaryFromPackageDir(pkgDir: string): string {
  const manifestPath = path.join(pkgDir, "atp-package.yaml");
  if (!fs.existsSync(manifestPath)) {
    return "";
  }
  try {
    const raw = yaml.load(fs.readFileSync(manifestPath, "utf8"));
    if (!raw || typeof raw !== "object") {
      return "";
    }
    return typeSummarySuffixFromRecord(raw as Record<string, unknown>);
  } catch {
    throw new AtpPackageYamlParseError();
  }
}
