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
import { resolvePrimarySkillSource } from "./resolve-primary-skill-source.js";
import { resolveSkillBundleRoot, relativeToSkillBundle, toPosixPath } from "./skill-bundle-root.js";

/**
 * Build ordered install actions for all `skill`-type assets in one staged part (single bundle).
 *
 * @param ctx - Staging dir and agent layer root.
 * @param part - Part identity for provenance.
 * @param skillAssets - Subset of manifest assets with `type: skill` for this part.
 * @param manifest - Package identity.
 * @param bundlePathMap - Optional `{name}` placeholders for markdown.
 * @returns Actions to append to a {@link ProviderPlan}.
 */
export function buildSkillInstallProviderActions(
  ctx: { stagingDir: string; layerRoot: string },
  part: { partIndex: number; partKind: PartKind },
  skillAssets: PackageAsset[],
  manifest: { name: string; version?: string },
  bundlePathMap?: Record<string, string>
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

  const skillDirName = finalised.skillDirName;
  const relativeSkillDir = path.posix.join("skills", skillDirName);
  const skillMdRelative = path.posix.join(relativeSkillDir, "SKILL.md");

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
      writeMode: "create_or_replace",
      content,
      encoding: "utf-8",
    },
  ];

  for (const asset of skillAssets) {
    const full = toPosixPath(asset.path);
    if (primary.consumedRelPaths.has(full)) {
      continue;
    }
    const relUnderBundle = relativeToSkillBundle(bundleRoot, full);
    const destRel = path.posix.join(relativeSkillDir, relUnderBundle);
    const src = path.join(ctx.stagingDir, full);
    if (!fs.existsSync(src)) {
      throw new Error(`Skill install: missing staged file: ${full}`);
    }
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
      sourceAbsolutePath: src,
    });
  }

  return actions;
}
