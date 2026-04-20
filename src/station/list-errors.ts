/**
 * Errors for Station list when manifest files cannot be parsed.
 */

/** Station `manifest/*.yaml` (or JSON) failed to parse; CLI should exit 2. */
export class StationManifestParseError extends Error {
  constructor(message = "Manifest parse error") {
    super(message);
    this.name = "StationManifestParseError";
  }
}
