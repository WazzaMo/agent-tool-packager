/**
 * Claude Code {@link AgentProvider}: materialises under {@link InstallContext.layerRoot} (project `.claude/`
 * or user `~/.claude/`). MCP merges into repo-root `.mcp.json` for project layer, or `~/.claude.json` for
 * user (`--station`) installs; hooks merge into `settings.json` in the same layer directory.
 */

import fs from "node:fs";
import path from "node:path";

import { OperationIds } from "../file-ops/operation-ids.js";

import type { InstallContext } from "../file-ops/install-context.js";
import type { StagedPartInstallInput } from "../file-ops/part-install-input.js";
import type { PackageManifest } from "../install/types.js";
import {
  agentDestinationForAsset,
  patchMarkdownBundlePlaceholders,
} from "../install/copy-assets.js";

import type { ConfigMergeJournalEntryV1 } from "../config/config-merge-journal.js";

import { applyProviderPlan } from "./apply-provider-plan.js";
import { materializeRuleLikeForCursor } from "./cursor-rule-materialize.js";
import { buildSkillInstallProviderActions } from "./skill/plan-skill-install.js";
import { SkillFrontmatterError } from "./skill/normalize-skill-frontmatter.js";
import type { AtpProvenance, ProviderPlan } from "./provider-dtos.js";
import type { AgentProvider, ProviderMergeOptions } from "./types.js";

const SETTINGS_JSON = "settings.json";
const PROJECT_MCP_JSON = ".mcp.json";
const USER_CLAUDE_JSON = ".claude.json";

function relativeToLayerRoot(layerRoot: string, absoluteFilePath: string): string {
  return path.relative(layerRoot, absoluteFilePath).replace(/\\/g, "/");
}

function readJsonPayload(label: string, absolutePath: string): unknown {
  const raw = fs.readFileSync(absolutePath, "utf8");
  try {
    return JSON.parse(raw) as unknown;
  } catch (e) {
    const err = e as SyntaxError;
    throw new Error(`ClaudeAgentProvider: invalid JSON in ${label}: ${err.message}`);
  }
}

/**
 * Claude Code install provider for payloads staged under {@link InstallContext.stagingDir}.
 */
export class ClaudeAgentProvider implements AgentProvider {
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
    const assets = this.manifest.assets ?? [];
    const inPart = assets.filter(
      (a) => part.packagePaths.includes(a.path) && a.type !== "program"
    );

    const actions: ProviderPlan["actions"] = [];
    const skillAssets = inPart.filter((a) => a.type === "skill");
    const nonSkillAssets = inPart.filter((a) => a.type !== "skill");

    if (skillAssets.length > 0) {
      try {
        actions.push(
          ...buildSkillInstallProviderActions(
            { stagingDir: ctx.stagingDir, layerRoot: ctx.layerRoot },
            { partIndex: part.partIndex, partKind: part.partKind },
            skillAssets,
            { name: packageName, version: packageVersion },
            this.bundlePathMap
          )
        );
      } catch (e) {
        if (e instanceof SkillFrontmatterError) {
          throw new Error(`ClaudeAgentProvider: ${e.message}`);
        }
        throw e;
      }
    }

    for (const asset of nonSkillAssets) {
      const src = path.join(ctx.stagingDir, asset.path);
      if (!fs.existsSync(src)) {
        throw new Error(`ClaudeAgentProvider: missing staged file: ${asset.path}`);
      }

      if (asset.type === "mcp") {
        const payload = readJsonPayload(asset.path, src);
        const userLayer = ctx.layer === "user";
        const mcpFile = userLayer ? USER_CLAUDE_JSON : PROJECT_MCP_JSON;
        const provenance: AtpProvenance = {
          packageName,
          packageVersion,
          partIndex: part.partIndex,
          partKind: part.partKind,
          fragmentKey: mcpFile,
        };
        actions.push({
          kind: "mcp_json_merge",
          operationId: OperationIds.ConfigMerge,
          provenance,
          mergeBase: userLayer ? "user_home" : "project",
          relativeTargetPath: mcpFile,
          payload,
        });
        continue;
      }

      if (asset.type === "hook") {
        const baseName = path.basename(asset.path);
        if (baseName === "hooks.json") {
          const payload = readJsonPayload(asset.path, src);
          const provenance: AtpProvenance = {
            packageName,
            packageVersion,
            partIndex: part.partIndex,
            partKind: part.partKind,
            fragmentKey: SETTINGS_JSON,
          };
          actions.push({
            kind: "hooks_json_merge",
            operationId: OperationIds.HookJsonGraph,
            provenance,
            relativeTargetPath: SETTINGS_JSON,
            payload,
          });
        } else {
          const { filePath } = agentDestinationForAsset(ctx.layerRoot, asset);
          const relativeTargetPath = relativeToLayerRoot(ctx.layerRoot, filePath);
          const provenance: AtpProvenance = {
            packageName,
            packageVersion,
            partIndex: part.partIndex,
            partKind: part.partKind,
            fragmentKey: relativeTargetPath,
          };
          actions.push({
            kind: "raw_file_copy",
            operationId: OperationIds.TreeMaterialise,
            provenance,
            relativeTargetPath,
            sourceAbsolutePath: src,
          });
        }
        continue;
      }

      const isMarkdownLike =
        asset.type === "rule" ||
        asset.type === "prompt" ||
        asset.type === "sub-agent";

      if (!isMarkdownLike) {
        throw new Error(`ClaudeAgentProvider: unsupported asset type "${asset.type}" for ${asset.path}`);
      }

      let content = fs.readFileSync(src, "utf8");
      content = patchMarkdownBundlePlaceholders(content, this.bundlePathMap);

      const { filePath } = agentDestinationForAsset(ctx.layerRoot, asset);
      const relativeTargetPath = relativeToLayerRoot(ctx.layerRoot, filePath);
      const baseName = path.basename(asset.path);

      const { content: outContent, operationId } = materializeRuleLikeForCursor(baseName, content);

      const provenance: AtpProvenance = {
        packageName,
        packageVersion,
        partIndex: part.partIndex,
        partKind: part.partKind,
        fragmentKey: relativeTargetPath,
      };

      actions.push({
        kind: "plain_markdown_write",
        operationId,
        provenance,
        relativeTargetPath,
        writeMode: "create_or_replace",
        content: outContent,
        encoding: "utf-8",
      });
    }

    return {
      context: ctx,
      provenanceBase: {
        packageName,
        packageVersion,
        partIndex: part.partIndex,
        partKind: part.partKind,
      },
      actions,
    };
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
   * Remove one managed file under `layerRoot`. Does not delete merged `.mcp.json` or `settings.json`.
   */
  planRemove(ctx: InstallContext, target: AtpProvenance): ProviderPlan {
    const rel = target.fragmentKey.replace(/\\/g, "/").trim();
    const unsafe =
      !rel ||
      rel.includes("..") ||
      path.posix.isAbsolute(rel) ||
      rel === SETTINGS_JSON ||
      rel === PROJECT_MCP_JSON ||
      rel === USER_CLAUDE_JSON;

    const actions: ProviderPlan["actions"] = [];
    if (!unsafe) {
      actions.push({
        kind: "delete_managed_file",
        operationId: OperationIds.ExperimentalDrop,
        provenance: target,
        relativeTargetPath: rel,
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
}

export function createClaudeAgentProvider(
  manifest: PackageManifest,
  bundlePathMap?: Record<string, string>
): ClaudeAgentProvider {
  return new ClaudeAgentProvider(manifest, bundlePathMap);
}
