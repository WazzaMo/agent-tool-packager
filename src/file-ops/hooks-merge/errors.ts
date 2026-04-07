/**
 * Merge failures for Cursor-style `hooks.json` documents.
 */

/**
 * A hook handler with the same dedupe identity (`id` or JSON shape) already exists
 * but its configuration differs. Aligns with MCP merge: use `--force-config` to
 * overwrite or `--skip-config` to leave the file unchanged.
 */
export class HooksMergeAmbiguousError extends Error {
  readonly code = "HOOKS_MERGE_AMBIGUOUS" as const;

  readonly eventName: string;

  readonly dedupeKey: string;

  readonly existingHandler: unknown;

  readonly incomingHandler: unknown;

  constructor(
    eventName: string,
    dedupeKey: string,
    existingHandler: unknown,
    incomingHandler: unknown
  ) {
    super(
      `Hook handler for event "${eventName}" (${dedupeKey}) already exists with different configuration; ` +
        `use --force-config to overwrite or --skip-config to leave hooks.json unchanged.`
    );
    this.name = "HooksMergeAmbiguousError";
    this.eventName = eventName;
    this.dedupeKey = dedupeKey;
    this.existingHandler = existingHandler;
    this.incomingHandler = incomingHandler;
  }
}
