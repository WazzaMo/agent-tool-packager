/**
 * Shared helpers for {@link AgentProvider} install planning (Cursor, Claude, Gemini, Codex).
 */

import fs from "node:fs";
import path from "node:path";

import type { InstallContext } from "../file-ops/install-context.js";
import type { StagedPartInstallInput } from "../file-ops/part-install-input.js";
import type { PackageAsset, PackageManifest } from "../install/types.js";

import {
  buildSkillInstallProviderActions,
  type SkillInstallPathOptions,
} from "./skill/plan-skill-install.js";
import { SkillFrontmatterError } from "./skill/normalize-skill-frontmatter.js";
import type { AtpProvenance, ProviderPlan } from "./provider-dtos.js";

/**
 * Path of `absoluteFilePath` relative to `layerRoot`, POSIX-style.
 */
export function relativePathFromLayerRoot(layerRoot: string, absoluteFilePath: string): string {
  return path.relative(layerRoot, absoluteFilePath).replace(/\\/g, "/");
}

/**
 * Ensure a staged path exists before reading; throws with a provider-prefixed message if missing.
 */
export function requireStagedSourceFile(
  providerLabel: string,
  assetPath: string,
  absoluteSourcePath: string
): void {
  if (!fs.existsSync(absoluteSourcePath)) {
    throw new Error(`${providerLabel}: missing staged file: ${assetPath}`);
  }
}

/**
 * Read and parse JSON from a staged file; throws with a provider-prefixed message on failure.
 *
 * @param providerLabel - e.g. `CursorAgentProvider` (used in error text).
 * @param pathLabel - Logical asset path for the message (e.g. manifest `asset.path`).
 * @param absolutePath - File on disk.
 */
export function readStagedJsonFile(
  providerLabel: string,
  pathLabel: string,
  absolutePath: string
): unknown {
  const raw = fs.readFileSync(absolutePath, "utf8");
  try {
    return JSON.parse(raw) as unknown;
  } catch (e) {
    const err = e as SyntaxError;
    throw new Error(`${providerLabel}: invalid JSON in ${pathLabel}: ${err.message}`);
  }
}

/**
 * Non-program assets in this part, split for skill pipeline vs generic asset loop.
 */
export function partitionPartNonProgramAssets(
  manifest: PackageManifest,
  part: StagedPartInstallInput
): { skillAssets: PackageAsset[]; nonSkillAssets: PackageAsset[] } {
  const assets = manifest.assets ?? [];
  const inPart = assets.filter(
    (a) => part.packagePaths.includes(a.path) && a.type !== "program"
  );
  return {
    skillAssets: inPart.filter((a) => a.type === "skill"),
    nonSkillAssets: inPart.filter((a) => a.type !== "skill"),
  };
}

/**
 * Build {@link AtpProvenance} for one fragment under the current part.
 */
export function provenanceForFragment(
  packageName: string | undefined,
  packageVersion: string | undefined,
  part: Pick<StagedPartInstallInput, "partIndex" | "partKind">,
  fragmentKey: string
): AtpProvenance {
  return {
    packageName,
    packageVersion,
    partIndex: part.partIndex,
    partKind: part.partKind,
    fragmentKey,
  };
}

/**
 * Append skill install actions; wraps {@link SkillFrontmatterError} with `providerLabel:` prefix.
 */
export function appendSkillInstallActions(
  actions: ProviderPlan["actions"],
  ctx: InstallContext,
  part: StagedPartInstallInput,
  skillAssets: PackageAsset[],
  packageName: string | undefined,
  packageVersion: string | undefined,
  bundlePathMap: Record<string, string> | undefined,
  providerLabel: string,
  skillPathOptions?: SkillInstallPathOptions
): void {
  try {
    actions.push(
      ...buildSkillInstallProviderActions(
        { stagingDir: ctx.stagingDir, layerRoot: ctx.layerRoot, projectRoot: ctx.projectRoot },
        { partIndex: part.partIndex, partKind: part.partKind },
        skillAssets,
        { name: packageName, version: packageVersion },
        bundlePathMap,
        skillPathOptions
      )
    );
  } catch (e) {
    if (e instanceof SkillFrontmatterError) {
      throw new Error(`${providerLabel}: ${e.message}`);
    }
    throw e;
  }
}

/**
 * Completed {@link ProviderPlan} for one install part.
 */
export function installPlanForPart(
  ctx: InstallContext,
  part: StagedPartInstallInput,
  packageName: string | undefined,
  packageVersion: string | undefined,
  actions: ProviderPlan["actions"]
): ProviderPlan {
  return {
    context: ctx,
    provenanceBase: {
      packageName,
      packageVersion,
      partIndex: part.partIndex,
      partKind: part.partKind,
    },
    actions,
  };
}
