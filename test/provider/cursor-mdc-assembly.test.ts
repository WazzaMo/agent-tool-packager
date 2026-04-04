/**
 * Unit tests: Cursor `.mdc` rule assembly (YAML + body → file content).
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  assembleCursorMdcContent,
  normalizeCursorFrontmatterYaml,
  normalizeRuleBodyMarkdown,
} from "../../src/provider/rule-assembly/cursor-mdc.js";
import { RuleAssemblyInvalidInputError } from "../../src/provider/rule-assembly/errors.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GOLDEN_PATH = path.join(__dirname, "../fixtures/provider/cursor-rule-expected.mdc");

const GOLDEN_FRONTMATTER = `description: Test rule for ATP golden file
globs:
  - "**/*.ts"
alwaysApply: false`;

const GOLDEN_BODY = `# Rule body

Use TypeScript carefully.`;

describe("normalizeCursorFrontmatterYaml", () => {
  it("returns trimmed YAML when no markers", () => {
    expect(normalizeCursorFrontmatterYaml("  foo: bar\n")).toBe("foo: bar");
  });

  it("strips a single leading and trailing --- wrapper", () => {
    const raw = "---\ndescription: x\nglobs: []\n---";
    expect(normalizeCursorFrontmatterYaml(raw)).toBe("description: x\nglobs: []");
  });

  it("normalises CRLF", () => {
    expect(normalizeCursorFrontmatterYaml("foo: 1\r\n")).toBe("foo: 1");
  });
});

describe("normalizeRuleBodyMarkdown", () => {
  it("strips BOM and CRLF and trailing whitespace", () => {
    expect(normalizeRuleBodyMarkdown("\uFEFF# Hi\r\n\r\n")).toBe("# Hi");
  });
});

describe("assembleCursorMdcContent", () => {
  it("matches the golden fixture file byte-for-byte", () => {
    const expected = fs.readFileSync(GOLDEN_PATH, "utf8");
    const actual = assembleCursorMdcContent(GOLDEN_FRONTMATTER, GOLDEN_BODY);
    expect(actual).toBe(expected);
  });

  it("accepts frontmatter already wrapped in --- lines", () => {
    const wrapped = `---\n${GOLDEN_FRONTMATTER}\n---`;
    const expected = fs.readFileSync(GOLDEN_PATH, "utf8");
    expect(assembleCursorMdcContent(wrapped, GOLDEN_BODY)).toBe(expected);
  });

  it("throws when YAML is empty after normalisation", () => {
    expect(() => assembleCursorMdcContent("", "# body")).toThrow(RuleAssemblyInvalidInputError);
    expect(() => assembleCursorMdcContent("   \n  ", "# body")).toThrow(
      RuleAssemblyInvalidInputError
    );
  });

  it("allows empty body", () => {
    const out = assembleCursorMdcContent("description: Only front", "");
    expect(out).toBe("---\ndescription: Only front\n---\n\n\n");
  });
});
