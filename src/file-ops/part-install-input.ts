/**
 * Staged and resolved install handles for one package part (Feature 5).
 * Feeds {@link AgentProvider.planInstall} once providers are wired.
 */

import path from "node:path";

import { partStagePrefix } from "../package/manifest-layout.js";

import type { PackageManifest } from "../install/types.js";
import type { BundleDefinition, PackagePart, PackageType } from "../package/types.js";

/** Canonical part kinds (same set as package / Feature 2). */
export type PartKind = PackageType;

/**
 * Progressive path resolution: staged relative paths, then absolute after provider resolution.
 */
export interface PartInstallInput {
  /** When false, {@link PartInstallInput.packagePaths} are relative to staging/package root. */
  readonly isResolvedAbsolutePaths: boolean;
  readonly partKind: PartKind;
  /** 1-based index; aligns with `part_N_Type` and CLI `atp package part`. */
  readonly partIndex: number;
  /** Relative (staged) or absolute (resolved) paths for this part's payloads. */
  readonly packagePaths: string[];
}

function coalesceYamlStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (value != null) return [String(value)];
  return [];
}

function parseBundles(arr: unknown): (string | BundleDefinition)[] | undefined {
  if (!Array.isArray(arr)) return undefined;
  return arr.map((b) => {
    if (b && typeof b === "object") {
      const bObj = b as Record<string, unknown>;
      const skipExec =
        bObj["skip-exec"] === true ||
        String(bObj["skip-exec"] ?? "").toLowerCase() === "true";
      return {
        path: String(bObj.path ?? ""),
        "exec-filter": bObj["exec-filter"] ? String(bObj["exec-filter"]) : undefined,
        "skip-exec": skipExec ? true : undefined,
      };
    }
    return String(b);
  });
}

/**
 * Coerce raw YAML `parts` into structured rows (install-time boundary).
 *
 * @param raw - `manifest.parts` from parsed YAML.
 * @returns Normalised parts; empty when absent or invalid.
 */
export function coercePackageParts(raw: unknown): PackagePart[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) return [];
  const out: PackagePart[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const p = item as Record<string, unknown>;
    const usage = coalesceYamlStringList(p.usage);
    out.push({
      type: String(p.type ?? ""),
      usage,
      components: coalesceYamlStringList(p.components),
      bundles: parseBundles(p.bundles),
    });
  }
  return out;
}

const PART_KINDS: PartKind[] = [
  "Rule",
  "Prompt",
  "Skill",
  "Hook",
  "Mcp",
  "Command",
  "Experimental",
];

/**
 * Map manifest type string to {@link PartKind} (case-insensitive).
 *
 * @param typeStr - Root or part `type` from YAML.
 * @returns Canonical kind.
 * @throws When the string does not match a known kind (after normalisation).
 */
export function normalisePartKind(typeStr: string): PartKind {
  const needle = typeStr.trim();
  const found = PART_KINDS.find((k) => k.toLowerCase() === needle.toLowerCase());
  if (found) return found;
  throw new Error(`Unknown part type: ${typeStr}`);
}

function legacySyntheticPartKind(manifest: PackageManifest): PartKind {
  const raw = String(manifest.type ?? "").trim();
  const lower = raw.toLowerCase();
  if (lower === "" || lower === "multi") {
    return "Skill";
  }
  return normalisePartKind(raw);
}

/**
 * One part ready to plan: paths are relative to {@link StagedPartInstallInput.getStagingDir}.
 */
export class StagedPartInstallInput implements PartInstallInput {
  public readonly isResolvedAbsolutePaths = false;
  public readonly partKind: PartKind;
  public readonly partIndex: number;
  public readonly packagePaths: string[];
  readonly #stagingRelPaths: string[];
  readonly #stagingDir: string;

