/**
 * Unit tests: Cursor hooks.json merge helper.
 */

import { describe, it, expect } from "vitest";

import { HooksMergeAmbiguousError } from "../../src/file-ops/hooks-merge/errors.js";
import {
  mergeHooksJsonDocument,
  removeHookHandlersFromDocument,
} from "../../src/file-ops/hooks-merge/cursor-hooks-json-merge.js";

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

  it("throws when same id differs and forceConfig is false", () => {
    const existing = { hooks: { e: [{ id: "a", command: "old" }] } };
    const incoming = { hooks: { e: [{ id: "a", command: "new" }] } };
    expect(() => mergeHooksJsonDocument(existing, incoming, {})).toThrow(HooksMergeAmbiguousError);
  });

  it("replaces handler when forceConfig is true", () => {
    const existing = { hooks: { e: [{ id: "a", command: "old" }] } };
    const incoming = { hooks: { e: [{ id: "a", command: "new" }] } };
    const { document, changed } = mergeHooksJsonDocument(existing, incoming, { forceConfig: true });
    expect(changed).toBe(true);
    expect(document.hooks).toEqual({ e: [{ id: "a", command: "new" }] });
  });
});

describe("removeHookHandlersFromDocument", () => {
  it("removes handlers that match the package payload", () => {
    const h1 = { id: "x", command: "c1" };
    const h2 = { id: "y", command: "c2" };
    const existing = { version: 1, hooks: { evt: [h1, h2] } };
    const pkg = { hooks: { evt: [h1] } };
    const { document, changed } = removeHookHandlersFromDocument(existing, pkg);
    expect(changed).toBe(true);
    expect(document.hooks).toEqual({ evt: [h2] });
    expect(document.version).toBe(1);
  });

  it("is a no-op when file content is missing", () => {
    const { document, changed } = removeHookHandlersFromDocument(null, { hooks: { x: [{ id: "1" }] } });
    expect(changed).toBe(false);
    expect(document).toEqual({});
  });
});
