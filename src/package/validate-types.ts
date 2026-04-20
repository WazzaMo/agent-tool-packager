/**
 * Shared validation result type for single-type and multi-type package checks.
 */

/** Outcome of validating `atp-package.yaml` and `stage.tar`. */
export interface ValidateResult {
  /** True when the package satisfies mandatory rules for its layout. */
  ok: boolean;
  /** CLI exit code: 0 success, 1 staging/optional gaps, 2 mandatory gaps. */
  exitCode: 0 | 1 | 2;
  /** Human-readable missing items (empty when ok). */
  missing: string[];
  /** Summary message for logs or errors. */
  message: string;
}
