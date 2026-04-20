/**
 * Rule/skill YAML validation: authoring (`stage.tar`) and pre-install (`pkgDir` on disk).
 * Rules/skills may use embedded `---` front matter or paired `x.md` + `x.yaml`|`x.yml`.
 */

import fs from "node:fs";
import path from "node:path";

import yaml from "js-yaml";

import { buildStagedPartInstallInputs, normalisePartKind } from "../file-ops/part-install-input.js";
import type { PackageAsset, PackageManifest } from "../install/types.js";
import { trySplitCursorMdcSource } from "../provider/rule-like-materialize.js";
import { SkillFrontmatterError } from "../provider/skill/normalize-skill-frontmatter.js";
import { resolvePrimarySkillSourceWithReader } from "../provider/skill/resolve-primary-skill-source.js";
import { resolveSkillBundleRoot } from "../provider/skill/skill-bundle-root.js";

import { isMultiDevManifest, normalisedRootType, partStagePrefix } from "./manifest-layout.js";
import { readStageTarMemberUtf8, STAGE_TAR_FILENAME } from "./stage-tar-read.js";
import type { DevPackageManifest } from "./types.js";

/** Read a package member by posix path; `null` when missing or not a file. */
export type PackageFileReader = (posixRelPath: string) => string | null;

/**
 * Reader for files under an extracted package directory (catalog install / disk layout).
 */
export function createFilesystemPackageReader(rootDir: string): PackageFileReader {
  return (rel) => {
    const abs = path.join(rootDir, ...rel.split("/"));
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
      return null;
    }
    return fs.readFileSync(abs, "utf8");
  };
}

function createTarPackageReader(tarPath: string): PackageFileReader {
  return (rel) => readStageTarMemberUtf8(tarPath, rel);
}

function sidecarYamlRels(ruleMdOrMdcRel: string): { yamlRel: string; ymlRel: string } {
  const dir = path.posix.dirname(ruleMdOrMdcRel);
  const base = path.posix.basename(ruleMdOrMdcRel).replace(/\.(md|mdc)$/i, "");
  const yamlRel = dir === "." ? `${base}.yaml` : `${dir}/${base}.yaml`;
  const ymlRel = dir === "." ? `${base}.yml` : `${dir}/${base}.yml`;
  return { yamlRel, ymlRel };
}

function partKindMatches(partType: string, want: "Rule" | "Skill"): boolean {
  try {
    return normalisePartKind(partType) === want;
  } catch {
    return false;
  }
}

function readRequiredForSkill(reader: PackageFileReader, rel: string): string {
  const t = reader(rel);
  if (t === null) {
    throw new SkillFrontmatterError(`missing staged file ${rel}`);
  }
  return t;
}

/**
 * Validate one rule-like markdown path: optional paired `basename.yaml`|`basename.yml`, no mix with embedded `---` front matter.
 *
 * @param contextLabel - e.g. `part 1 (Rule)` or `legacy (Rule)`.
 * @returns Human-readable issue strings (empty when OK).
 */
export function validateRuleMarkdownPairing(
  contextLabel: string,
  reader: PackageFileReader,
  posixRelPath: string
): string[] {
  const issues: string[] = [];
  const low = posixRelPath.toLowerCase();
  if (!low.endsWith(".md") && !low.endsWith(".mdc")) {
    return issues;
  }

  const doc = reader(posixRelPath);
  if (doc === null) {
    issues.push(`${contextLabel}: missing staged file ${posixRelPath}`);
    return issues;
  }

  const { yamlRel, ymlRel } = sidecarYamlRels(posixRelPath);
  const hasYaml = reader(yamlRel) !== null;
  const hasYml = reader(ymlRel) !== null;

  if (hasYaml && hasYml) {
    issues.push(
      `${contextLabel}: ${posixRelPath} cannot pair with both ${yamlRel} and ${ymlRel}; use one extension`
    );
    return issues;
  }

  const sidecarRel = hasYaml ? yamlRel : hasYml ? ymlRel : null;
  const split = trySplitCursorMdcSource(doc);
  const embedded = split !== undefined;

  if (sidecarRel !== null && embedded) {
    issues.push(
      `${contextLabel}: ${posixRelPath} has embedded YAML (--- … ---) but sidecar ${sidecarRel} is also present; use one style only`
    );
    return issues;
  }

  if (sidecarRel !== null) {
    const raw = reader(sidecarRel);
    if (raw === null || raw.trim() === "") {
      issues.push(`${contextLabel}: ${sidecarRel} is missing or empty (paired with ${posixRelPath})`);
      return issues;
    }
    try {
      yaml.load(raw);
    } catch (e) {
      issues.push(`${contextLabel}: invalid YAML in ${sidecarRel}: ${(e as Error).message}`);
      return issues;
    }
    const bodyText = doc;
    if (bodyText.trim() === "") {
      issues.push(
        `${contextLabel}: ${posixRelPath} body is empty while ${sidecarRel} supplies front matter`
      );
    }
  }

  return issues;
}

