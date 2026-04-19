/**
 * Build provider actions to install Agent Skills layout under `{agent}/skills/{name}/`.
 */

import fs from "node:fs";
import path from "node:path";

import { OperationIds } from "../../file-ops/operation-ids.js";
import type { PartKind } from "../../file-ops/part-install-input.js";
import { patchMarkdownBundlePlaceholders } from "../../install/copy-assets.js";
import type { PackageAsset } from "../../install/types.js";
import type { AtpProvenance, ProviderAction } from "../provider-dtos.js";
import { materializeRuleLike } from "../rule-like-materialize.js";

import { finalizeSkillMdContent } from "./finalize-skill-md.js";
import { patchSkillScriptsPlaceholder } from "./patch-skill-placeholders.js";
import {
  resolvePrimarySkillSource,
  type ResolvedSkillSource,
} from "./resolve-primary-skill-source.js";
import { resolveSkillBundleRoot, relativeToSkillBundle, toPosixPath } from "./skill-bundle-root.js";

function pushSkillBundleRawFileCopies(
  actions: ProviderAction[],
  ctx: { stagingDir: string },
  params: {
    skillAssets: PackageAsset[];
    primary: ResolvedSkillSource;
    bundleRoot: string;
    relativeSkillDir: string;
    destinationRootField: "project" | undefined;
    packageName: string | undefined;
    packageVersion: string | undefined;
    part: { partIndex: number; partKind: PartKind };
  }
): Set<string> {
  const occupiedDestinations = new Set<string>();
  const { skillAssets, primary, bundleRoot, relativeSkillDir, destinationRootField, packageName, packageVersion, part } =
    params;

  for (const asset of skillAssets) {
    const full = toPosixPath(asset.path);
    if (primary.consumedRelPaths.has(full)) {
      continue;
    }
    const relUnderBundle = relativeToSkillBundle(bundleRoot, full);
    const destRel = path.posix.join(relativeSkillDir, relUnderBundle);
    if (occupiedDestinations.has(destRel)) {
      throw new Error(
        `Skill install: duplicate install destination "${destRel}" (package "${packageName ?? "unknown"}", part ${part.partIndex}).`
      );
    }
    occupiedDestinations.add(destRel);
    const src = path.join(ctx.stagingDir, full);
    if (!fs.existsSync(src)) {
      throw new Error(`Skill install: missing staged file: ${full}`);
    }
    const st = fs.statSync(src);
    const provenance: AtpProvenance = {
      packageName,
      packageVersion,
      partIndex: part.partIndex,
      partKind: part.partKind,
      fragmentKey: destRel,
    };
    actions.push({
      kind: "raw_file_copy",
      operationId: OperationIds.TreeMaterialise,
      provenance,
      relativeTargetPath: destRel,
      destinationRoot: destinationRootField,
      sourceAbsolutePath: src,
      recursiveDirectorySource: st.isDirectory(),
    });
  }
  return occupiedDestinations;
}

function assertUniqueProgramScriptBasenames(
  programs: PackageAsset[],
  partIndex: number,
  packageName: string | undefined
): void {
  const basenameToStaged = new Map<string, string>();
  for (const prog of programs) {
    const base = path.posix.basename(toPosixPath(prog.path));
    if (basenameToStaged.has(base)) {
      const first = basenameToStaged.get(base)!;
      throw new Error(
        `Skill install: multiple bundle programs map to scripts/${base} in part ${partIndex} ` +
          `(staged paths "${first}" and "${prog.path}"; package "${packageName ?? "unknown"}"). ` +
          `Rename one file or split bundles.`
      );
    }
    basenameToStaged.set(base, prog.path);
  }
}

function pushSkillAdjacentProgramRawCopies(
  actions: ProviderAction[],
  ctx: { stagingDir: string },
  params: {
    programs: PackageAsset[];
    relativeSkillDir: string;
    destinationRootField: "project" | undefined;
    packageName: string | undefined;
    packageVersion: string | undefined;
    part: { partIndex: number; partKind: PartKind };
    occupiedDestinations: Set<string>;
  }
): void {
  const { programs, relativeSkillDir, destinationRootField, packageName, packageVersion, part, occupiedDestinations } =
    params;

  assertUniqueProgramScriptBasenames(programs, part.partIndex, packageName);

  for (const prog of programs) {
    const full = toPosixPath(prog.path);
    const base = path.posix.basename(full);
    const destRel = path.posix.join(relativeSkillDir, "scripts", base);
    if (occupiedDestinations.has(destRel)) {
      throw new Error(
        `Skill install: destination "${destRel}" conflicts with another skill file or program ` +
          `(package "${packageName ?? "unknown"}", part ${part.partIndex}).`
      );
    }
    occupiedDestinations.add(destRel);
    const src = path.join(ctx.stagingDir, full);
    if (!fs.existsSync(src)) {
      throw new Error(`Skill install: missing staged program file: ${full}`);
    }
    const st = fs.statSync(src);
    const provenance: AtpProvenance = {
      packageName,
      packageVersion,
      partIndex: part.partIndex,
      partKind: part.partKind,
      fragmentKey: destRel,
    };
    actions.push({
      kind: "raw_file_copy",
      operationId: OperationIds.TreeMaterialise,
      provenance,
      relativeTargetPath: destRel,
      destinationRoot: destinationRootField,
      sourceAbsolutePath: src,
      recursiveDirectorySource: st.isDirectory(),
      applyProgramExecutableMode: st.isFile(),
    });
  }
}

