/**
 * Split Agent Skills `SKILL.md` content into YAML frontmatter and markdown body.
 */

const SKILL_FRONTMATTER =
  /^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n([\s\S]*)$/;

/**
 * When `raw` has a YAML block between `---` lines, returns yaml text and body.
 *
 * @param raw - UTF-8 file contents.
 * @returns Parts, or undefined when not in that shape.
 */
export function trySplitSkillFrontmatter(raw: string): { yaml: string; body: string } | undefined {
  const normalized = raw.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const m = normalized.match(SKILL_FRONTMATTER);
  if (!m) {
    return undefined;
  }
  return { yaml: m[1].trimEnd(), body: m[2] };
}
