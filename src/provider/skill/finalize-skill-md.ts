/**
 * Validate, normalise, and optionally synthesise SKILL.md frontmatter.
 */

import { SKILL_NAME_MAX_LEN } from "./constants.js";
import {
  normaliseSkillYamlDocument,
  serialiseSkillFrontmatterYaml,
  skillNameFromNormalisedFrontmatter,
} from "./normalize-skill-frontmatter.js";
import { trySplitSkillFrontmatter } from "./split-skill-md.js";

/**
 * @param name - Candidate directory name from frontmatter.
 */
export function assertSafeSkillDirectoryName(name: string): string {
  const t = name.trim();
  if (!t) {
    throw new Error("Skill name resolved to empty string");
  }
  if (t.includes("..") || t.includes("/") || t.includes("\\")) {
    throw new Error(`Skill name must not contain path segments: ${name}`);
  }
  return t;
}

/**
 * Apply Agent Skills validation to YAML, strip `allowed-tools`, synthesise minimal YAML when missing.
 *
 * @param skillMdUtf8 - After bundle placeholder patching.
 * @param fallbackName - When frontmatter is absent (from manifest `name` or basename).
 * @returns Final SKILL.md text and install directory segment under `skills/`.
 */
export function finalizeSkillMdContent(
  skillMdUtf8: string,
  fallbackName: string
): { content: string; skillDirName: string } {
  const split = trySplitSkillFrontmatter(skillMdUtf8);
  if (!split) {
    const name = (fallbackName.trim() || "skill").slice(0, SKILL_NAME_MAX_LEN);
    const desc = "Installed skill package";
    const synthYaml = `name: ${yamlScalarQuote(name)}\ndescription: ${yamlScalarQuote(desc)}`;
    const front = normaliseSkillYamlDocument(synthYaml);
    const skillDirName = assertSafeSkillDirectoryName(skillNameFromNormalisedFrontmatter(front));
    const yamlBlock = serialiseSkillFrontmatterYaml(front);
    const body = skillMdUtf8.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
    const content = `---\n${yamlBlock}\n---\n\n${body}`;
    return { content, skillDirName };
  }

  const front = normaliseSkillYamlDocument(split.yaml);
  const skillDirName = assertSafeSkillDirectoryName(skillNameFromNormalisedFrontmatter(front));
  const yamlBlock = serialiseSkillFrontmatterYaml(front);
  const body = split.body.replace(/\r\n/g, "\n");
  const content = `---\n${yamlBlock}\n---\n\n${body}`;
  return { content, skillDirName };
}

function yamlScalarQuote(s: string): string {
  if (/^[\w.-]+$/.test(s)) {
    return s;
  }
  const escaped = s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escaped}"`;
}