  /**
   * @param opts - Part identity and paths under the staging directory.
   */
  constructor(opts: {
    partIndex: number;
    partKind: PartKind;
    stagingRelPaths: string[];
    stagingDir: string;
  }) {
    this.partIndex = opts.partIndex;
    this.partKind = opts.partKind;
    this.#stagingRelPaths = [...opts.stagingRelPaths];
    this.packagePaths = [...opts.stagingRelPaths];
    this.#stagingDir = opts.stagingDir;
  }

  /** Paths relative to the package extract / staging root. */
  getStagingRelPaths(): string[] {
    return [...this.#stagingRelPaths];
  }

  /** Absolute staging directory for this install transaction. */
  getStagingDir(): string {
    return this.#stagingDir;
  }
}

/**
 * Final paths after {@link AgentProvider} resolution (absolute on disk).
 */
export class ResolvedInstallInput implements PartInstallInput {
  public readonly isResolvedAbsolutePaths = true;
  public readonly partKind: PartKind;
  public readonly partIndex: number;
  public readonly packagePaths: string[];
  readonly #agentResolvedPaths: string[];

  private constructor(opts: { partIndex: number; partKind: PartKind; absolutePaths: string[] }) {
    this.partIndex = opts.partIndex;
    this.partKind = opts.partKind;
    this.#agentResolvedPaths = [...opts.absolutePaths];
    this.packagePaths = [...opts.absolutePaths];
  }

  /** Same as {@link PartInstallInput.packagePaths} for resolved inputs. */
  getAgentResolvedPaths(): string[] {
    return [...this.#agentResolvedPaths];
  }

  /**
   * @param staged - Staged part.
   * @param absolutePaths - One absolute path per staged relative path (same order).
   */
  static fromAbsolutePaths(
    staged: StagedPartInstallInput,
    absolutePaths: string[]
  ): ResolvedInstallInput {
    if (absolutePaths.length !== staged.getStagingRelPaths().length) {
      throw new Error(
        `Resolved path count (${absolutePaths.length}) does not match staged paths (${staged.getStagingRelPaths().length})`
      );
    }
    return new ResolvedInstallInput({
      partIndex: staged.partIndex,
      partKind: staged.partKind,
      absolutePaths,
    });
  }
}

/**
 * Build one {@link StagedPartInstallInput} per manifest part (multi) or a single synthetic part (legacy).
 *
 * @param manifest - Loaded catalog / package manifest with `assets` and optional `parts`.
 * @param stagingDir - Extract directory (package root); paths are relative to this root.
 * @returns Ordered list aligned with `parts[]` for multi layout.
 */
export function buildStagedPartInstallInputs(
  manifest: PackageManifest,
  stagingDir: string
): StagedPartInstallInput[] {
  const assets = manifest.assets ?? [];
  const assetPaths = assets.map((a) => a.path);
  const parts = coercePackageParts(manifest.parts);

  if (parts.length > 0) {
    const out: StagedPartInstallInput[] = [];
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const partIndex = i + 1;
      const prefix = partStagePrefix(partIndex, part.type);
      const prefixSlash = `${prefix}/`;
      const stagingRelPaths = assetPaths.filter(
        (p) => p === prefix || p.startsWith(prefixSlash)
      );
      const partKind = normalisePartKind(part.type);
      out.push(
        new StagedPartInstallInput({
          partIndex,
          partKind,
          stagingRelPaths,
          stagingDir,
        })
      );
    }
    return out;
  }

  const partKind = legacySyntheticPartKind(manifest);
  return [
    new StagedPartInstallInput({
      partIndex: 1,
      partKind,
      stagingRelPaths: [...assetPaths],
      stagingDir,
    }),
  ];
}

/**
 * Join staging root with each staged relative path (default resolution before agent-specific layout).
 *
 * @param staged - Staged part.
 * @returns Resolved input with absolute paths under {@link StagedPartInstallInput.getStagingDir}.
 */
export function resolveStagedPartToAbsolute(staged: StagedPartInstallInput): ResolvedInstallInput {
  const root = staged.getStagingDir();
  const abs = staged.getStagingRelPaths().map((rel) => path.join(root, rel));
  return ResolvedInstallInput.fromAbsolutePaths(staged, abs);
}
