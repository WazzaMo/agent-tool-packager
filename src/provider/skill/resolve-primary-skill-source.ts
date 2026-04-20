/**
 * Decide how staged skill files produce the final SKILL.md body and YAML metadata.
 */

import fs from "node:fs";
import path from "node:path";

import { assembleSkillMdFromPartials } from "./assemble-skill-md.js";
import { SkillFrontmatterError } from "./normalize-skill-frontmatter.js";
import { relativeToSkillBundle, toPosixPath } from "./skill-bundle-root.js";

import type { PackageAsset } from "../../install/types.js";

/**
 * @param basename - File name segment only.
 * @returns True when this is the partial body file paired with skill.yaml (lowercase per spec).
 */
export function isPartialSkillMdBasename(basename: string): boolean {
  return basename === "skill.md";
}

/**
 * SKILL.md (assembled) — any case except the exact partial `skill.md`.
 *
 * @param basename - File name segment only.
 */
export function isAssembledSkillMdBasename(basename: string): boolean {
  return basename.toLowerCase() === "skill.md" && basename !== "skill.md";
}

/**
 * skill.yaml or skill.yml (case-insensitive basename).
 *
 * @param basename - File name segment only.
 */
export function isSkillYamlBasename(basename: string): boolean {
  const l = basename.toLowerCase();
  return l === "skill.yaml" || l === "skill.yml";
}

export interface ResolvedSkillSource {
  /** UTF-8 SKILL.md-equivalent content (may still need bundle + script placeholders). */
  skillMdUtf8: string;
  /** Manifest row used for description fallback (primary file). */
  primaryAsset: PackageAsset;
  /** Staged relative paths that are consumed into SKILL.md (not copied as extras). */
  consumedRelPaths: Set<string>;
}

function readStagingFs(stagingDir: string, rel: string): string {
  const abs = path.join(stagingDir, rel);
  return fs.readFileSync(abs, "utf8");
}

/**
 * Resolve SKILL.md text from staged skill assets sharing one bundle root.
 *
 * @param readUtf8 - Read a staged member by posix path relative to package root; must throw if missing.
 * @param bundleRoot - Directory containing the skill tree (posix '' allowed).
 * @param skillAssets - Manifest rows for `skill` type in this part.
 * @throws SkillFrontmatterError for invalid combinations.
 */
export function resolvePrimarySkillSourceWithReader(
  readUtf8: (relativePosixPath: string) => string,
  bundleRoot: string,
  skillAssets: PackageAsset[]
): ResolvedSkillSource {
  const paths = skillAssets.map((a) => toPosixPath(a.path));
  const byRel = new Map(skillAssets.map((a) => [toPosixPath(a.path), a]));

  const relsInBundle = paths.map((p) => ({
    full: p,
    rel: relativeToSkillBundle(bundleRoot, p),
    base: path.posix.basename(p),
  }));

  const assembled = relsInBundle.filter((x) => isAssembledSkillMdBasename(x.base));
  const partialMd = relsInBundle.find((x) => isPartialSkillMdBasename(x.base));
  const yamlFiles = relsInBundle.filter((x) => isSkillYamlBasename(x.base));

  const consumed = new Set<string>();

  if (assembled.length > 0) {
    if (assembled.length > 1) {
      throw new SkillFrontmatterError("Skill bundle: at most one SKILL.md may be present");
    }
    if (yamlFiles.length > 0 || partialMd) {
      throw new SkillFrontmatterError(
        "Skill bundle: cannot mix SKILL.md with skill.yaml/skill.yml and skill.md partials"
      );
    }
    const pick = assembled[0];
    consumed.add(pick.full);
    const raw = readUtf8(pick.full);
    const asset = byRel.get(pick.full);
    if (!asset) {
      throw new Error(`Skill bundle: internal error resolving asset for ${pick.full}`);
    }
    return {
      skillMdUtf8: raw,
      primaryAsset: asset,
      consumedRelPaths: consumed,
    };
  }

  if (yamlFiles.length > 0 || partialMd) {
    if (yamlFiles.length !== 1) {
      throw new SkillFrontmatterError("Skill bundle: exactly one skill.yaml or skill.yml is required with partials");
    }
    if (!partialMd) {
      throw new SkillFrontmatterError("Skill bundle: skill.yaml requires companion skill.md");
    }
    const y = yamlFiles[0];
    consumed.add(y.full);
    consumed.add(partialMd.full);
    const yamlText = readUtf8(y.full);
    const body = readUtf8(partialMd.full);
    const skillMdUtf8 = assembleSkillMdFromPartials(yamlText, body);
    const pa = byRel.get(partialMd.full);
    if (!pa) {
      throw new Error("Skill bundle: internal error resolving partial skill.md asset");
    }
    return {
      skillMdUtf8,
      primaryAsset: pa,
      consumedRelPaths: consumed,
    };
  }

  const mdCandidates = relsInBundle.filter((x) => x.base.toLowerCase().endsWith(".md"));
  if (mdCandidates.length === 1) {
    const pick = mdCandidates[0];
    consumed.add(pick.full);
    const raw = readUtf8(pick.full);
    const asset = byRel.get(pick.full);
    if (!asset) {
      throw new Error(`Skill bundle: internal error resolving asset for ${pick.full}`);
    }
    return {
      skillMdUtf8: raw,
      primaryAsset: asset,
      consumedRelPaths: consumed,
    };
  }

  if (mdCandidates.length === 0) {
    throw new SkillFrontmatterError(
      "Skill bundle: need SKILL.md, or skill.yaml + skill.md, or a single markdown skill file"
    );
  }

  throw new SkillFrontmatterError(
    "Skill bundle: multiple markdown files; use SKILL.md or skill.yaml + skill.md to disambiguate"
  );
}

/**
 * Resolve SKILL.md text from staged skill assets sharing one bundle root.
 *
 * @param stagingDir - Package extract root.
 * @param bundleRoot - Directory containing the skill tree (posix '' allowed).
 * @param skillAssets - Manifest rows for `skill` type in this part.
 * @throws SkillFrontmatterError for invalid combinations.
 */
export function resolvePrimarySkillSource(
  stagingDir: string,
  bundleRoot: string,
  skillAssets: PackageAsset[]
): ResolvedSkillSource {
  return resolvePrimarySkillSourceWithReader(
    (rel) => readStagingFs(stagingDir, rel),
    bundleRoot,
    skillAssets
  );
}
