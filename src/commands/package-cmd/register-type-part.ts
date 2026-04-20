/**
 * Register `package type`, `newpart`, and `package part …` Commander commands.
 */

import { type Command } from "commander";

import {
  isMultiDevManifest,
  keywordToPackageType,
} from "../../package/manifest-layout.js";
import { packageNewpart } from "../../package/part-ops.js";
import { saveDevManifest } from "../../package/save-manifest.js";

import { loadDevManifestOrExit } from "./manifest-load.js";
import { dispatchPackagePartCommand } from "./part-dispatch.js";

export function registerPackageTypeAndPartCommands(pkg: Command): void {
  pkg
    .command("type <typename>")
    .description("Set package type: rule, prompt, skill, hook, mcp, shell, other, multi")
    .action((typename: string) => {
      const m = loadDevManifestOrExit(process.cwd());
      const t = typename.toLowerCase();
      if (isMultiDevManifest(m) && (m.parts?.length ?? 0) > 0) {
        console.error(
          "Cannot change root type while parts exist. Use `atp package newpart` for Multi packages."
        );
        process.exit(1);
      }
      if (t === "multi") {
        m.type = "Multi";
        m.parts = m.parts ?? [];
        m.usage = [];
        m.components = [];
        m.bundles = undefined;
        saveDevManifest(process.cwd(), m);
        return;
      }
      const canonical = keywordToPackageType(typename) ?? "Rule";
      if (isMultiDevManifest(m) && (m.parts?.length ?? 0) === 0) {
        m.type = canonical;
        m.parts = undefined;
        m.usage = m.usage ?? [];
        m.components = m.components ?? [];
        m.bundles = undefined;
        saveDevManifest(process.cwd(), m);
        return;
      }
      m.type = canonical;
      saveDevManifest(process.cwd(), m);
    });

  pkg
    .command("newpart <typeKeyword>")
    .description("Add a part to a Multi-type package (rule, prompt, skill, hook, mcp, shell, other)")
    .action((typeKeyword: string) => {
      packageNewpart(process.cwd(), typeKeyword);
    });

  pkg
    .command("part")
    .description(
      "Multi-type: `part add <type>` (alias newpart), or `part <n> usage|add usage|component|bundle …`"
    )
    .option("--exec-filter <glob>", "With bundle add: executable glob when bundle has no bin/")
    .option("--skip-exec", "With bundle add: bundle has no executable programs")
    .argument("<tokens...>", "Tokens after `part`")
    .action(function (this: Command, tokens: string[]) {
      const cwd = process.cwd();
      const opts = this.opts() as { execFilter?: string; skipExec?: boolean };
      const t = tokens ?? [];
      if (t.length === 0) {
        console.error(
          "Usage: atp package part add <type> | part <n> usage <text…> | part <n> add usage <text…> | …"
        );
        process.exit(1);
      }
      if (t[0].toLowerCase() === "add" && t[1]) {
        packageNewpart(cwd, t[1]);
        return;
      }
      const index = t[0];
      const subcommand = t[1];
      if (!subcommand) {
        console.error("Missing subcommand after part index.");
        process.exit(1);
      }
      if (opts.execFilter && opts.skipExec) {
        console.error("Cannot use --skip-exec together with --exec-filter.");
        process.exit(1);
      }
      dispatchPackagePartCommand(cwd, index, subcommand, t.slice(2), {
        execFilter: opts.execFilter,
        skipExec: Boolean(opts.skipExec),
      });
    });
}
