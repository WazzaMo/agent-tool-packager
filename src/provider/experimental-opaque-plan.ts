/**
 * Build op **12** actions for **Experimental** package parts: opaque staged file copies under `experimental/`.
 */

import path from "node:path";

import { OperationIds } from "../file-ops/operation-ids.js";
import type { StagedPartInstallInput } from "../file-ops/part-install-input.js";
import type { PackageManifest } from "../install/types.js";

import type { OpaquePayloadAction, ProviderAction } from "./provider-dtos.js";
import { provenanceForFragment } from "./provider-plan-common.js";

/**
 * Program asset paths in the manifest (catalog layout); excluded from opaque copy (installed via bin).
 */
function programAssetPathSet(manifest: PackageManifest): Set<string> {
  const s = new Set<string>();
  for (const a of manifest.assets ?? []) {
    if (a.type === "program") {
      s.add(a.path.replace(/\\/g, "/"));
    }
  }
  return s;
}

/**
 * One `opaque_payload` per non-program staged path, destination `experimental/<staged path>`.
 *
 * @param manifest - Catalog manifest with `assets` (for program rows).
 */
export function experimentalPartOpaqueActions(
  manifest: PackageManifest,
  part: StagedPartInstallInput,
  packageName: string | undefined,
  packageVersion: string | undefined
): ProviderAction[] {
  const programs = programAssetPathSet(manifest);
  const actions: OpaquePayloadAction[] = [];

  for (const p of part.packagePaths) {
    const posix = p.replace(/\\/g, "/");
    if (programs.has(posix)) {
      continue;
    }
    const destRel = path.posix.join("experimental", posix);
    actions.push({
      kind: "opaque_payload",
      operationId: OperationIds.ExperimentalDrop,
      provenance: provenanceForFragment(packageName, packageVersion, part, destRel),
      handlerId: "atp.opaque.staged_raw_copy",
      payload: {
        stagedRelativePath: posix,
        relativeTargetPath: destRel,
      },
    });
  }

  return actions;
}
