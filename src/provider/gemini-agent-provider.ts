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
import { providerActionsForStagedMcpJson } from "./provider-mcp-staged-json.js";
import { markdownManagedBlockForInstalledRule } from "./rule-project-aggregate-md.js";
import type { AtpProvenance, ProviderAction, ProviderPlan } from "./provider-dtos.js";
import type { AgentProvider, ProviderMergeOptions } from "./types.js";

const PROVIDER_LABEL = "GeminiAgentProvider";
const SETTINGS_JSON = "settings.json";

const PROTECTED_REMOVE_PATHS = new Set<string>([SETTINGS_JSON]);

/**
 * Relative path under `.gemini/` for markdown-like assets (prompts vs rules vs sub-agents).
 *
 * @param asset - Asset with `type` discriminant.
 * @param baseName - File name within the package (e.g. `foo.md`).
 */
function relativeMarkdownTargetForGemini(asset: { type: string }, baseName: string): string {
  if (asset.type === "prompt") {
    return path.posix.join("prompts", baseName);
  }
  if (asset.type === "sub-agent") {
    return path.posix.join("rules", baseName);
  }
  return path.posix.join("rules", baseName);
}

/**
 * Builds a single MCP JSON merge action into `.gemini/settings.json`.
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
  return providerActionsForStagedMcpJson({
    providerLabel: PROVIDER_LABEL,
    payload,
    part,
    packageName,
    packageVersion,
    defaultRelativeTarget: SETTINGS_JSON,
    provenanceFragmentKey: SETTINGS_JSON,
  });
}

/**
 * Builds hook actions: `hooks.json` merges into `settings.json`; other hook files copy as raw files.
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
  if (baseName === "hooks.json") {
    const payload = readStagedJsonFile(PROVIDER_LABEL, asset.path, src);
    const hookMerge = {
      kind: "hooks_json_merge" as const,
      operationId: OperationIds.HookJsonGraph,
      provenance: provenanceForFragment(packageName, packageVersion, part, SETTINGS_JSON),
      relativeTargetPath: SETTINGS_JSON,
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

/**
 * Copies a rule `.toml` into `.gemini/commands/` (no markdown materialisation).
 *
 * @param part - Staged part for provenance.
 * @param src - Absolute staged path.
 * @param baseName - File basename including `.toml`.
 * @returns One-element raw file copy action.
 */
function actionsForRuleTomlCommand(
  part: StagedPartInstallInput,
  src: string,
  baseName: string,
  packageName: string | undefined,
  packageVersion: string | undefined
): ProviderAction[] {
  const relativeTargetPath = path.posix.join("commands", baseName);
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
 * Materialises Gemini markdown-like assets under `prompts/` or `rules/` with bundle placeholder patching.
 *
 * @param src - Absolute path to staged markdown source.
 * @returns Plain markdown write; for **rule** markdown, also a project `GEMINI.md` managed block (op **4**).
 */
function actionsForGeminiMarkdownWrite(
  part: StagedPartInstallInput,
  asset: PackageAsset,
  src: string,
  baseName: string,
  packageName: string | undefined,
  packageVersion: string | undefined,
  bundlePathMap: Record<string, string> | undefined
): ProviderAction[] {
  let content = fs.readFileSync(src, "utf8");
  content = patchMarkdownBundlePlaceholders(content, bundlePathMap);
  const relativeTargetPath = relativeMarkdownTargetForGemini(asset, baseName);
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

  const isTomlRule = baseName.toLowerCase().endsWith(".toml");
  if (asset.type === "rule" && !isTomlRule) {
    const layerRel = relativeTargetPath.replace(/\\/g, "/");
    actions.push(
      markdownManagedBlockForInstalledRule({
        agent: "gemini",
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

/**
 * Plans rule / prompt / sub-agent assets: `.toml` rules copy to `commands/`; others get markdown materialisation.
 */
function actionsForMarkdownLikeAsset(
  part: StagedPartInstallInput,
  asset: PackageAsset,
  src: string,
  packageName: string | undefined,
  packageVersion: string | undefined,
  bundlePathMap: Record<string, string> | undefined
): ProviderAction[] {
  const baseName = path.basename(asset.path);
  if (asset.type === "rule" && baseName.toLowerCase().endsWith(".toml")) {
    return actionsForRuleTomlCommand(part, src, baseName, packageName, packageVersion);
  }
  return actionsForGeminiMarkdownWrite(
    part,
    asset,
    src,
    baseName,
    packageName,
    packageVersion,
    bundlePathMap
  );
}

/**
 * Plans install actions for one non-skill asset (MCP, hook, or markdown-like / TOML rule).
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

  return actionsForMarkdownLikeAsset(part, asset, src, packageName, packageVersion, bundlePathMap);
}

/**
 * Gemini CLI install provider for payloads staged under {@link InstallContext.stagingDir}.
 */
export class GeminiAgentProvider implements AgentProvider {
  /**
   * @param manifest - Package manifest (name/version for provenance).
   * @param bundlePathMap - Optional path map for markdown bundle placeholders.
   */
  constructor(
    private readonly manifest: PackageManifest,
    private readonly bundlePathMap?: Record<string, string>
  ) {}

  /**
   * Builds an install plan: skills via shared helpers; MCP/hooks into `settings.json`; rules/prompts otherwise.
   *
   * @param ctx - Layer root and staging dir (project `.gemini/`).
   * @param part - Staged part (files under staging).
   * @param _merge - Reserved for structured merge policy (unused for Gemini v1 paths).
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
   * @param plan - Plan from {@link GeminiAgentProvider.planInstall}.
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
   * Remove one managed file under `layerRoot`. Does not delete merged `settings.json`.
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
 * Factory for {@link GeminiAgentProvider} (same args as constructor).
 *
 * @param manifest - Package manifest.
 * @param bundlePathMap - Optional bundle path map for markdown.
 * @returns Configured Gemini provider instance.
 */
export function createGeminiAgentProvider(
  manifest: PackageManifest,
  bundlePathMap?: Record<string, string>
): GeminiAgentProvider {
  return new GeminiAgentProvider(manifest, bundlePathMap);
}
