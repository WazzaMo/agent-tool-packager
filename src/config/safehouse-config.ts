/**
 * Safehouse configuration types and defaults.
 * See docs/features/1-package-definition-and-installation.md.
 */

import type { SafehouseConfig, SafehouseManifest } from "./types.js";

/** Default `.atp_safehouse/atp-config.yaml` before an agent is assigned. */
export const DEFAULT_SAFEHOUSE_CONFIG: SafehouseConfig = {
  agent: null,
  station_path: null,
};

/** Empty in-memory manifest used when creating a new Safehouse. */
export const DEFAULT_SAFEHOUSE_MANIFEST: SafehouseManifest = {
  packages: [],
  station_path: null,
};
