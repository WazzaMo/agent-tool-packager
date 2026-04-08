/**
 * Cursor {@link AgentProvider}: skills, rules, prompts, hooks, MCP under the project agent tree.
 */

import fs from "node:fs";
import path from "node:path";

import { OperationIds } from "../file-ops/operation-ids.js";

import type { InstallContext } from "../file-ops/install-context.js";
import type { StagedPartInstallInput } from "../file-ops/part-install-input.js";
import type { PackageAsset, PackageManifest } from "../install/types.js";
import { agentDestinationForAsset, patchMarkdownBundlePlaceholders } from "../install/copy-assets.js";

import type { ConfigMergeJournalEntryV1 } from "../config/config-merge-journal.js";

import { applyProviderPlan } from "./apply-provider-plan.js";
import { materializeRuleLikeForCursor } from "./cursor-rule-materialize.js";
import {
  appendSkillInstallActions,
  installPlanForPart,
  partitionPartNonProgramAssets,
  provenanceForFragment,
  readStagedJsonFile,
  relativePathFromLayerRoot,
  requireStagedSourceFile,
} from "./provider-plan-common.js";
import { buildRemoveManagedFilePlan } from "./provider-plan-remove.js";
import type { AtpProvenance, ProviderAction, ProviderPlan } from "./provider-dtos.js";
import type { AgentProvider, ProviderMergeOptions } from "./types.js";

const PROVIDER_LABEL = "CursorAgentProvider";

const PROTECTED_REMOVE_PATHS = new Set<string>(["mcp.json", "hooks.json"]);

function planNonSkillAsset(
  ctx: InstallContext,
  part: StagedPartInstallInput,
  asset: PackageAsset,
  packageName: string | undefined,
  packageVersion: string | undefined,
  bundlePathMap: Record<string, string> | undefined
): ProviderAction[] {
  const src = path.join(ctx.stagingDir, asset.path);
  requireStagedSourceFile(PROVIDER_LABEL, asset.path, src);
  const out: ProviderAction[] = [];

  if (asset.type === "mcp") {
    const payload = readStagedJsonFile(PROVIDER_LABEL, asset.path, src);
    out.push({
      kind: "mcp_json_merge",
      operationId: OperationIds.ConfigMerge,
      provenance: provenanceForFragment(packageName, packageVersion, part, "mcp.json"),
      relativeTargetPath: "mcp.json",
      payload,
    });
    return out;
  }

  if (asset.type === "hook") {
    const baseName = path.basename(asset.path);
    if (baseName === "hooks.json") {
      const payload = readStagedJsonFile(PROVIDER_LABEL, asset.path, src);
      out.push({
        kind: "hooks_json_merge",
        operationId: OperationIds.HookJsonGraph,
        provenance: provenanceForFragment(packageName, packageVersion, part, "hooks.json"),
        relativeTargetPath: "hooks.json",
        payload,
      });
      return out;
    }
    const { filePath } = agentDestinationForAsset(ctx.layerRoot, asset);
    const relativeTargetPath = relativePathFromLayerRoot(ctx.layerRoot, filePath);
    out.push({
      kind: "raw_file_copy",
      operationId: OperationIds.TreeMaterialise,
      provenance: provenanceForFragment(packageName, packageVersion, part, relativeTargetPath),
      relativeTargetPath,
      sourceAbsolutePath: src,
    });
    return out;
  }

  const isMarkdownLike =
    asset.type === "rule" || asset.type === "prompt" || asset.type === "sub-agent";
  if (!isMarkdownLike) {
    throw new Error(`${PROVIDER_LABEL}: unsupported asset type "${asset.type}" for ${asset.path}`);
  }

  let content = fs.readFileSync(src, "utf8");
  content = patchMarkdownBundlePlaceholders(content, bundlePathMap);
  const { filePath } = agentDestinationForAsset(ctx.layerRoot, asset);
  const relativeTargetPath = relativePathFromLayerRoot(ctx.layerRoot, filePath);
  const baseName = path.basename(asset.path);
  const { content: outContent, operationId } = materializeRuleLikeForCursor(baseName, content);

  out.push({
    kind: "plain_markdown_write",
    operationId,
    provenance: provenanceForFragment(packageName, packageVersion, part, relativeTargetPath),
    relativeTargetPath,
    writeMode: "create_or_replace",
    content: outContent,
    encoding: "utf-8",
  });
  return out;
}

/**
 * Cursor install provider for payloads staged under {@link InstallContext.stagingDir}.
 */
export class CursorAgentProvider implements AgentProvider {
  constructor(
    private readonly manifest: PackageManifest,
    private readonly bundlePathMap?: Record<string, string>
  ) {}

  planInstall(
    ctx: InstallContext,
    part: StagedPartInstallInput,
    _merge: ProviderMergeOptions
  ): ProviderPlan {
    const packageName = this.manifest.name;
    const packageVersion = this.manifest.version;
    const { skillAssets, nonSkillAssets } = partitionPartNonProgramAssets(this.manifest, part);
    const actions: ProviderPlan["actions"] = [];

    if (skillAssets.length > 0) {
      appendSkillInstallActions(
        actions,
        ctx,
        part,
        skillAssets,
        packageName,
        packageVersion,
        this.bundlePathMap,
        PROVIDER_LABEL
      );
    }

    for (const asset of nonSkillAssets) {
      actions.push(
        ...planNonSkillAsset(ctx, part, asset, packageName, packageVersion, this.bundlePathMap)
      );
    }

    return installPlanForPart(ctx, part, packageName, packageVersion, actions);
  }

  applyPlan(
    plan: ProviderPlan,
    merge: ProviderMergeOptions,
    onFileWritten?: (absolutePath: string) => void,
    configMergeJournal?: ConfigMergeJournalEntryV1[]
  ): void {
    applyProviderPlan(plan, merge, onFileWritten, configMergeJournal);
  }

  /**
   * Remove one managed file under `layerRoot`. Does not delete merged `mcp.json` / `hooks.json`.
   */
  planRemove(ctx: InstallContext, target: AtpProvenance): ProviderPlan {
    return buildRemoveManagedFilePlan(ctx, target, PROTECTED_REMOVE_PATHS);
  }
}

/**
 * Factory for {@link CursorAgentProvider}.
 */
export function createCursorAgentProvider(
  manifest: PackageManifest,
  bundlePathMap?: Record<string, string>
): CursorAgentProvider {
  return new CursorAgentProvider(manifest, bundlePathMap);
}
