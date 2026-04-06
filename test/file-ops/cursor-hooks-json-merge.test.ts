/**
 * Unit tests: Cursor hooks.json merge helper.
 */

import { describe, it, expect } from "vitest";

import { mergeHooksJsonDocument } from "../../src/file-ops/hooks-merge/cursor-hooks-json-merge.js";

describe("mergeHooksJsonDocument", () => {
  it("appends new handlers and dedupes by id", () => {
    const existing = {
      hooks: {
        beforeSubmit: [{ id: "a", command: "x" }],
      },
    };
    const incoming = {
      hooks: {
        beforeSubmit: [
          { id: "a", command: "x" },
          { id: "b", command: "y" },
        ],
      },
    };
    const { document, changed } = mergeHooksJsonDocument(existing, incoming, {});
    expect(changed).toBe(true);
    expect(document.hooks).toEqual({
      beforeSubmit: [
        { id: "a", command: "x" },
        { id: "b", command: "y" },
      ],
    });
  });

  it("honours skipConfig", () => {
    const existing = { hooks: { x: [{ id: "1" }] }, keep: true };
    const incoming = { hooks: { x: [{ id: "2" }] } };
    const { document, changed } = mergeHooksJsonDocument(existing, incoming, { skipConfig: true });
    expect(changed).toBe(false);
    expect(document).toEqual(existing);
  });
});
