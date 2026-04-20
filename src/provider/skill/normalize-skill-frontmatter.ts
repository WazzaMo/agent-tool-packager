/**
 * Parse, validate, and normalise Agent Skills YAML frontmatter (object form).
 */

import yaml from "js-yaml";

import {
  SKILL_COMPATIBILITY_MAX_LEN,
  SKILL_DESCRIPTION_MAX_LEN,
  SKILL_ALLOWED_TOOLS_KEY,
  SKILL_NAME_MAX_LEN,
} from "./constants.js";

/** Normalised frontmatter ready to serialise (no `allowed-tools`). */
export type NormalisedSkillFrontmatter = Record<string, unknown>;

/**
 * @param message - Human-readable error.
 */
export class SkillFrontmatterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SkillFrontmatterError";
  }
}

function assertStringField(
  rec: Record<string, unknown>,
  key: string,
  maxLen: number,
  label: string
): void {
  const v = rec[key];
  if (v === undefined || v === null) {
    throw new SkillFrontmatterError(`Skill frontmatter: missing required field "${key}"`);
  }
  if (typeof v !== "string") {
    throw new SkillFrontmatterError(`Skill frontmatter: "${key}" must be a string`);
  }
  if (v.length > maxLen) {
    throw new SkillFrontmatterError(
      `Skill frontmatter: ${label} exceeds max length ${maxLen} (got ${v.length})`
    );
  }
}

function validateMetadata(meta: unknown): void {
  if (meta === undefined || meta === null) {
    return;
  }
  if (typeof meta !== "object" || Array.isArray(meta)) {
    throw new SkillFrontmatterError('Skill frontmatter: "metadata" must be a YAML mapping');
  }
  const o = meta as Record<string, unknown>;
  for (const [k, v] of Object.entries(o)) {
    if (typeof k !== "string") {
      throw new SkillFrontmatterError("Skill frontmatter: metadata keys must be strings");
    }
    if (typeof v !== "string") {
      throw new SkillFrontmatterError(
        `Skill frontmatter: metadata value for "${k}" must be a string`
      );
    }
  }
}

/**
 * Load YAML text into a plain object, validate Agent Skills constraints, and drop `allowed-tools`.
 *
 * @param yamlText - YAML document (skill.yaml or frontmatter block).
 * @returns Clone safe to dump back to YAML.
 * @throws SkillFrontmatterError when invalid.
 */
export function normaliseSkillYamlDocument(yamlText: string): NormalisedSkillFrontmatter {
  let doc: unknown;
  try {
    doc = yaml.load(yamlText) as unknown;
  } catch (e) {
    const err = e as Error;
    throw new SkillFrontmatterError(`Skill YAML parse error: ${err.message}`);
  }
  if (doc === null || doc === undefined || typeof doc !== "object" || Array.isArray(doc)) {
    throw new SkillFrontmatterError("Skill YAML must be a mapping at the root");
  }
  const rec = { ...(doc as Record<string, unknown>) };
  delete rec[SKILL_ALLOWED_TOOLS_KEY];

  assertStringField(rec, "name", SKILL_NAME_MAX_LEN, "name");
  assertStringField(rec, "description", SKILL_DESCRIPTION_MAX_LEN, "description");

  if (rec.compatibility !== undefined && rec.compatibility !== null) {
    if (typeof rec.compatibility !== "string") {
      throw new SkillFrontmatterError('Skill frontmatter: "compatibility" must be a string');
    }
    if (rec.compatibility.length > SKILL_COMPATIBILITY_MAX_LEN) {
      throw new SkillFrontmatterError(
        `Skill frontmatter: compatibility exceeds max length ${SKILL_COMPATIBILITY_MAX_LEN}`
      );
    }
  }

  validateMetadata(rec.metadata);

  return rec;
}

/**
 * Serialise normalised frontmatter for SKILL.md (between `---` markers).
 *
 * @param front - From {@link normaliseSkillYamlDocument}.
 * @returns YAML text without leading document marker.
 */
export function serialiseSkillFrontmatterYaml(front: NormalisedSkillFrontmatter): string {
  return yaml.dump(front, {
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
  }).trimEnd();
}

/**
 * Extract `name` from an already-normalised frontmatter object.
 *
 * @param front - Normalised mapping.
 * @returns Trimmed skill name for install directory.
 */
export function skillNameFromNormalisedFrontmatter(front: NormalisedSkillFrontmatter): string {
  const n = front.name;
  if (typeof n !== "string" || !n.trim()) {
    throw new SkillFrontmatterError('Skill frontmatter: "name" must be a non-empty string');
  }
  return n.trim();
}
