/**
 * Agent Skills specification limits (ATP standard skill provider).
 */

/** Max length for `name` in skill YAML frontmatter. */
export const SKILL_NAME_MAX_LEN = 64;

/** Max length for `description` in skill YAML frontmatter. */
export const SKILL_DESCRIPTION_MAX_LEN = 1024;

/** Max length for optional `compatibility` field. */
export const SKILL_COMPATIBILITY_MAX_LEN = 500;

/** Frontmatter key stripped at install time (experimental in spec). */
export const SKILL_ALLOWED_TOOLS_KEY = "allowed-tools";