/** Optional layout for skills (default: under {@link InstallContext.layerRoot}`/skills/`). */
export interface SkillInstallPathOptions {
  /** Default `layer` (e.g. `.cursor/skills/`). Use `project` for Codex `.agents/skills/`. */
  destinationRoot?: "layer" | "project";
  /** Parent directory under the destination root, POSIX (default `skills`). */
  skillsParentRelative?: string;
}

/**
 * Build ordered install actions for all `skill`-type assets in one staged part (single bundle).
 *
 * @param ctx - Staging dir, layer root, and project root when using `destinationRoot: project`.
 * @param part - Part identity for provenance.
 * @param skillAssets - Subset of manifest assets with `type: skill` for this part.
 * @param manifest - Package identity.
 * @param bundlePathMap - Optional `{name}` placeholders for markdown.
 * @param pathOptions - Optional skill directory root (Codex uses project `.agents/skills/`).
 * @param skillAdjacentPrograms - Bundle `program` rows for this part (under the skill tree); installed as `scripts/<basename>`.
 * @returns Actions to append to a {@link ProviderPlan}.
 */
export function buildSkillInstallProviderActions(
  ctx: { stagingDir: string; layerRoot: string; projectRoot?: string },
  part: { partIndex: number; partKind: PartKind },
  skillAssets: PackageAsset[],
  manifest: { name?: string; version?: string },
  bundlePathMap?: Record<string, string>,
  pathOptions?: SkillInstallPathOptions,
  skillAdjacentPrograms?: PackageAsset[]
): ProviderAction[] {
  if (skillAssets.length === 0) {
    return [];
  }

  const paths = skillAssets.map((a) => toPosixPath(a.path));
  const bundleRoot = resolveSkillBundleRoot(paths);
  for (const p of paths) {
    relativeToSkillBundle(bundleRoot, p);
  }

  const primary = resolvePrimarySkillSource(ctx.stagingDir, bundleRoot, skillAssets);
  let text = patchMarkdownBundlePlaceholders(primary.skillMdUtf8, bundlePathMap);
  const fallbackName =
    primary.primaryAsset.name?.trim() ||
    path.posix.basename(toPosixPath(primary.primaryAsset.path), path.posix.extname(primary.primaryAsset.path));
  const finalised = finalizeSkillMdContent(text, fallbackName);
  text = patchSkillScriptsPlaceholder(finalised.content, "scripts");

  const { content, operationId } = materializeRuleLike("SKILL.md", text);

  const destRoot = pathOptions?.destinationRoot ?? "layer";
  const parentRel = (pathOptions?.skillsParentRelative ?? "skills").replace(/^\/+|\/+$/g, "");
  if (destRoot === "project" && !ctx.projectRoot) {
    throw new Error("Skill install: projectRoot is required when destinationRoot is project");
  }

  const skillDirName = finalised.skillDirName;
  const relativeSkillDir = path.posix.join(parentRel, skillDirName);
  const skillMdRelative = path.posix.join(relativeSkillDir, "SKILL.md");
  const destinationRootField = destRoot === "project" ? ("project" as const) : undefined;

  const packageName = manifest.name;
  const packageVersion = manifest.version;

  const provenanceSkill: AtpProvenance = {
    packageName,
    packageVersion,
    partIndex: part.partIndex,
    partKind: part.partKind,
    fragmentKey: skillMdRelative,
  };

  const actions: ProviderAction[] = [
    {
      kind: "plain_markdown_write",
      operationId,
      provenance: provenanceSkill,
      relativeTargetPath: skillMdRelative,
      destinationRoot: destinationRootField,
      writeMode: "create_or_replace",
      content,
      encoding: "utf-8",
    },
  ];

  const occupiedDestinations = pushSkillBundleRawFileCopies(actions, ctx, {
    skillAssets,
    primary,
    bundleRoot,
    relativeSkillDir,
    destinationRootField,
    packageName,
    packageVersion,
    part,
  });

  const adjacent = skillAdjacentPrograms ?? [];
  if (adjacent.length > 0) {
    pushSkillAdjacentProgramRawCopies(actions, ctx, {
      programs: adjacent,
      relativeSkillDir,
      destinationRootField,
      packageName,
      packageVersion,
      part,
      occupiedDestinations,
    });
  }

  return actions;
}
