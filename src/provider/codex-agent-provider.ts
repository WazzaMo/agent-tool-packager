/**
 * Codex CLI {@link AgentProvider} for **project** installs under {@link InstallContext.layerRoot}
 * (project `.codex/`). Skills materialise under **`.agents/skills/{name}/`** at the repo root per
 * Codex discovery. Rules, prompts, and sub-agents use `.codex/rules/` and `.codex/prompts/`; hooks
 * merge into `.codex/hooks.json`; packaged MCP JSON merges into **`.codex/config.toml`** as
 * `[mcp_servers.<name>]` tables.
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
import { experimentalPartOpaqueActions } from "./experimental-opaque-plan.js";
import { interpolationPolicyAfterHooksMerge } from "./interpolation-follow-up.js";
import { buildRemoveManagedFilePlan } from "./provider-plan-remove.js";
import { markdownManagedBlockForInstalledRule } from "./rule-project-aggregate-md.js";
import type { AtpProvenance, ProviderAction, ProviderPlan } from "./provider-dtos.js";
import type { AgentProvider, ProviderMergeOptions } from "./types.js";

const PROVIDER_LABEL = "CodexAgentProvider";
const CONFIG_TOML = "config.toml";
const HOOKS_JSON = "hooks.json";

const PROTECTED_REMOVE_PATHS = new Set<string>([CONFIG_TOML, HOOKS_JSON]);

const CODEX_SKILL_PATH_OPTIONS = {
  destinationRoot: "project" as const,
  skillsParentRelative: ".agents/skills",
};

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
      kind: "mcp_codex_config_toml_merge",
      operationId: OperationIds.ConfigMerge,
      provenance: provenanceForFragment(packageName, packageVersion, part, CONFIG_TOML),
      relativeTargetPath: CONFIG_TOML,
      payload,
    },
  ];
}

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
    const hookMerge = {
      kind: "hooks_json_merge" as const,
      operationId: OperationIds.HookJsonGraph,
      provenance: provenanceForFragment(packageName, packageVersion, part, HOOKS_JSON),
      relativeTargetPath: HOOKS_JSON,
      payload,
    };
    return [
      hookMerge,
      interpolationPolicyAfterHooksMerge({
        part,
        packageName,
        packageVersion,
        hooksAction: hookMerge,
      }),
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

  const actions: ProviderAction[] = [
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

  if (asset.type === "rule") {
    const layerRel = relativeTargetPath.replace(/\\/g, "/");
    actions.push(
      markdownManagedBlockForInstalledRule({
        agent: "codex",
        packageName,
        packageVersion,
        part,
        ruleRelativeUnderLayer: layerRel,
        ruleBasename: baseName,
      })
    );
  }

  return actions;
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
 * Codex CLI install provider for payloads staged under {@link InstallContext.stagingDir}.
 */
export class CodexAgentProvider implements AgentProvider {
  /**
   * @param manifest - Package manifest (name/version for provenance).
   * @param bundlePathMap - Optional path map for markdown bundle placeholders.
   */
  constructor(
    private readonly manifest: PackageManifest,
    private readonly bundlePathMap?: Record<string, string>
  ) {}

  /**
   * Builds an install plan: skills under `.agents/skills/`; other assets under `.codex/` (hooks JSON, MCP TOML).
   *
   * @param ctx - Layer root `.codex/`, project root, staging dir.
   * @param part - Staged part (files under staging).
   * @param _merge - Reserved for structured merge policy.
   * @returns Provider plan for this part.
   */
  planInstall(
    ctx: InstallContext,
    part: StagedPartInstallInput,
    _merge: ProviderMergeOptions
  ): ProviderPlan {
    const packageName = this.manifest.name;
    const packageVersion = this.manifest.version;

    if (part.partKind === "Experimental") {
      return installPlanForPart(
        ctx,
        part,
        packageName,
        packageVersion,
        experimentalPartOpaqueActions(this.manifest, part, packageName, packageVersion)
      );
    }

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
        PROVIDER_LABEL,
        CODEX_SKILL_PATH_OPTIONS
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
   * @param plan - Plan from {@link CodexAgentProvider.planInstall}.
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
   * Remove one managed file. Paths under `.agents/` resolve from `projectRoot`; others from `layerRoot`.
   * Does not delete merged `config.toml` / `hooks.json`.
   *
   * @param ctx - Install context.
   * @param target - Provenance (`fragmentKey` relative to the appropriate root).
   * @returns Plan with context; `actions` is empty when unsafe or protected.
   */
  planRemove(ctx: InstallContext, target: AtpProvenance): ProviderPlan {
    const rel = target.fragmentKey.replace(/\\/g, "/").trim();
    const underProjectAgents = rel.startsWith(".agents/");
    return buildRemoveManagedFilePlan(
      ctx,
      target,
      PROTECTED_REMOVE_PATHS,
      underProjectAgents ? "project" : "layer"
    );
  }
}

/**
 * Factory for {@link CodexAgentProvider} (same args as constructor).
 *
 * @param manifest - Package manifest.
 * @param bundlePathMap - Optional bundle path map for markdown.
 * @returns Configured Codex provider instance.
 */
export function createCodexAgentProvider(
  manifest: PackageManifest,
  bundlePathMap?: Record<string, string>
): CodexAgentProvider {
  return new CodexAgentProvider(manifest, bundlePathMap);
}
