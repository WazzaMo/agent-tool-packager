/**
 * Remove package from project Safehouse.
 * Deletes from manifest, binaries/share, and agent skill/rule copies.
 */

import fs from "node:fs";
import path from "node:path";

import { resolveAgentProjectPath } from "../config/agent-path.js";
import {
  assignedSafehouseAgentName,
  formatSafehouseAgentNotAssignedMessage,
} from "../config/safehouse-agent.js";
import {
  safehouseExists,
  loadSafehouseConfig,
  loadStationConfig,
} from "../config/load.js";
import {
  loadPackageConfigJournalEntries,
  rollbackMergedConfigJournal,
} from "../config/config-merge-journal.js";
import { getSafehousePath } from "../config/paths.js";
import {
  loadSafehouseManifest,
  removePackageFromSafehouseManifest,
} from "../config/safehouse-manifest.js";
import {
  resolvePackage,
  resolvePackagePath,
  loadPackageManifest,
} from "../install/resolve.js";

import { removeAgentCopies } from "./safehouse-remove-agent-assets.js";
import { removeUserBinariesIfUnused } from "./safehouse-remove-user-bin.js";

/** Outcome of {@link removeSafehousePackageWithResult} when removal fails. */
export type RemoveSafehouseFailureCode =
  | "no_safehouse"
  | "not_installed"
  | "agent_not_assigned";

export type RemoveSafehousePackageResult =
  | { ok: true }
  | { ok: false; code: RemoveSafehouseFailureCode; message: string };

/**
 * Remove project-scoped `share/`, `etc/`, and named binary under the Safehouse tree.
 *
 * @param safehousePath - Path to `.atp_safehouse`.
 * @param utility - Package name used as subdirectory / binary stem.
 */
function removeSafehouseBinariesAndShare(safehousePath: string, utility: string): void {
  const shareDir = path.join(safehousePath, "share", utility);
  const etcDir = path.join(safehousePath, "etc", utility);
  const binDir = path.join(safehousePath, "bin");

  if (fs.existsSync(shareDir)) {
    fs.rmSync(shareDir, { recursive: true });
  }
  if (fs.existsSync(etcDir)) {
    fs.rmSync(etcDir, { recursive: true });
  }

  const binFile = path.join(binDir, utility);
  if (fs.existsSync(binFile) && fs.statSync(binFile).isFile()) {
    fs.unlinkSync(binFile);
  }
}

/**
 * Remove a package from the project Safehouse manifest and clean up installed files.
 *
 * @param pkgName - Package name as recorded in the manifest.
 * @param cwd - Project base directory; defaults to `process.cwd()`.
 * @returns Success or a structured failure (no `process.exit`).
 */
export function removeSafehousePackageWithResult(
  pkgName: string,
  cwd: string = process.cwd()
): RemoveSafehousePackageResult {
  if (!safehouseExists(cwd)) {
    return {
      ok: false,
      code: "no_safehouse",
      message: "No Safehouse found. Run `atp safehouse init` first.",
    };
  }

  const manifest = loadSafehouseManifest(cwd);
  const packages = manifest?.packages ?? [];
  const found = packages.find((p) => p.name === pkgName);

  if (!found) {
    return {
      ok: false,
      code: "not_installed",
      message: `Package ${pkgName} is not installed in this Safehouse.`,
    };
  }

  const safehousePath = getSafehousePath(cwd);
  const stationConfig = loadStationConfig();
  const shConfig = loadSafehouseConfig(cwd);
  const agentName = assignedSafehouseAgentName(shConfig);
  if (!agentName) {
    return {
      ok: false,
      code: "agent_not_assigned",
      message: formatSafehouseAgentNotAssignedMessage(),
    };
  }
  const agentBaseForJournal = path.join(cwd, resolveAgentProjectPath(agentName, stationConfig));

  let skipMcpHooksFragmentStrip = false;
  if (found.config_journal_path) {
    const journalEntries = loadPackageConfigJournalEntries(
      safehousePath,
      found.config_journal_path
    );
    if (journalEntries.length > 0) {
      const warnings = rollbackMergedConfigJournal(
        agentBaseForJournal,
        path.resolve(cwd),
        journalEntries
      );
      for (const w of warnings) {
        console.warn(w);
      }
      skipMcpHooksFragmentStrip = true;
    }
  }

  const catalogPkg = resolvePackage(pkgName, cwd);
  if (catalogPkg) {
    const pkgDir = resolvePackagePath(catalogPkg.location, cwd);
    if (pkgDir) {
      const pkgManifest = loadPackageManifest(pkgDir);
      if (pkgManifest?.assets) {
        removeAgentCopies(
          cwd,
          pkgName,
          pkgManifest.assets,
          pkgDir,
          skipMcpHooksFragmentStrip
        );
      }
    }
  } else {
    console.warn(
      `Package ${pkgName} not found in catalog; skipping skill/rule cleanup.`
    );
  }

  if (found.binary_scope === "user-bin") {
    removeUserBinariesIfUnused(pkgName, cwd);
  } else if (found.binary_scope === "project-bin") {
    removeSafehouseBinariesAndShare(safehousePath, pkgName);
  } else {
    removeUserBinariesIfUnused(pkgName, cwd);
    removeSafehouseBinariesAndShare(safehousePath, pkgName);
  }

  removePackageFromSafehouseManifest(pkgName, cwd);

  console.log(`Removed ${pkgName} from Safehouse.`);
  return { ok: true };
}

/**
 * Remove a package from the project Safehouse manifest and clean up installed files.
 *
 * @param pkgName - Package name as recorded in the manifest.
 * @param cwd - Project base directory; defaults to `process.cwd()`.
 */
export function removeSafehousePackage(pkgName: string, cwd: string = process.cwd()): void {
  const r = removeSafehousePackageWithResult(pkgName, cwd);
  if (!r.ok) {
    console.error(r.message);
    process.exit(1);
  }
}
