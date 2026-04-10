/**
 * Unit tests: generic JSON document merge strategies (task 3.8).
 */

import { describe, it, expect } from "vitest";

import { parseJsonPointer } from "../../src/file-ops/json-merge/json-pointer.js";
import { deepMergePlainObjects } from "../../src/file-ops/json-merge/deep-merge-plain-objects.js";
import { mergeJsonDocumentWithStrategy } from "../../src/file-ops/json-merge/json-document-merge-strategies.js";
import {
  JsonDocumentMergeInvalidPayloadError,
  JsonDocumentMergeInvalidPointerError,
} from "../../src/file-ops/json-merge/errors.js";

describe("parseJsonPointer", () => {
  it("parses empty pointer as root", () => {
    expect(parseJsonPointer("")).toEqual([]);
  });

  it("parses simple segments", () => {
    expect(parseJsonPointer("/mcpServers/pkg-a")).toEqual(["mcpServers", "pkg-a"]);
  });

  it("unescapes ~1 and ~0", () => {
    expect(parseJsonPointer("/a~1b")).toEqual(["a/b"]);
    expect(parseJsonPointer("/c~0d")).toEqual(["c~d"]);
  });

  it("rejects pointers that do not start with /", () => {
    expect(() => parseJsonPointer("mcpServers")).toThrow(JsonDocumentMergeInvalidPointerError);
  });
});

describe("deepMergePlainObjects", () => {
  it("merges nested objects and replaces scalars", () => {
    const a = { x: 1, nested: { y: 1, z: 2 } };
    const b = { nested: { y: 9 }, q: 3 };
    expect(deepMergePlainObjects(a, b)).toEqual({
      x: 1,
      nested: { y: 9, z: 2 },
      q: 3,
    });
  });
});

describe("mergeJsonDocumentWithStrategy", () => {
  describe("deep_assign_paths", () => {
    it("merges into the root when path is empty", () => {
      const { document, changed } = mergeJsonDocumentWithStrategy(
        { keep: true, mcpServers: { a: { command: "x" } } },
        { mcpServers: { b: { command: "y" } } },
        { mode: "deep_assign_paths", paths: [[]] }
      );
      expect(changed).toBe(true);
      expect(document).toEqual({
        keep: true,
        mcpServers: {
          a: { command: "x" },
          b: { command: "y" },
        },
      });
    });

    it("merges into a nested object, creating missing parents", () => {
      const { document } = mergeJsonDocumentWithStrategy(
        {},
        { srv: { command: "c" } },
        { mode: "deep_assign_paths", paths: [["extensions", "mcp"]] }
      );
      expect(document).toEqual({
        extensions: {
          mcp: {
            srv: { command: "c" },
          },
        },
      });
    });

    it("deep-merges an existing leaf object", () => {
      const { document } = mergeJsonDocumentWithStrategy(
        { extensions: { mcp: { one: { url: "http://a" } } } },
        { two: { url: "http://b" } },
        { mode: "deep_assign_paths", paths: [["extensions", "mcp"]] }
      );
      expect(document.extensions).toEqual({
        mcp: {
          one: { url: "http://a" },
          two: { url: "http://b" },
        },
      });
    });

    it("throws when paths is empty", () => {
      expect(() =>
        mergeJsonDocumentWithStrategy({}, {}, { mode: "deep_assign_paths", paths: [] })
      ).toThrow(JsonDocumentMergeInvalidPayloadError);
    });

    it("throws when traversing through a non-object", () => {
      expect(() =>
        mergeJsonDocumentWithStrategy(
          { extensions: "bad" },
          { x: 1 },
          { mode: "deep_assign_paths", paths: [["extensions", "mcp"]] }
        )
      ).toThrow(JsonDocumentMergeInvalidPointerError);
    });
  });

  describe("replace_at_pointer", () => {
    it("replaces the whole document when pointer is empty", () => {
      const { document, changed } = mergeJsonDocumentWithStrategy(
        { old: true },
        { fresh: 1 },
        { mode: "replace_at_pointer", jsonPointer: "" }
      );
      expect(changed).toBe(true);
      expect(document).toEqual({ fresh: 1 });
    });

    it("replaces a single nested value", () => {
      const { document } = mergeJsonDocumentWithStrategy(
        { mcpServers: { a: { command: "old" } }, other: 1 },
        { command: "new" },
        { mode: "replace_at_pointer", jsonPointer: "/mcpServers/a" }
      );
      expect(document).toEqual({
        mcpServers: { a: { command: "new" } },
        other: 1,
      });
    });

    it("can replace with a non-object payload", () => {
      const { document } = mergeJsonDocumentWithStrategy(
        { x: { y: 1 } },
        "scalar",
        { mode: "replace_at_pointer", jsonPointer: "/x" }
      );
      expect(document).toEqual({ x: "scalar" });
    });

    it("is noop when value is unchanged", () => {
      const root = { a: { b: 1 } };
      const { document, changed } = mergeJsonDocumentWithStrategy(
        root,
        { b: 1 },
        { mode: "replace_at_pointer", jsonPointer: "/a" }
      );
      expect(changed).toBe(false);
      expect(document).toEqual(root);
    });
  });
});
