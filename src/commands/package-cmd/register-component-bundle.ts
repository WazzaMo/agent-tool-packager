/**
 * Register `package component` and `package bundle` subcommands.
 */

import { type Command } from "commander";

import { bundleAdd } from "../../package/bundle-add.js";
import { bundleRemove } from "../../package/bundle-remove.js";
import { componentAdd } from "../../package/component-add.js";
import { componentRemove } from "../../package/component-remove.js";

export function registerPackageComponentAndBundleCommands(pkg: Command): void {
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
