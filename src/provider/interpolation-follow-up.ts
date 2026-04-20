/**
 * Append op **10** {@link InterpolationPolicyAction} after JSON MCP / hooks merges.
 */

import { OperationIds } from "../file-ops/operation-ids.js";
import type { StagedPartInstallInput } from "../file-ops/part-install-input.js";

import type {
  HooksJsonMergeAction,
  InterpolationPolicyAction,
  McpJsonMergeAction,
  ProviderAction,
} from "./provider-dtos.js";
import { provenanceForFragment } from "./provider-plan-common.js";

function interpolationAfterJsonConfigMerge(opts: {
  part: StagedPartInstallInput;
  packageName: string | undefined;
  packageVersion: string | undefined;
  mergeBase: McpJsonMergeAction["mergeBase"];
  relativeTargetPath: string;
  fragmentKeyForProvenance: string;
}): InterpolationPolicyAction {
  const rel = opts.relativeTargetPath.replace(/\\/g, "/");
  return {
    kind: "interpolation_policy",
    operationId: OperationIds.InterpolationValidate,
    provenance: provenanceForFragment(
      opts.packageName,
      opts.packageVersion,
      opts.part,
      `${opts.fragmentKeyForProvenance}:interpolation`
    ),
    mergeBase: opts.mergeBase,
    relativeTargetPath: rel,
    policy: "normalize_workspace_paths",
  };
}

/**
 * For each `mcp_json_merge` / `json_document_strategy_merge`, append normalising interpolation pass.
 */
export function withInterpolationAfterJsonMerges(
  actions: ProviderAction[],
  part: StagedPartInstallInput,
  packageName: string | undefined,
  packageVersion: string | undefined
): ProviderAction[] {
  const out: ProviderAction[] = [];
  for (const a of actions) {
    out.push(a);
    if (a.kind === "mcp_json_merge") {
      out.push(
        interpolationAfterJsonConfigMerge({
          part,
          packageName,
          packageVersion,
          mergeBase: a.mergeBase,
          relativeTargetPath: a.relativeTargetPath,
          fragmentKeyForProvenance: a.provenance.fragmentKey,
        })
      );
    }
    if (a.kind === "json_document_strategy_merge") {
      const m = a as JsonDocumentStrategyMergeAction;
      out.push(
        interpolationAfterJsonConfigMerge({
          part,
          packageName,
          packageVersion,
          mergeBase: m.mergeBase,
          relativeTargetPath: m.relativeTargetPath,
          fragmentKeyForProvenance: m.provenance.fragmentKey,
        })
      );
    }
  }
  return out;
}

/**
 * Hooks merge always uses {@link InstallContext.layerRoot}; interpolation targets the same JSON file.
 */
export function interpolationPolicyAfterHooksMerge(opts: {
  part: StagedPartInstallInput;
  packageName: string | undefined;
  packageVersion: string | undefined;
  hooksAction: HooksJsonMergeAction;
}): InterpolationPolicyAction {
  const rel = opts.hooksAction.relativeTargetPath.replace(/\\/g, "/");
  return {
    kind: "interpolation_policy",
    operationId: OperationIds.InterpolationValidate,
    provenance: provenanceForFragment(
      opts.packageName,
      opts.packageVersion,
      opts.part,
      `${rel}:hooks_interpolation`
    ),
    mergeBase: "layer",
    relativeTargetPath: rel,
    policy: "normalize_workspace_paths",
  };
}
