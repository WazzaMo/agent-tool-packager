/**
 * Build op **4** actions for project-root aggregate markdown (`GEMINI.md`, `CLAUDE.md`, `AGENTS.md`).
 */

import { OperationIds } from "../file-ops/operation-ids.js";
import { atpManagedBlockMarkers } from "../file-ops/markdown-merge/atp-managed-block-markers.js";

import type { StagedPartInstallInput } from "../file-ops/part-install-input.js";

import type { MarkdownManagedBlockPatchAction } from "./provider-dtos.js";
import { provenanceForFragment } from "./provider-plan-common.js";

/** Which agent’s aggregate filename and rule link prefix to use. */
export type ProjectAggregateAgentKind = "gemini" | "claude" | "codex";

const AGGREGATE_FILE: Record<ProjectAggregateAgentKind, string> = {
  gemini: "GEMINI.md",
  claude: "CLAUDE.md",
  codex: "AGENTS.md",
};

const LAYER_PREFIX: Record<ProjectAggregateAgentKind, string> = {
  gemini: ".gemini",
  claude: ".claude",
  codex: ".codex",
};

/**
 * One managed block pointing at an installed rule under the agent layer (posix paths).
 *
 * @param opts.agent - Selects aggregate filename and `.gemini` / `.claude` / `.codex` link prefix.
 * @param opts.ruleRelativeUnderLayer - e.g. `rules/doc.md` under the layer root.
 * @param opts.ruleBasename - File name for display (e.g. `doc.md`).
 */
export function markdownManagedBlockForInstalledRule(opts: {
  agent: ProjectAggregateAgentKind;
  packageName: string | undefined;
  packageVersion: string | undefined;
  part: StagedPartInstallInput;
  ruleRelativeUnderLayer: string;
  ruleBasename: string;
}): MarkdownManagedBlockPatchAction {
  const { agent, packageName, packageVersion, part, ruleRelativeUnderLayer, ruleBasename } = opts;
  const pkg = packageName ?? "package";
  const fileName = AGGREGATE_FILE[agent];
  const layerDot = LAYER_PREFIX[agent];
  const linkTarget = `./${layerDot}/${ruleRelativeUnderLayer}`;
  const fragKey = ruleRelativeUnderLayer.replace(/\\/g, "/");
  const { begin, end } = atpManagedBlockMarkers(pkg, fragKey);
  const ver = packageVersion ? ` ${packageVersion}` : "";
  const body = `- **${pkg}**${ver}: installed rule [\`${ruleBasename}\`](${linkTarget})`;

  return {
    kind: "markdown_managed_block_patch",
    operationId: OperationIds.MarkdownAggregate,
    provenance: provenanceForFragment(packageName, packageVersion, part, `aggregate:${fileName}:${fragKey}`),
    relativeTargetPath: fileName,
    destinationRoot: "project",
    beginMarker: begin,
    endMarker: end,
    body,
    ifMissing: "append_to_file",
    encoding: "utf-8",
  };
}
