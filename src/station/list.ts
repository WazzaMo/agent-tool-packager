/**
 * List packages installed in the Station.
 * Reads manifest/*.yaml (or manifest/*.json) and prints NAME | VERSION | scope/source.
 */

import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { getStationPath, pathExists } from "../config/paths.js";
import { readTypeSummaryFromPackageDir, AtpPackageYamlParseError } from "../catalog/package-type-summary.js";

import { StationManifestParseError } from "./list-errors.js";

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
  /** From `user_packages/<name>/atp-package.yaml` when `--extended`. */
  typeSuffix?: string;
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
  let data: unknown;
  try {
    if (ext === ".json") {
      data = JSON.parse(content) as StationPackageManifest;
    } else {
      data = yaml.load(content);
    }
  } catch {
    throw new StationManifestParseError();
  }
  if (!data || typeof data !== "object") {
    return null;
  }
  return data as StationPackageManifest;
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
 * @param stationPath - Station root (for `user_packages/` when `extended`).
 * @param extended - When true, append type summary from each package’s `atp-package.yaml`.
 * @returns Non-empty rows with string `name`; skips invalid files.
 * @throws {@link StationManifestParseError} on JSON/YAML syntax errors in `manifest/`.
 * @throws {@link AtpPackageYamlParseError} when `extended` and a package YAML is invalid.
 */
function collectStationListRows(
  manifestDir: string,
  stationPath: string,
  extended: boolean
): StationListRow[] {
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

    const row: StationListRow = {
      name: data.name,
      version: data.version ?? "-",
      scope: data.scope ?? "-",
      source: data.source ?? "-",
    };
    if (extended) {
      const pkgDir = path.join(stationPath, "user_packages", data.name);
      row.typeSuffix = readTypeSummaryFromPackageDir(pkgDir);
    }
    rows.push(row);
  }

  return rows;
}

/**
 * Print a fixed-width table of Station-installed packages to stdout.
 *
 * @param rows - Rows from {@link collectStationListRows}.
 */
function printStationPackageTable(rows: StationListRow[]): void {
  const nameW = Math.max(
    4,
    ...rows.map((m) => m.name.length + (m.typeSuffix?.length ?? 0))
  );
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
      padCell(displayStationName(m), nameW) +
        "  " +
        padCell(m.version, versionW) +
        "  " +
        padCell(m.scope, scopeW) +
        "  " +
        m.source
    );
  }
}

function displayStationName(m: StationListRow): string {
  return m.name + (m.typeSuffix ?? "");
}

/**
 * List packages registered in the Station `manifest/` directory (stdout table).
 *
 * @param opts.extended - Append type summary from each `user_packages/<name>/atp-package.yaml`.
 * @throws Never; uses `process.exit(2)` on manifest or package YAML parse errors.
 */
export function stationList(opts?: { extended?: boolean }): void {
  const stationPath = getStationPath();
  const manifestDir = path.join(stationPath, "manifest");

  if (!pathExists(manifestDir)) {
    console.log("No packages installed in Station");
    return;
  }

  let rows: StationListRow[];
  try {
    rows = collectStationListRows(manifestDir, stationPath, opts?.extended ?? false);
  } catch (err) {
    if (err instanceof StationManifestParseError || err instanceof AtpPackageYamlParseError) {
      console.error(err.message);
      process.exit(2);
    }
    throw err;
  }

  if (rows.length === 0) {
    console.log("No packages installed in Station");
    return;
  }

  printStationPackageTable(rows);
}
