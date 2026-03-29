/**
 * Package subcommands: `atp package` developer manifest and staging helpers.
 */

import { type Command } from "commander";
import { loadDevManifest } from "../package/load-manifest.js";
import { saveDevManifest } from "../package/save-manifest.js";
import { componentAdd } from "../package/component-add.js";
import { componentRemove } from "../package/component-remove.js";
import { bundleAdd } from "../package/bundle-add.js";
import { bundleRemove } from "../package/bundle-remove.js";
import { packageSummary } from "../package/package-summary.js";
import {
  isMultiDevManifest,
  keywordToPackageType,
} from "../package/manifest-layout.js";
import {
  packageNewpart,
  packagePartAddUsage,
  packagePartBundleAdd,
  packagePartBundleRemove,
  packagePartComponentAdd,
  packagePartComponentRemove,
  packagePartRemove,
  packagePartUsage,
} from "../package/part-ops.js";

import type { DevPackageManifest } from "../package/types.js";

const MANIFEST_MISSING_MSG =
  "No atp-package.yaml. Run `atp create package skeleton` first.";

/**
 * Load developer manifest or print a standard error and exit.
 *
 * @param cwd - Package directory.
 * @returns Parsed manifest.
 */
function loadDevManifestOrExit(cwd: string): DevPackageManifest {
  const m = loadDevManifest(cwd);
  if (!m) {
    console.error(MANIFEST_MISSING_MSG);
    process.exit(1);
  }
  return m;
}

/**
 * Dispatch `part` subcommands (`usage`, `component`, `bundle add`).
 *
 * @param cwd - Package directory.
 * @param index - Part index string from argv.
 * @param subcommand - Second token (`usage`, `component`, `bundle`).
 * @param extra - Remaining argv tokens.
 * @param execFilter - From `--exec-filter` when adding a bundle.
 */
function dispatchPackagePartCommand(
  cwd: string,
  index: string,
  subcommand: string,
  extra: string[],
  execFilter: string | undefined
): void {
  const sub = subcommand.toLowerCase();
  const ex = extra ?? [];

  if (sub === "remove" && ex.length === 0) {
    packagePartRemove(cwd, index);
    return;
  }

  if (sub === "usage") {
    packagePartUsage(cwd, index, ex);
    return;
  }
  if (sub === "add" && (ex[0] ?? "").toLowerCase() === "usage") {
    packagePartAddUsage(cwd, index, ex.slice(1));
    return;
  }
  if (sub === "component") {
    if ((ex[0] ?? "").toLowerCase() === "remove") {
      const p = ex[1];
      if (!p) {
        console.error("Missing file path for component remove.");
        process.exit(1);
      }
      packagePartComponentRemove(cwd, index, p);
      return;
    }
    const p = ex[0];
    if (!p) {
      console.error("Missing file path for component.");
      process.exit(1);
    }
    packagePartComponentAdd(cwd, index, p);
    return;
  }
  if (sub === "bundle") {
    const a0 = (ex[0] ?? "").toLowerCase();
    if (a0 === "remove") {
      const execBase = ex[1];
      if (!execBase) {
        console.error("Expected: atp package part <n> bundle remove <execBase>");
        process.exit(1);
      }
      packagePartBundleRemove(cwd, index, execBase);
      return;
    }
    const execBase = ex[1];
    if (a0 !== "add" || !execBase) {
      console.error(
        "Expected: atp package part <n> bundle add <execBase> | bundle remove <execBase> [--exec-filter ...]"
      );
      process.exit(1);
    }
    packagePartBundleAdd(cwd, index, execBase, {
      execFilter,
    });
    return;
  }
  console.error(
    `Unknown part subcommand '${subcommand}'. Use remove, usage, add usage, component, or bundle.`
  );
  process.exit(1);
}

/**
 * Register `package` subcommands (manifest fields, parts, components, bundles).
 *
 * @param program - Root Commander program.
 */
