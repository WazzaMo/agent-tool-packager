/**
 * Build provider actions from staged MCP JSON: standard {@link McpJsonMergeAction} plus optional
 * {@link JsonDocumentStrategyMergeAction} when the payload includes `atpJsonDocumentStrategy`.
 */

import { OperationIds } from "../file-ops/operation-ids.js";
import { isPlainObject } from "../file-ops/mcp-merge/mcp-json-helpers.js";
import type { JsonMergeStrategy } from "../file-ops/json-merge/json-document-merge-strategies.js";
import type { StagedPartInstallInput } from "../file-ops/part-install-input.js";

import { provenanceForFragment } from "./provider-plan-common.js";
import type { ProviderAction } from "./provider-dtos.js";

const STRATEGY_KEY = "atpJsonDocumentStrategy";

function isJsonMergeStrategy(v: unknown): v is JsonMergeStrategy {
  if (!isPlainObject(v)) {
    return false;
  }
  const mode = v.mode;
  if (mode === "deep_assign_paths") {
    return Array.isArray(v.paths);
  }
  if (mode === "replace_at_pointer") {
    return typeof v.jsonPointer === "string";
  }
  return false;
}

/**
 * @param options.defaultRelativeTarget - Target file when the strategy block omits `targetRelativePath`.
 * @param options.provenanceFragmentKey - Fragment key for the standard MCP merge action.
 */
export function providerActionsForStagedMcpJson(options: {
  providerLabel: string;
  payload: unknown;
  part: StagedPartInstallInput;
  packageName: string | undefined;
  packageVersion: string | undefined;
  mergeBase?: "layer" | "project" | "user_home";
  defaultRelativeTarget: string;
  provenanceFragmentKey: string;
}): ProviderAction[] {
  const {
    providerLabel,
    payload,
    part,
    packageName,
    packageVersion,
    mergeBase,
    defaultRelativeTarget,
    provenanceFragmentKey,
  } = options;

  if (!isPlainObject(payload)) {
    throw new Error(`${providerLabel}: MCP JSON must be a plain object (${STRATEGY_KEY} / mcpServers).`);
  }

  const clone: Record<string, unknown> = { ...payload };
  const rawBlock = clone[STRATEGY_KEY];
  delete clone[STRATEGY_KEY];

  let strategyBlock: {
    strategy: JsonMergeStrategy;
    innerPayload: unknown;
    targetRelativePath: string;
  } | undefined;

  if (rawBlock !== undefined) {
    if (!isPlainObject(rawBlock)) {
      throw new Error(`${providerLabel}: "${STRATEGY_KEY}" must be a plain object.`);
    }
    if (!isJsonMergeStrategy(rawBlock.strategy)) {
      throw new Error(
        `${providerLabel}: "${STRATEGY_KEY}.strategy" must be a JsonMergeStrategy (mode deep_assign_paths or replace_at_pointer).`
      );
    }
    const targetRelativePath =
      typeof rawBlock.targetRelativePath === "string" && rawBlock.targetRelativePath.length > 0
        ? rawBlock.targetRelativePath
        : defaultRelativeTarget;
    strategyBlock = {
      strategy: rawBlock.strategy,
      innerPayload: rawBlock.payload,
      targetRelativePath,
    };
  }

  const mcpServers = clone.mcpServers;
  const hasMcpServers = "mcpServers" in clone && isPlainObject(mcpServers);

  const actions: ProviderAction[] = [];

  if (hasMcpServers) {
    actions.push({
      kind: "mcp_json_merge",
      operationId: OperationIds.ConfigMerge,
      provenance: provenanceForFragment(packageName, packageVersion, part, provenanceFragmentKey),
      mergeBase,
      relativeTargetPath: defaultRelativeTarget,
      payload: clone,
    });
  }

  if (strategyBlock) {
    actions.push({
      kind: "json_document_strategy_merge",
      operationId: OperationIds.ConfigMerge,
      provenance: provenanceForFragment(
        packageName,
        packageVersion,
        part,
        strategyBlock.targetRelativePath
      ),
      mergeBase,
      relativeTargetPath: strategyBlock.targetRelativePath,
      strategy: strategyBlock.strategy,
      payload: strategyBlock.innerPayload,
    });
  }

  if (actions.length === 0) {
    throw new Error(
      `${providerLabel}: MCP JSON must include mcpServers and/or "${STRATEGY_KEY}" with a strategy.`
    );
  }

  return actions;
}
