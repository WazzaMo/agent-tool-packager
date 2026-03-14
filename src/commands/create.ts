/**
 * Create subcommands: atp create package skeleton
 */

import type { Command } from "commander";
import { createPackageSkeleton } from "../package/create-skeleton.js";

export function registerCreateCommands(program: Command): void {
  const create = program
    .command("create")
    .description("Create new ATP artifacts");

  create
    .command("package skeleton")
    .description("Create an empty atp-package.yaml to start building a package")
    .action(() => {
      createPackageSkeleton(process.cwd());
    });
}