export function registerPackageCommands(program: Command): void {
  const pkg = program
    .command("package")
    .description("Configure package properties (run from package directory)");

  pkg
    .command("type <typename>")
    .description("Set package type: rule, skill, mcp, shell, other, multi")
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
    .description("Add a part to a Multi-type package (rule, skill, mcp, shell, other)")
    .action((typeKeyword: string) => {
      packageNewpart(process.cwd(), typeKeyword);
    });

  pkg
    .command("part")
    .description(
      "Multi-type: `part add <type>` (alias newpart), or `part <n> usage|add usage|component|bundle …`"
    )
    .option("--exec-filter <glob>", "With bundle add: executable glob when bundle has no bin/")
    .argument("<tokens...>", "Tokens after `part`")
    .action(function (this: Command, tokens: string[]) {
      const cwd = process.cwd();
      const opts = this.opts() as { execFilter?: string };
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
      dispatchPackagePartCommand(cwd, index, subcommand, t.slice(2), opts.execFilter);
    });

  pkg
    .command("name <name>")
    .description("Set package name")
    .action((name: string) => {
      const m = loadDevManifestOrExit(process.cwd());
      m.name = name.slice(0, 80);
      saveDevManifest(process.cwd(), m);
    });

  pkg
    .command("version <ver>")
    .description("Set package version")
    .action((ver: string) => {
      const m = loadDevManifestOrExit(process.cwd());
      m.version = ver.slice(0, 80);
      saveDevManifest(process.cwd(), m);
    });

  pkg
    .command("usage <usage...>")
    .description("Set package usage (help text)")
    .action((...args: unknown[]) => {
      const m = loadDevManifestOrExit(process.cwd());
      if (isMultiDevManifest(m)) {
        console.error("Multi package: use `atp package part <n> usage <text>` for each part.");
        process.exit(1);
      }
      const raw = Array.isArray(args[0]) ? (args[0] as unknown[]) : args;
      const text = raw
        .filter((a): a is string => typeof a === "string")
        .join(" ")
        .slice(0, 80);
      m.usage = [text];
      saveDevManifest(process.cwd(), m);
    });

  pkg
    .command("developer <name>")
    .description("Set package developer (author)")
    .action((name: string) => {
      const m = loadDevManifestOrExit(process.cwd());
      m.developer = name.slice(0, 80);
      saveDevManifest(process.cwd(), m);
    });

  pkg
    .command("copyright <lines...>")
    .description("Set package copyright (overwrites)")
    .action((...args: unknown[]) => {
      const m = loadDevManifestOrExit(process.cwd());
      const lines = (Array.isArray(args[0]) ? args[0] : args).filter(
        (a): a is string => typeof a === "string"
      );
      m.copyright = lines.map((s) => String(s).slice(0, 80));
      saveDevManifest(process.cwd(), m);
    });

  pkg
    .command("license <license>")
    .description("Set package license")
    .action((license: string) => {
      const m = loadDevManifestOrExit(process.cwd());
      m.license = license.slice(0, 80);
      saveDevManifest(process.cwd(), m);
    });

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

  const component = pkg.command("component").description("Manage package components");
  component
    .command("add <paths...>")
    .description("Add file(s) as components to the package and stage.tar")
    .action((...args: unknown[]) => {
      const paths = args.flat(2).filter((a): a is string => typeof a === "string");
      for (const p of paths) {
        componentAdd(process.cwd(), p);
      }
    });
  component
    .command("remove <path>")
    .description("Remove a component from the package and stage.tar")
    .action((filePath: string) => {
      componentRemove(process.cwd(), filePath);
    });

  const bundle = pkg.command("bundle").description("Manage package bundles");
  bundle
    .command("add <execBase>")
    .description("Add a bundle (directory with bin/) to the package and stage.tar")
    .option("--exec-filter <glob>", "Path glob for executables when bundle has no bin/")
    .action((execBase: string, opts?: { execFilter?: string }) => {
      bundleAdd(process.cwd(), execBase, {
        execFilter: opts?.execFilter,
      });
    });
  bundle
    .command("remove <execBase>")
    .description("Remove a bundle from the package and stage.tar")
    .action((execBase: string) => {
      bundleRemove(process.cwd(), execBase);
    });
}
