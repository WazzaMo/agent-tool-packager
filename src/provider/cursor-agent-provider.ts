/**
 * Cursor {@link AgentProvider}: skills, rules, prompts, hooks, MCP under the project agent tree.
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

import { applyProviderPlan } from "./apply-provider-plan.js";
import { materializeRuleLikeForCursor } from "./cursor-rule-materialize.js";
import type { AtpProvenance, ProviderPlan } from "./provider-dtos.js";
import type { AgentProvider, ProviderMergeOptions } from "./types.js";

function relativeToLayerRoot(layerRoot: string, absoluteFilePath: string): string {
  return path.relative(layerRoot, absoluteFilePath).replace(/\\/g, "/");
}

function readJsonPayload(
  label: string,
  absolutePath: string
): unknown {
  const raw = fs.readFileSync(absolutePath, "utf8");
  try {
    return JSON.parse(raw) as unknown;
  } catch (e) {
    const err = e as SyntaxError;
    throw new Error(`CursorAgentProvider: invalid JSON in ${label}: ${err.message}`);
  }
}

/**
 * Cursor install provider for payloads staged under {@link InstallContext.stagingDir}.
 */
export class CursorAgentProvider implements AgentProvider {
  /**
   * @param manifest - Installed package manifest (name, version, assets).
   * @param bundlePathMap - Optional `{bundle}` placeholder map for markdown.
   */
  constructor(
    private readonly manifest: PackageManifest,
    private readonly bundlePathMap?: Record<string, string>
  ) {}

  /**
   * Build install actions for one staged part (skips `program` assets; those are copied separately).
   *
   * @throws When a staged file is missing or JSON is invalid for hook/MCP payloads.
   */
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
    for (const asset of inPart) {
      const src = path.join(ctx.stagingDir, asset.path);
      if (!fs.existsSync(src)) {
        throw new Error(`CursorAgentProvider: missing staged file: ${asset.path}`);
      }

      if (asset.type === "mcp") {
        const payload = readJsonPayload(asset.path, src);
        const provenance: AtpProvenance = {
          packageName,
          packageVersion,
          partIndex: part.partIndex,
          partKind: part.partKind,
          fragmentKey: "mcp.json",
        };
        actions.push({
          kind: "mcp_json_merge",
          operationId: OperationIds.ConfigMerge,
          provenance,
          relativeTargetPath: "mcp.json",
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
            fragmentKey: "hooks.json",
          };
          actions.push({
            kind: "hooks_json_merge",
            operationId: OperationIds.HookJsonGraph,
            provenance,
            relativeTargetPath: "hooks.json",
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
        asset.type === "skill" ||
        asset.type === "rule" ||
        asset.type === "prompt" ||
        asset.type === "sub-agent";

      if (!isMarkdownLike) {
        throw new Error(`CursorAgentProvider: unsupported asset type "${asset.type}" for ${asset.path}`);
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
    onFileWritten?: (absolutePath: string) => void
  ): void {
    applyProviderPlan(plan, merge, onFileWritten);
  }

  /**
   * Build a remove plan for a single managed file. Merged config files (`mcp.json`, `hooks.json`)
   * are not partially uninstalled here.
   *
   * @param target - `fragmentKey` must be a safe path relative to `layerRoot` (e.g. `rules/x.md`).
   */
  planRemove(ctx: InstallContext, target: AtpProvenance): ProviderPlan {
    const rel = target.fragmentKey.replace(/\\/g, "/").trim();
    const unsafe =
      !rel ||
      rel.includes("..") ||
      path.posix.isAbsolute(rel) ||
      rel === "mcp.json" ||
      rel === "hooks.json";

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

/**
 * Factory for {@link CursorAgentProvider}.
 */
export function createCursorAgentProvider(
  manifest: PackageManifest,
  bundlePathMap?: Record<string, string>
): CursorAgentProvider {
  return new CursorAgentProvider(manifest, bundlePathMap);
}
