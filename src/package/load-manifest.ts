/**
 * Load and parse atp-package.yaml in package developer format.
 */

import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import type { BundleDefinition, DevPackageManifest } from "./types.js";

const PACKAGE_FILE = "atp-package.yaml";

/**
 * Load and parse atp-package.yaml in developer format.
 * Supports flat YAML and legacy Package list format.
 *
 * @param cwd - Package root directory
 * @returns Parsed manifest or null if file missing; {} for empty/invalid content
 */
export function loadDevManifest(cwd: string): DevPackageManifest | null {
  const pkgPath = path.join(cwd, PACKAGE_FILE);
  if (!fs.existsSync(pkgPath)) return null;

  const content = fs.readFileSync(pkgPath, "utf8");
  const data = yaml.load(content) as unknown;

  if (!data || typeof data !== "object") return {};

  // Support both "Package:" list format and flat format
  if ("Package" in data && Array.isArray((data as { Package: unknown }).Package)) {
    return parsePackageList((data as { Package: unknown[] }).Package);
  }

  return normalizeDevManifest(data as Record<string, unknown>);
}

function normalizeDevManifest(data: Record<string, unknown>): DevPackageManifest {
  return {
    name: String(data.name ?? ""),
    type: String(data.type ?? ""),
    version: String(data.version ?? ""),
    usage: Array.isArray(data.usage)
      ? data.usage.map(String)
      : data.usage != null
      ? [String(data.usage)]
      : [],
    components: Array.isArray(data.components)
      ? data.components.map(String)
      : data.components != null
      ? [String(data.components)]
      : [],
    developer: data.developer != null ? String(data.developer) : undefined,
    license: data.license != null ? String(data.license) : undefined,
    copyright: Array.isArray(data.copyright) ? data.copyright.map(String) : undefined,
    bundles: Array.isArray(data.bundles) ? data.bundles.map((b) => {
      if (b && typeof b === "object") {
        const bObj = b as Record<string, unknown>;
        return {
          path: String(bObj.path ?? ""),
          "exec-filter": bObj["exec-filter"] ? String(bObj["exec-filter"]) : undefined,
        };
      }
      return String(b);
    }) : undefined,
  };
}


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
      if ("Copyright" in obj) out.copyright = Array.isArray(obj.Copyright) ? obj.Copyright.map(String) : [String(obj.Copyright)];
      if ("Usage" in obj) out.usage = Array.isArray(obj.Usage) ? obj.Usage.map(String) : [String(obj.Usage)];
      if ("components" in obj) out.components = Array.isArray(obj.components) ? obj.components.map(String) : [];
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
