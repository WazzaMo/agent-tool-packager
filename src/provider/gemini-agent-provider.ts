/**
 * Gemini CLI {@link AgentProvider} for **project** installs: all materialised paths are relative to
 * {@link InstallContext.layerRoot}, which resolves to the project **`.gemini/`** directory (Station
 * `agent-paths.gemini.project_path`). ATP does **not** install under **`.agents/`** for Gemini—skills
 * live under **`skills/{name}/`**, rules under **`rules/`**, and so on, inside **`.gemini/`** only.
 * MCP and hooks merge into **`settings.json`** in that same directory per the agent matrix.
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

const PROVIDER_LABEL = "GeminiAgentProvider";
const SETTINGS_JSON = "settings.json";

const PROTECTED_REMOVE_PATHS = new Set<string>([SETTINGS_JSON]);

function relativeMarkdownTargetForGemini(asset: { type: string }, baseName: string): string {
  if (asset.type === "prompt") {
    return path.posix.join("prompts", baseName);
  }
  if (asset.type === "sub-agent") {
    return path.posix.join("rules", baseName);
  }
  return path.posix.join("rules", baseName);
}

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
      provenance: provenanceForFragment(packageName, packageVersion, part, SETTINGS_JSON),
      relativeTargetPath: SETTINGS_JSON,
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
        provenance: provenanceForFragment(packageName, packageVersion, part, SETTINGS_JSON),
        relativeTargetPath: SETTINGS_JSON,
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

  const baseName = path.basename(asset.path);
  if (asset.type === "rule" && baseName.toLowerCase().endsWith(".toml")) {
    const relativeTargetPath = path.posix.join("commands", baseName);
    out.push({
      kind: "raw_file_copy",
      operationId: OperationIds.TreeMaterialise,
      provenance: provenanceForFragment(packageName, packageVersion, part, relativeTargetPath),
      relativeTargetPath,
      sourceAbsolutePath: src,
    });
    return out;
  }

  let content = fs.readFileSync(src, "utf8");
  content = patchMarkdownBundlePlaceholders(content, bundlePathMap);
  const relativeTargetPath = relativeMarkdownTargetForGemini(asset, baseName);
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
 * Gemini CLI install provider for payloads staged under {@link InstallContext.stagingDir}.
 */
export class GeminiAgentProvider implements AgentProvider {
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
   * Remove one managed file under `layerRoot`. Does not delete merged `settings.json`.
   */
  planRemove(ctx: InstallContext, target: AtpProvenance): ProviderPlan {
    return buildRemoveManagedFilePlan(ctx, target, PROTECTED_REMOVE_PATHS);
  }
}

/**
 * Factory for {@link GeminiAgentProvider}.
 */
export function createGeminiAgentProvider(
  manifest: PackageManifest,
  bundlePathMap?: Record<string, string>
): GeminiAgentProvider {
  return new GeminiAgentProvider(manifest, bundlePathMap);
}
