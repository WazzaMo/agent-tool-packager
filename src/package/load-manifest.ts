/**
 * Load and parse atp-package.yaml in package developer format.
 */

import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import type { BundleDefinition, DevPackageManifest, PackagePart } from "./types.js";

const PACKAGE_FILE = "atp-package.yaml";

/**
 * Coerce a YAML field to a string array (scalar becomes a one-element list).
 *
 * @param value - Raw YAML value.
 * @returns Normalised string list.
 */
function coalesceYamlStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (value != null) return [String(value)];
  return [];
}

/**
 * Load and parse `atp-package.yaml` in developer format.
 * Supports flat YAML and legacy `Package:` list format.
 *
 * @param cwd - Package root directory.
 * @returns Parsed manifest, or null when file missing; `{}` for empty/invalid top-level.
 */
export function loadDevManifest(cwd: string): DevPackageManifest | null {
  const pkgPath = path.join(cwd, PACKAGE_FILE);
  if (!fs.existsSync(pkgPath)) return null;

  const content = fs.readFileSync(pkgPath, "utf8");
  const data = yaml.load(content) as unknown;

  if (!data || typeof data !== "object") return {};

  if ("Package" in data && Array.isArray((data as { Package: unknown }).Package)) {
    return parsePackageList((data as { Package: unknown[] }).Package);
  }

  return normalizeDevManifest(data as Record<string, unknown>);
}

/**
 * @param arr - Raw `bundles` array from YAML.
 * @returns Normalised bundle paths or definitions.
 */
function parseBundles(arr: unknown): (string | BundleDefinition)[] | undefined {
  if (!Array.isArray(arr)) return undefined;
  return arr.map((b) => {
    if (b && typeof b === "object") {
      const bObj = b as Record<string, unknown>;
      return {
        path: String(bObj.path ?? ""),
        "exec-filter": bObj["exec-filter"] ? String(bObj["exec-filter"]) : undefined,
      };
    }
    return String(b);
  });
}

/**
 * @param arr - Raw `parts` array from YAML.
 * @returns Parsed part list, or undefined when absent/invalid.
 */
function parseParts(arr: unknown): PackagePart[] | undefined {
  if (arr === undefined || arr === null) return undefined;
  if (!Array.isArray(arr)) return undefined;
  const out: PackagePart[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const p = item as Record<string, unknown>;
    const usage = coalesceYamlStringList(p.usage);
    const part: PackagePart = {
      type: String(p.type ?? ""),
      usage,
      components: coalesceYamlStringList(p.components),
      bundles: parseBundles(p.bundles),
    };
    out.push(part);
  }
  return out;
}

/**
 * @param data - Flat root object from YAML.
 * @returns Normalised {@link DevPackageManifest}.
 */
function normalizeDevManifest(data: Record<string, unknown>): DevPackageManifest {
  const parts = parseParts(data.parts);
  return {
    name: String(data.name ?? ""),
    type: String(data.type ?? ""),
    version: String(data.version ?? ""),
    usage: coalesceYamlStringList(data.usage),
    components: coalesceYamlStringList(data.components),
    parts,
    developer: data.developer != null ? String(data.developer) : undefined,
    license: data.license != null ? String(data.license) : undefined,
    copyright: Array.isArray(data.copyright) ? data.copyright.map(String) : undefined,
    bundles: parseBundles(data.bundles),
  };
}

/**
 * @param list - Legacy `Package` list entries.
 * @returns Merged flat manifest (last wins for repeated keys).
 */
function parsePackageList(list: unknown[]): DevPackageManifest {
  const out: DevPackageManifest = {
    name: "",
    type: "",
    version: "",
    usage: [],
    components: [],
  };
  for (const item of list) {
    if (item && typeof item === "object") {
      const obj = item as Record<string, unknown>;
      if ("Name" in obj && obj.Name != null) out.name = String(obj.Name);
      if ("Type" in obj && obj.Type != null) out.type = String(obj.Type);
      if ("Developer" in obj && obj.Developer != null) out.developer = String(obj.Developer);
      if ("License" in obj && obj.License != null) out.license = String(obj.License);
      if ("Version" in obj && obj.Version != null) out.version = String(obj.Version);
      if ("Copyright" in obj) {
        out.copyright = Array.isArray(obj.Copyright)
          ? obj.Copyright.map(String)
          : [String(obj.Copyright)];
      }
      if ("Usage" in obj) {
        out.usage = Array.isArray(obj.Usage) ? obj.Usage.map(String) : [String(obj.Usage)];
      }
      if ("components" in obj) {
        out.components = Array.isArray(obj.components) ? obj.components.map(String) : [];
      }
      if ("bundles" in obj) {
        if (Array.isArray(obj.bundles)) {
          out.bundles = obj.bundles.map((b) => {
            if (b && typeof b === "object") {
              const bObj = b as Record<string, unknown>;
              return {
                path: String(bObj.path ?? ""),
                "exec-filter": bObj["exec-filter"] ? String(bObj["exec-filter"]) : undefined,
              };
            }
            return String(b);
          });
        } else {
          out.bundles = [];
        }
      }
    }
  }
  return out;
}
