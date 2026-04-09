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
import { materializeRuleLike } from "./rule-like-materialize.js";
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
const MCP_JSON = "mcp.json";
const HOOKS_JSON = "hooks.json";

const PROTECTED_REMOVE_PATHS = new Set<string>([MCP_JSON, HOOKS_JSON]);

/**
 * Builds a single MCP JSON merge action for project-layer `mcp.json`.
 *
 * @param src - Absolute path to staged JSON payload.
 * @returns One-element action list.
 */
function actionsForMcpAsset(
  part: StagedPartInstallInput,
  asset: PackageAsset,
  src: string,
  packageName: string | undefined,
  packageVersion: string | undefined
): ProviderAction[] {
  const payload = readStagedJsonFile(PROVIDER_LABEL, asset.path, src);
  return [
    {
      kind: "mcp_json_merge",
      operationId: OperationIds.ConfigMerge,
      provenance: provenanceForFragment(packageName, packageVersion, part, MCP_JSON),
      relativeTargetPath: MCP_JSON,
      payload,
    },
  ];
}

/**
 * Builds hook actions: `hooks.json` merges into project `hooks.json`; other hook files copy as raw files.
 *
 * @param src - Absolute path to staged hook file.
 * @returns One-element action list.
 */
function actionsForHookAsset(
  ctx: InstallContext,
  part: StagedPartInstallInput,
  asset: PackageAsset,
  src: string,
  packageName: string | undefined,
  packageVersion: string | undefined
): ProviderAction[] {
  const baseName = path.basename(asset.path);
  if (baseName === HOOKS_JSON) {
    const payload = readStagedJsonFile(PROVIDER_LABEL, asset.path, src);
    return [
      {
        kind: "hooks_json_merge",
        operationId: OperationIds.HookJsonGraph,
        provenance: provenanceForFragment(packageName, packageVersion, part, HOOKS_JSON),
        relativeTargetPath: HOOKS_JSON,
        payload,
      },
    ];
  }
  const { filePath } = agentDestinationForAsset(ctx.layerRoot, asset);
  const relativeTargetPath = relativePathFromLayerRoot(ctx.layerRoot, filePath);
  return [
    {
      kind: "raw_file_copy",
      operationId: OperationIds.TreeMaterialise,
      provenance: provenanceForFragment(packageName, packageVersion, part, relativeTargetPath),
      relativeTargetPath,
      sourceAbsolutePath: src,
    },
  ];
}

/**
 * Materialises rule-, prompt-, or sub-agent markdown under the Cursor agent tree (bundle placeholder patching).
 *
 * @param src - Absolute path to staged markdown source.
 * @returns One-element plain markdown write action.
 */
function actionsForMarkdownLikeAsset(
  ctx: InstallContext,
  part: StagedPartInstallInput,
  asset: PackageAsset,
  src: string,
  packageName: string | undefined,
  packageVersion: string | undefined,
  bundlePathMap: Record<string, string> | undefined
): ProviderAction[] {
  let content = fs.readFileSync(src, "utf8");
  content = patchMarkdownBundlePlaceholders(content, bundlePathMap);
  const { filePath } = agentDestinationForAsset(ctx.layerRoot, asset);
  const relativeTargetPath = relativePathFromLayerRoot(ctx.layerRoot, filePath);
  const baseName = path.basename(asset.path);
  const { content: outContent, operationId } = materializeRuleLike(baseName, content);

  return [
    {
      kind: "plain_markdown_write",
      operationId,
      provenance: provenanceForFragment(packageName, packageVersion, part, relativeTargetPath),
      relativeTargetPath,
      writeMode: "create_or_replace",
      content: outContent,
      encoding: "utf-8",
    },
  ];
}

/**
 * Plans install actions for one non-skill asset (MCP, hook, or markdown-like).
 *
 * @param ctx - Install layer and paths.
 * @param part - Staged part being installed.
 * @param asset - Package asset descriptor.
 * @param packageName - Manifest name for provenance.
 * @param packageVersion - Manifest version for provenance.
 * @param bundlePathMap - Optional bundle path substitutions for markdown.
 * @returns Actions to append to the part plan.
 */
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

  if (asset.type === "mcp") {
    return actionsForMcpAsset(part, asset, src, packageName, packageVersion);
  }
  if (asset.type === "hook") {
    return actionsForHookAsset(ctx, part, asset, src, packageName, packageVersion);
  }

  const isMarkdownLike =
    asset.type === "rule" || asset.type === "prompt" || asset.type === "sub-agent";
  if (!isMarkdownLike) {
    throw new Error(`${PROVIDER_LABEL}: unsupported asset type "${asset.type}" for ${asset.path}`);
  }

  return actionsForMarkdownLikeAsset(
    ctx,
    part,
    asset,
    src,
    packageName,
    packageVersion,
    bundlePathMap
  );
}

/**
 * Cursor install provider for payloads staged under {@link InstallContext.stagingDir}.
 */
export class CursorAgentProvider implements AgentProvider {
  /**
   * @param manifest - Package manifest (name/version for provenance).
   * @param bundlePathMap - Optional path map for markdown bundle placeholders.
   */
  constructor(
    private readonly manifest: PackageManifest,
    private readonly bundlePathMap?: Record<string, string>
  ) {}

  /**
   * Builds an install plan: skills via shared helpers; other assets via MCP merge, hooks, or markdown writes.
   *
   * @param ctx - Layer root, staging dir, and project vs user layer.
   * @param part - Staged part (files under staging).
   * @param _merge - Reserved for structured merge policy (unused for Cursor v1 paths).
   * @returns Provider plan for this part.
   */
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

  /**
   * Executes the plan (file copies, merges, journal).
   *
   * @param plan - Plan from {@link CursorAgentProvider.planInstall}.
   * @param merge - Force/skip policy for structured merges.
   * @param onFileWritten - Optional callback after each written path.
   * @param configMergeJournal - Optional journal entries for config merges.
   */
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
   *
   * @param ctx - Layer containing the target.
   * @param target - Provenance of the file to remove.
   * @returns Plan with context; `actions` is empty when the path is unsafe or protected.
   */
  planRemove(ctx: InstallContext, target: AtpProvenance): ProviderPlan {
    return buildRemoveManagedFilePlan(ctx, target, PROTECTED_REMOVE_PATHS);
  }
}

/**
 * Factory for {@link CursorAgentProvider} (same args as constructor).
 *
 * @param manifest - Package manifest.
 * @param bundlePathMap - Optional bundle path map for markdown.
 * @returns Configured Cursor provider instance.
 */
export function createCursorAgentProvider(
  manifest: PackageManifest,
  bundlePathMap?: Record<string, string>
): CursorAgentProvider {
  return new CursorAgentProvider(manifest, bundlePathMap);
}
