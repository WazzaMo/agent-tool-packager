/**
 * Register scalar and list field commands: name, version, usage, developer, copyright, license.
 */

import { type Command } from "commander";

import { isMultiDevManifest } from "../../package/manifest-layout.js";
import { saveDevManifest } from "../../package/save-manifest.js";

import { loadDevManifestOrExit } from "./manifest-load.js";

function sliceCliString(s: string): string {
  return s.slice(0, 80);
}

export function registerPackageFieldCommands(pkg: Command): void {
  pkg
    .command("name <name>")
    .description("Set package name")
    .action((name: string) => {
      const m = loadDevManifestOrExit(process.cwd());
      m.name = sliceCliString(name);
      saveDevManifest(process.cwd(), m);
    });

  pkg
    .command("version <ver>")
    .description("Set package version")
    .action((ver: string) => {
      const m = loadDevManifestOrExit(process.cwd());
      m.version = sliceCliString(ver);
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
      m.developer = sliceCliString(name);
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
      m.copyright = lines.map((s) => sliceCliString(String(s)));
      saveDevManifest(process.cwd(), m);
    });

  pkg
    .command("license <license>")
    .description("Set package license")
    .action((license: string) => {
      const m = loadDevManifestOrExit(process.cwd());
      m.license = sliceCliString(license);
      saveDevManifest(process.cwd(), m);
    });
}
