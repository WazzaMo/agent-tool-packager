/**
 * Replace `{skill_scripts}` in skill markdown bodies (Agent Skills install convention).
 */

const SKILL_SCRIPTS_PLACEHOLDER = /\{skill_scripts\}\//g;

/**
 * Replace `{skill_scripts}/` with a path relative to the skill root (typically `scripts/`).
 *
 * @param body - Markdown body (not including YAML frontmatter block).
 * @param relativeScriptsDir - Replacement prefix, e.g. `scripts` or `./scripts` (no trailing slash).
 * @returns Body with placeholders expanded.
 */
export function patchSkillScriptsPlaceholder(body: string, relativeScriptsDir: string): string {
  const prefix = relativeScriptsDir.replace(/\/+$/, "");
  return body.replace(SKILL_SCRIPTS_PLACEHOLDER, `${prefix}/`);
}
