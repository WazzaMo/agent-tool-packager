/**
 * Package subcommands: atp package type, name, usage, component add, etc.
 */

import type { Command } from "commander";
import { loadDevManifest } from "../package/load-manifest.js";
import { saveDevManifest } from "../package/save-manifest.js";
import { componentAdd } from "../package/component-add.js";
import { bundleAdd } from "../package/bundle-add.js";

export function registerPackageCommands(program: Command): void {
  const pkg = program
    .command("package")
    .description("Configure package properties (run from package directory)");

  pkg
    .command("type <typename>")
    .description("Set package type: rule, skill, mcp, shell, other")
    .action((typename: string) => {
      const m = loadDevManifest(process.cwd());
      if (!m) {
        console.error("No atp-package.yaml. Run `atp create package skeleton` first.");
        process.exit(1);
      }
      const t = typename.toLowerCase();
      const typeMap: Record<string, string> = {
        rule: "Rule",
        skill: "Skill",
        mcp: "Mcp",
        shell: "Command",
        other: "Experimental",
      };
      m.type = typeMap[t] ?? "Rule";
      saveDevManifest(process.cwd(), m);
    });

  pkg
    .command("name <name>")
    .description("Set package name")
    .action((name: string) => {
      const m = loadDevManifest(process.cwd());
      if (!m) {
        console.error("No atp-package.yaml. Run `atp create package skeleton` first.");
        process.exit(1);
      }
      m.name = name.slice(0, 80);
      saveDevManifest(process.cwd(), m);
    });

  pkg
    .command("version <ver>")
    .description("Set package version")
    .action((ver: string) => {
      const m = loadDevManifest(process.cwd());
      if (!m) {
        console.error("No atp-package.yaml. Run `atp create package skeleton` first.");
        process.exit(1);
      }
      m.version = ver.slice(0, 80);
      saveDevManifest(process.cwd(), m);
    });

  pkg
    .command("usage <usage...>")
    .description("Set package usage (help text)")
    .action((...args: string[]) => {
      const m = loadDevManifest(process.cwd());
      if (!m) {
        console.error("No atp-package.yaml. Run `atp create package skeleton` first.");
        process.exit(1);
      }
      const text = args.join(" ").slice(0, 80);
      m.usage = [text];
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
}