function appendMultiPartRuleSkillIssues(
  manifest: DevPackageManifest,
  reader: PackageFileReader,
  missing: string[]
): void {
  const parts = manifest.parts ?? [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const partIndex1 = i + 1;
    const prefix = partStagePrefix(partIndex1, p.type);
    const comps = p.components ?? [];

    if (partKindMatches(p.type, "Rule")) {
      const label = `part ${partIndex1} (Rule)`;
      for (const c of comps) {
        const rel = `${prefix}/${c}`;
        const low = c.toLowerCase();
        if (!low.endsWith(".md") && !low.endsWith(".mdc")) {
          continue;
        }
        for (const msg of validateRuleMarkdownPairing(label, reader, rel)) {
          missing.push(msg);
        }
      }
    }

    if (partKindMatches(p.type, "Skill")) {
      const label = `part ${partIndex1} (Skill)`;
      const assets: PackageAsset[] = comps.map((c) => {
        const rel = `${prefix}/${c}`;
        return {
          path: rel,
          type: "skill" as const,
          name: path.posix.basename(c, path.extname(c)),
        };
      });
      if (assets.length === 0) {
        continue;
      }
      try {
        const roots = assets.map((a) => a.path);
        resolvePrimarySkillSourceWithReader(
          (rel) => readRequiredForSkill(reader, rel),
          resolveSkillBundleRoot(roots),
          assets
        );
      } catch (e) {
        missing.push(`${label}: ${(e as Error).message}`);
      }
    }
  }
}

function appendLegacyRuleSkillIssues(
  manifest: DevPackageManifest,
  reader: PackageFileReader,
  missing: string[]
): void {
  const rt = normalisedRootType(manifest);
  const comps = manifest.components ?? [];

  if (rt === "rule") {
    const label = "legacy (Rule)";
    for (const c of comps) {
      const low = c.toLowerCase();
      if (!low.endsWith(".md") && !low.endsWith(".mdc")) {
        continue;
      }
      for (const msg of validateRuleMarkdownPairing(label, reader, c)) {
        missing.push(msg);
      }
    }
  }

  if (rt === "skill") {
    const label = "legacy (Skill)";
    const assets: PackageAsset[] = comps.map((c) => ({
      path: c,
      type: "skill" as const,
      name: path.posix.basename(c, path.extname(c)),
    }));
    if (assets.length === 0) {
      return;
    }
    try {
      const roots = assets.map((a) => a.path);
      resolvePrimarySkillSourceWithReader(
        (rel) => readRequiredForSkill(reader, rel),
        resolveSkillBundleRoot(roots),
        assets
      );
    } catch (e) {
      missing.push(`${label}: ${(e as Error).message}`);
    }
  }
}

/**
 * Append rule/skill frontmatter issues into `missing` by reading `stage.tar` in `cwd`.
 * No-op when `stage.tar` is missing or empty.
 */
export function appendDevPackageRuleSkillFrontmatterViolations(
  cwd: string,
  manifest: DevPackageManifest,
  missing: string[]
): void {
  const tarPath = path.join(cwd, STAGE_TAR_FILENAME);
  if (!fs.existsSync(tarPath) || fs.statSync(tarPath).size === 0) {
    return;
  }

  const reader = createTarPackageReader(tarPath);

  if (isMultiDevManifest(manifest)) {
    appendMultiPartRuleSkillIssues(manifest, reader, missing);
  } else {
    appendLegacyRuleSkillIssues(manifest, reader, missing);
  }
}

/**
 * Pre-install validation: same rule/skill checks as authoring, against files on disk under `pkgDir`.
 *
 * @returns Issue strings; empty when OK.
 */
export function collectCatalogInstallRuleSkillViolations(
  pkgDir: string,
  manifest: PackageManifest
): string[] {
  const issues: string[] = [];
  const reader = createFilesystemPackageReader(pkgDir);
  const assets = manifest.assets ?? [];
  const stagedParts = buildStagedPartInstallInputs(manifest, pkgDir);

  for (const sp of stagedParts) {
    const relSet = new Set(sp.getStagingRelPaths());
    const partAssets = assets.filter((a) => relSet.has(a.path));
    const label = `part ${sp.partIndex} (${sp.partKind})`;

    if (sp.partKind === "Rule") {
      for (const a of partAssets) {
        if (a.type !== "rule") {
          continue;
        }
        const low = a.path.toLowerCase();
        if (!low.endsWith(".md") && !low.endsWith(".mdc")) {
          continue;
        }
        issues.push(...validateRuleMarkdownPairing(label, reader, a.path));
      }
    }

    if (sp.partKind === "Skill") {
      const sk = partAssets.filter((a) => a.type === "skill");
      if (sk.length === 0) {
        continue;
      }
      try {
        const roots = sk.map((a) => a.path);
        resolvePrimarySkillSourceWithReader(
          (rel) => readRequiredForSkill(reader, rel),
          resolveSkillBundleRoot(roots),
          sk
        );
      } catch (e) {
        issues.push(`${label}: ${(e as Error).message}`);
      }
    }
  }

  return issues;
}
