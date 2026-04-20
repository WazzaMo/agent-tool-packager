/**
 * Shared {@link AgentProvider.planRemove} logic: delete one managed file if path is safe.
 */

import path from "node:path";

import { OperationIds } from "../file-ops/operation-ids.js";

import type { InstallContext } from "../file-ops/install-context.js";

import type { AtpProvenance, ProviderPlan } from "./provider-dtos.js";

/**
 * Build a remove plan that deletes `target.fragmentKey` under `layerRoot` (default) or `projectRoot`
 * when it is a safe relative path and not one of the protected merge targets (e.g. `mcp.json`, `settings.json`).
 *
 * @param protectedRelativePaths - Normalised POSIX paths (no leading `./`) that must not be deleted via this plan.
 * @param fileDestinationRoot - When `project`, the file path is resolved under {@link InstallContext.projectRoot}.
 */
export function buildRemoveManagedFilePlan(
  ctx: InstallContext,
  target: AtpProvenance,
  protectedRelativePaths: ReadonlySet<string>,
  fileDestinationRoot?: "layer" | "project"
): ProviderPlan {
  const rel = target.fragmentKey.replace(/\\/g, "/").trim();
  const unsafe =
    !rel ||
    rel.includes("..") ||
    path.posix.isAbsolute(rel) ||
    protectedRelativePaths.has(rel);

  const actions: ProviderPlan["actions"] = [];
  if (!unsafe) {
    actions.push({
      kind: "delete_managed_file",
      operationId: OperationIds.ExperimentalDrop,
      provenance: target,
      relativeTargetPath: rel,
      destinationRoot: fileDestinationRoot === "project" ? "project" : undefined,
    });
  }

  return {
    context: ctx,
    provenanceBase: {
      packageName: target.packageName,
      packageVersion: target.packageVersion,
      partIndex: target.partIndex,
      partKind: target.partKind,
    },
    actions,
  };
}
