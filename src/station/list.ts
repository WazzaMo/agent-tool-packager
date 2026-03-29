/**
 * List packages installed in the Station.
 * Reads manifest/*.yaml (or manifest/*.json) and prints NAME | VERSION | scope/source.
 */

import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { getStationPath, pathExists } from "../config/paths.js";

/** Parsed fields from a Station-side package manifest file. */
interface StationPackageManifest {
  name?: string;
  version?: string;
  scope?: string;
  source?: string;
}

/** One row for the Station list table output. */
type StationListRow = {
  name: string;
  version: string;
  scope: string;
  source: string;
};

/**
 * Parse manifest file content as YAML or JSON depending on extension.
 *
 * @param content - Raw file text.
 * @param ext - Lowercased extension (`.yaml`, `.yml`, `.json`).
 * @returns Parsed object, or `null` on parse failure.
 */
function parseStationManifestContent(
  content: string,
  ext: string
): StationPackageManifest | null {
  try {
    if (ext === ".json") {
      return JSON.parse(content) as StationPackageManifest;
    }
    return yaml.load(content) as StationPackageManifest | null;
  } catch {
    return null;
  }
}

/**
 * Pad a string for fixed-width CLI columns.
 *
 * @param str - Cell text.
 * @param width - Minimum column width.
 * @returns Padded string.
 */
function padCell(str: string, width: number): string {
  return str.padEnd(Math.max(width, str.length));
}

/**
 * Collect display rows from every manifest file in the Station manifest directory.
 *
 * @param manifestDir - Absolute path to `.../manifest`.
 * @returns Non-empty rows with string `name`; skips invalid files.
 */
function collectStationListRows(manifestDir: string): StationListRow[] {
  const entries = fs.readdirSync(manifestDir);
  const rows: StationListRow[] = [];

  for (const entry of entries) {
    const ext = path.extname(entry).toLowerCase();
    if (ext !== ".yaml" && ext !== ".yml" && ext !== ".json") {
      continue;
    }

    const filePath = path.join(manifestDir, entry);
    if (!fs.statSync(filePath).isFile()) {
      continue;
    }

    const content = fs.readFileSync(filePath, "utf8");
    const data = parseStationManifestContent(content, ext);
    if (!data || typeof data.name !== "string") {
      continue;
    }

    rows.push({
      name: data.name,
      version: data.version ?? "-",
      scope: data.scope ?? "-",
      source: data.source ?? "-",
    });
  }

  return rows;
}

/**
 * Print a fixed-width table of Station-installed packages to stdout.
 *
 * @param rows - Rows from {@link collectStationListRows}.
 */
function printStationPackageTable(rows: StationListRow[]): void {
  const nameW = Math.max(4, ...rows.map((m) => m.name.length));
  const versionW = Math.max(7, ...rows.map((m) => m.version.length));
  const scopeW = Math.max(5, ...rows.map((m) => m.scope.length));
  const sourceW = Math.max(6, ...rows.map((m) => m.source.length));

  console.log(
    padCell("NAME", nameW) +
      "  " +
      padCell("VERSION", versionW) +
      "  " +
      padCell("SCOPE", scopeW) +
      "  SOURCE"
  );
  console.log("-".repeat(nameW + versionW + scopeW + sourceW + 9));

  for (const m of rows) {
    console.log(
      padCell(m.name, nameW) +
        "  " +
        padCell(m.version, versionW) +
        "  " +
        padCell(m.scope, scopeW) +
        "  " +
        m.source
    );
  }
}

/**
 * List packages registered in the Station `manifest/` directory (stdout table).
 */
export function stationList(): void {
  const stationPath = getStationPath();
  const manifestDir = path.join(stationPath, "manifest");

  if (!pathExists(manifestDir)) {
    console.log("No packages installed in Station");
    return;
  }

  const rows = collectStationListRows(manifestDir);

  if (rows.length === 0) {
    console.log("No packages installed in Station");
    return;
  }

  printStationPackageTable(rows);
}
