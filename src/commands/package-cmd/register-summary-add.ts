/**
 * Register `package summary` and `package add …` commands.
 */

import { type Command } from "commander";

import { isMultiDevManifest } from "../../package/manifest-layout.js";
import { packageSummary } from "../../package/package-summary.js";
import { saveDevManifest } from "../../package/save-manifest.js";

import { loadDevManifestOrExit } from "./manifest-load.js";

export function registerPackageSummaryAndAddCommands(pkg: Command): void {
  pkg
    .command("summary")
    .description("Print package summary and missing fields")
    .action(() => {
      packageSummary(process.cwd());
    });

  pkg
    .command("add <what> <values...>")
    .description("Add to list (e.g. add copyright 'line2')")
    .action((what: string, ...rest: unknown[]) => {
      const m = loadDevManifestOrExit(process.cwd());
      const raw = Array.isArray(rest[0]) ? (rest[0] as unknown[]) : rest;
      const vals = raw
        .filter((a): a is string => typeof a === "string")
        .map((s) => String(s).slice(0, 80));
      if (what === "copyright") {
        const existing = m.copyright ?? [];
        m.copyright = [...existing, ...vals];
      } else if (what === "usage") {
        if (isMultiDevManifest(m)) {
          console.error("Multi package: use `atp package part <n> usage` instead.");
          process.exit(1);
        }
        const existing = m.usage ?? [];
        m.usage = [...existing, ...vals];
      } else {
        console.error(`Unknown add target: ${what}. Use 'copyright' or 'usage'.`);
        process.exit(1);
      }
      saveDevManifest(process.cwd(), m);
    });
}
