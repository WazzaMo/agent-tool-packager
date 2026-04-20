/**
 * Catalog install routing: manifest layout, staged parts, and provider {@link InstallContext}.
 */

import path from "node:path";

import { resolveAgentHomePath } from "../config/agent-path.js";
import {
  assignedSafehouseAgentName,
  SafehouseAgentNotAssignedError,
} from "../config/safehouse-agent.js";
import {
  loadSafehouseConfig,
  loadStationConfig,
} from "../config/load.js";

import {
  buildStagedPartInstallInputs,
  coercePackageParts,
} from "../file-ops/part-install-input.js";

import {
  normaliseAgentId,
  type InstallContext,
  type InstallLayer,
} from "../file-ops/install-context.js";
import type { StagedPartInstallInput } from "../file-ops/part-install-input.js";

import type { CatalogInstallContext, PackageManifest } from "./types.js";

/**
 * Classify catalog manifest layout for install routing (Feature 4).
 *
 * @param manifest - Loaded `atp-package.yaml`.
 * @returns `multi` when `parts` is a non-empty array.
 */
export function manifestInstallLayout(manifest: PackageManifest): "multi" | "legacy" {
  const parts = coercePackageParts(manifest.parts);
  if (parts.length > 0) {
    return "multi";
  }
  return "legacy";
}

/**
 * Build staged part handles for the active catalog install (provider planning input).
 *
 * @param ctx - Resolved {@link CatalogInstallContext}.
 * @returns One entry per manifest part (multi) or a single synthetic part (legacy).
 */
export function prepareCatalogInstallPartInputs(
  ctx: CatalogInstallContext
): StagedPartInstallInput[] {
  return buildStagedPartInstallInputs(ctx.manifest, ctx.pkgDir);
}

/**
 * Build provider {@link InstallContext} for this catalog install (roots + agent + layer).
 * `stagingDir` is the package extract directory; `projectRoot` is the repo root.
 *
 * When `opts.promptScope` is `station`, `layer` is `user` and `layerRoot` is the agent home
 * from Station `agent-paths` (for merges targeting user-global config). File copy today still
 * uses `ctx.agentBase` under the project until user-layer materialisation is implemented.
 *
 * @param ctx - Resolved {@link CatalogInstallContext}.
 * @returns Absolute paths suitable for `AgentProvider.planInstall`.
 */
export function buildProviderInstallContext(ctx: CatalogInstallContext): InstallContext {
  const stationConfig = loadStationConfig();
  const safehouse = loadSafehouseConfig(ctx.projectBase);
  const agentName = assignedSafehouseAgentName(safehouse);
  if (!agentName) {
    throw new SafehouseAgentNotAssignedError();
  }
  const agent = normaliseAgentId(agentName);

  const projectRoot = path.resolve(ctx.projectBase);
  const stagingDir = path.resolve(ctx.pkgDir);

  const layer: InstallLayer =
    ctx.opts.promptScope === "project" ? "project" : "user";
  const layerRoot =
    layer === "project"
      ? path.resolve(ctx.agentBase)
      : path.resolve(resolveAgentHomePath(agentName, stationConfig));

  return { agent, layer, projectRoot, layerRoot, stagingDir };
}
