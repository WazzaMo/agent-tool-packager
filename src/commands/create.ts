/**
 * Create subcommands: `atp create package [skeleton]`.
 */

import { type Command } from "commander";
import { createPackageSkeleton } from "../package/create-skeleton.js";

/**
 * Run create-package flow from parsed subcommand and `--legacy` flag.
 *
 * @param subcommand - Optional `skeleton` token.
 * @param legacy - When true, write Feature 2 single-type skeleton.
 */
function runCreatePackageCommand(
  subcommand: string | undefined,
  legacy: boolean | undefined
): void {
  if (subcommand != null && subcommand !== "skeleton") {
    console.error(
      `Unknown subcommand '${subcommand}'. Use 'atp create package' or 'atp create package skeleton'.`
    );
    process.exit(1);
  }
  createPackageSkeleton(process.cwd(), { legacy: legacy ?? false });
}

/**
 * Register `create` commands.
 *
 * @param program - Root Commander program.
 */
export function registerCreateCommands(program: Command): void {
  const create = program
    .command("create")
    .description("Create new ATP artifacts");

  create
    .command("package [subcommand]")
    .option("--legacy", "Single-type skeleton with empty root type (Feature 2 flow)")
    .description("Create an empty atp-package.yaml (Multi-type by default). Use optional 'skeleton' subcommand.")
    .action(function (this: Command, subcommand?: string) {
      const opts = this.opts() as { legacy?: boolean };
      runCreatePackageCommand(subcommand, opts.legacy);
    });
}
