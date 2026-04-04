/**
 * Invalid inputs for rule assembly (operation {@link OperationIds.RuleAssembly}).
 */

import type { OperationId } from "../operation-ids.js";
import { OperationIds } from "../operation-ids.js";

/** Thrown when YAML or body inputs cannot produce a valid Cursor `.mdc` file. */
export class RuleAssemblyInvalidInputError extends Error {
  readonly code = "RULE_ASSEMBLY_INVALID_INPUT" as const;

  readonly operationId: OperationId = OperationIds.RuleAssembly;

  constructor(message: string) {
    super(message);
    this.name = "RuleAssemblyInvalidInputError";
  }
}
