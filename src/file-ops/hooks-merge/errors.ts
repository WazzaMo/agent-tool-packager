/**
 * Merge failures for Cursor-style `hooks.json` documents.
 */

/**
 * A hook handler with the same dedupe identity (`id` or JSON shape) already exists
 * but its configuration differs. Aligns with MCP merge: use `--force-config` or `--skip-config`.
 */
export class HooksMergeAmbiguousError extends Error {
  readonly code = "HOOKS_MERGE_AMBIGUOUS" as const;

  readonly eventName: string;

  readonly dedupeKey: string;

  /** Human-readable target (e.g. `.cursor/hooks.json`); used in message and CLI `--verbose`. */
  readonly mergeTargetLabel: string;

  readonly existingHandler: unknown;

  readonly incomingHandler: unknown;

  constructor(
    eventName: string,
    dedupeKey: string,
    existingHandler: unknown,
    incomingHandler: unknown,
    mergeTargetLabel = "the merged configuration file"
  ) {
    const label = mergeTargetLabel;
    super(
      `Hook handler for event "${eventName}" (${dedupeKey}) conflicts with existing entry in ${label}; ` +
        `use --force-config to replace it or --skip-config to skip this merge.`
    );
    this.name = "HooksMergeAmbiguousError";
    this.eventName = eventName;
    this.dedupeKey = dedupeKey;
    this.mergeTargetLabel = label;
    this.existingHandler = existingHandler;
    this.incomingHandler = incomingHandler;
  }
}
