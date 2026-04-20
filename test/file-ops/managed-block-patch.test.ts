/**
 * Unit tests for {@link applyManagedBlockToText}.
 */

import { describe, it, expect } from "vitest";
import { applyManagedBlockToText } from "../../src/file-ops/markdown-merge/managed-block-patch.js";
import { atpManagedBlockMarkers } from "../../src/file-ops/markdown-merge/atp-managed-block-markers.js";

describe("applyManagedBlockToText", () => {
  const { begin, end } = atpManagedBlockMarkers("pkg-a", "rules/x.md");

  it("creates file content when missing and ifMissing allows", () => {
    const out = applyManagedBlockToText(null, begin, end, "hello", "append_to_file");
    expect(out).toContain(begin);
    expect(out).toContain("hello");
    expect(out).toContain(end);
  });

  it("replaces an existing region", () => {
    const first = applyManagedBlockToText(null, begin, end, "one", "append_to_file");
    const second = applyManagedBlockToText(first, begin, end, "two", "append_to_file");
    expect(second).toContain("two");
    expect(second).not.toContain("one");
    expect(countOccurrences(second, begin)).toBe(1);
  });

  it("appends when markers missing in existing file", () => {
    const base = "# Title\n\nSome user text.\n";
    const out = applyManagedBlockToText(base, begin, end, "body", "append_to_file");
    expect(out.startsWith(base.trimEnd())).toBe(true);
    expect(out).toContain(begin);
    expect(out).toContain("body");
  });

  it("throws on fail when file missing", () => {
    expect(() => applyManagedBlockToText(null, begin, end, "x", "fail")).toThrow(/missing/);
  });

  it("throws when duplicate begin markers", () => {
    const dup = `${begin}\na\n${end}\n\n${begin}\nb\n${end}\n`;
    expect(() => applyManagedBlockToText(dup, begin, end, "c", "append_to_file")).toThrow(/at most once/);
  });
});

function countOccurrences(haystack: string, needle: string): number {
  let n = 0;
  let i = 0;
  while (true) {
    const j = haystack.indexOf(needle, i);
    if (j === -1) {
      return n;
    }
    n += 1;
    i = j + needle.length;
  }
}
