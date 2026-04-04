/**
 * Dispatch `atp package part …` tokens to part-ops implementations.
 */

import {
  packagePartAddUsage,
  packagePartBundleAdd,
  packagePartBundleRemove,
  packagePartComponentAdd,
  packagePartComponentRemove,
  packagePartRemove,
  packagePartUsage,
} from "../../package/part-ops.js";

/**
 * @param cwd - Package directory.
 * @param index - Part index string from argv.
 * @param subcommand - Second token (`usage`, `component`, `bundle`).
 * @param extra - Remaining argv tokens.
 * @param execFilter - From `--exec-filter` when adding a bundle.
 */
export function dispatchPackagePartCommand(
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
