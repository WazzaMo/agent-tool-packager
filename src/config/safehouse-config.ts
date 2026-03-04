/**
 * Safehouse configuration types and defaults.
 * See docs/features/1-package-definition-and-installation.md
 */

import type { SafehouseConfig, SafehouseManifest } from "./types.js";

export const DEFAULT_SAFEHOUSE_CONFIG: SafehouseConfig = {
  agent: null,
  station_path: null,
};

export const DEFAULT_SAFEHOUSE_MANIFEST: SafehouseManifest = {
  packages: [],
  station_path: null,
};
