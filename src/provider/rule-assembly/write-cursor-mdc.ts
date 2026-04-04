/**
 * Write assembled Cursor `.mdc` content to disk.
 */

import fs from "node:fs/promises";
import path from "node:path";

import { assembleCursorMdcContent } from "./cursor-mdc.js";

/**
 * @param absolutePath - Destination file path (parent dirs created as needed).
 * @param frontmatterYaml - Passed to {@link assembleCursorMdcContent}.
 * @param bodyMarkdown - Passed to {@link assembleCursorMdcContent}.
 */
export async function writeAssembledCursorMdcFile(
  absolutePath: string,
  frontmatterYaml: string,
  bodyMarkdown: string
): Promise<void> {
  const content = assembleCursorMdcContent(frontmatterYaml, bodyMarkdown);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, content, "utf8");
}
