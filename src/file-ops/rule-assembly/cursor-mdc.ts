/**
 * Assemble Cursor `.mdc` rule files from YAML metadata + markdown body (operation **2**).
 *
 * Matches the shape described in Feature 5 / file-operations plan: frontmatter fields such as
 * `description`, `globs`, `alwaysApply`, then `---`, then body.
 */

import { RuleAssemblyInvalidInputError } from "./errors.js";

/**
 * Accept YAML text as stored in packages (no leading `---`) or strip a single wrapped
 * `---` … `---` block if the author pasted a full frontmatter excerpt.
 *
 * @param raw - Raw YAML or pseudo-frontmatter string.
 * @returns Trimmed YAML lines only, no document markers.
 */
export function normalizeCursorFrontmatterYaml(raw: string): string {
  let s = raw.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").trim();
  if (s.startsWith("---")) {
    const lines = s.split("\n");
    if (lines[0]?.trim() === "---") {
      lines.shift();
      while (lines.length > 0 && lines[lines.length - 1]?.trim() === "---") {
        lines.pop();
      }
      s = lines.join("\n").trim();
    }
  }
  return s.trimEnd();
}

/**
 * Normalise markdown body: UTF-8 BOM stripped, CRLF → LF, trailing whitespace trimmed
 * (final newline added by {@link assembleCursorMdcContent}).
 */
export function normalizeRuleBodyMarkdown(bodyMarkdown: string): string {
  return bodyMarkdown.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").trimEnd();
}

/**
 * Build the full `.mdc` file contents.
 *
 * @param frontmatterYaml - YAML keys/values only, or text wrapped in optional `---` lines.
 * @param bodyMarkdown - Markdown body after the closing `---`.
 * @returns UTF-8 string ending with a single newline.
 * @throws RuleAssemblyInvalidInputError when frontmatter is empty after normalisation.
 */
export function assembleCursorMdcContent(
  frontmatterYaml: string,
  bodyMarkdown: string
): string {
  const yaml = normalizeCursorFrontmatterYaml(frontmatterYaml);
  if (!yaml) {
    throw new RuleAssemblyInvalidInputError(
      "Cursor .mdc requires non-empty YAML frontmatter (e.g. description, globs, alwaysApply)."
    );
  }
  const body = normalizeRuleBodyMarkdown(bodyMarkdown);
  return `---\n${yaml}\n---\n\n${body}\n`;
}
