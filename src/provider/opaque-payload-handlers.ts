/**
 * Handlers for {@link OpaquePayloadAction} (op **12** Experimental drop).
 */

import fs from "node:fs";
import path from "node:path";

import type { InstallContext } from "../file-ops/install-context.js";
import { isPlainObject } from "../file-ops/mcp-merge/mcp-json-helpers.js";

/**
 * @param rel - POSIX-style relative path.
 * @param label - Error context label.
 */
function assertSafeRelative(rel: string, label: string): string {
  const norm = rel.replace(/\\/g, "/");
  if (norm.includes("..") || path.posix.isAbsolute(norm)) {
    throw new Error(`Invalid ${label} path "${rel}" (no .. or absolute segments).`);
  }
  return norm;
}

export type OpaquePayloadHandlerFn = (
  ctx: InstallContext,
  payload: unknown,
  onFileWritten?: (absolutePath: string) => void
) => void;

const registry: Record<string, OpaquePayloadHandlerFn> = {
  /**
   * Copy one file from the package staging dir into the agent layer (or project root).
   *
   * Payload: `{ stagedRelativePath: string, relativeTargetPath: string, destinationRoot?: "layer" | "project" }`
   */
  "atp.opaque.staged_raw_copy"(ctx, payload, onFileWritten): void {
    if (!isPlainObject(payload)) {
      throw new Error('opaque_payload(atp.opaque.staged_raw_copy): payload must be a plain object');
    }
    const stagedRaw = payload.stagedRelativePath;
    const destRaw = payload.relativeTargetPath;
    if (typeof stagedRaw !== "string" || typeof destRaw !== "string") {
      throw new Error(
        "opaque_payload(atp.opaque.staged_raw_copy): stagedRelativePath and relativeTargetPath must be strings"
      );
    }
    const stagedRel = assertSafeRelative(stagedRaw, "stagedRelativePath");
    const destRel = assertSafeRelative(destRaw, "relativeTargetPath");
    const src = path.join(ctx.stagingDir, stagedRel);
    if (!fs.existsSync(src) || !fs.statSync(src).isFile()) {
      throw new Error(`opaque_payload: staged file missing or not a file: ${stagedRel}`);
    }
    const destRoot =
      payload.destinationRoot === "project" ? ctx.projectRoot : ctx.layerRoot;
    const out = path.join(destRoot, destRel);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.copyFileSync(src, out);
    onFileWritten?.(out);
  },
};

/**
 * @param handlerId - Registered handler key.
 * @returns Handler function.
 */
export function getOpaquePayloadHandler(handlerId: string): OpaquePayloadHandlerFn {
  const fn = registry[handlerId];
  if (!fn) {
    throw new Error(`Unknown opaque_payload handlerId: ${JSON.stringify(handlerId)}`);
  }
  return fn;
}
