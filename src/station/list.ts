/**
 * List packages installed in the Station.
 * Reads manifest/*.yaml (or manifest/*.json) and prints NAME | VERSION | scope/source.
 */

import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { getStationPath, pathExists } from "../config/paths.js";

interface StationPackageManifest {
  name?: string;
  version?: string;
  scope?: string;
  source?: string;
}

function parseManifest(content: string, ext: string): StationPackageManifest | null {
  try {
    if (ext === ".json") {
      return JSON.parse(content) as StationPackageManifest;
    }
    return yaml.load(content) as StationPackageManifest | null;
  } catch {
    return null;
  }
}

function pad(str: string, width: number): string {
  return str.padEnd(Math.max(width, str.length));
}

export function stationList(): void {
  const stationPath = getStationPath();
  const manifestDir = path.join(stationPath, "manifest");

  if (!pathExists(manifestDir)) {
    console.log("No packages installed in Station");
    return;
  }

  const entries = fs.readdirSync(manifestDir);
  const manifests: Array<{ name: string; version: string; scope: string; source: string }> = [];

  for (const entry of entries) {
    const ext = path.extname(entry).toLowerCase();
    if (ext !== ".yaml" && ext !== ".yml" && ext !== ".json") continue;

    const filePath = path.join(manifestDir, entry);
    if (!fs.statSync(filePath).isFile()) continue;

    const content = fs.readFileSync(filePath, "utf8");
    const data = parseManifest(content, ext);
    if (!data || typeof data.name !== "string") continue;

    manifests.push({
      name: data.name,
      version: data.version ?? "-",
      scope: data.scope ?? "-",
      source: data.source ?? "-",
    });
  }

  if (manifests.length === 0) {
    console.log("No packages installed in Station");
    return;
  }

  const nameW = Math.max(4, ...manifests.map((m) => m.name.length));
  const versionW = Math.max(7, ...manifests.map((m) => m.version.length));
  const scopeW = Math.max(5, ...manifests.map((m) => m.scope.length));
  const sourceW = Math.max(6, ...manifests.map((m) => m.source.length));

  console.log(pad("NAME", nameW) + "  " + pad("VERSION", versionW) + "  " + pad("SCOPE", scopeW) + "  SOURCE");
  console.log("-".repeat(nameW + versionW + scopeW + sourceW + 9));

  for (const m of manifests) {
    console.log(
      pad(m.name, nameW) + "  " +
      pad(m.version, versionW) + "  " +
      pad(m.scope, scopeW) + "  " +
      m.source
    );
  }
}
