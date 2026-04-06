/**
 * Assemble `SKILL.md` from skill.yaml + markdown body.
 */

import {
  normaliseSkillYamlDocument,
  serialiseSkillFrontmatterYaml,
} from "./normalize-skill-frontmatter.js";

/**
 * Combine validated YAML and body into one SKILL.md document.
 *
 * @param skillYamlUtf8 - Contents of skill.yaml / skill.yml.
 * @param bodyUtf8 - Markdown body (skill.md).
 * @returns Full SKILL.md text.
 */
export function assembleSkillMdFromPartials(skillYamlUtf8: string, bodyUtf8: string): string {
  const front = normaliseSkillYamlDocument(skillYamlUtf8);
  const yamlBlock = serialiseSkillFrontmatterYaml(front);
  const body = bodyUtf8.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  return `---\n${yamlBlock}\n---\n\n${body}`;
}
