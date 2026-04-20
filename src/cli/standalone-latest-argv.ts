/**
 * Detect `atp --latest` (standalone) before Commander parses argv, so it does not
 * collide with subcommands or option ordering.
 */

/**
 * Whether argv should run the standalone `--latest` path and exit.
 *
 * @param argv - Typically `process.argv`.
 * @returns `true` when the only non-flag tokens are absent besides `--latest`.
 */
export function isStandaloneLatestArgv(argv: string[]): boolean {
  const rest = argv.slice(2);
  if (!rest.includes("--latest")) {
    return false;
  }
  if (rest.some((t) => t === "--help" || t === "-h")) {
    return false;
  }
  if (rest.some((t) => t === "--version" || t === "-V")) {
    return false;
  }
  for (const t of rest) {
    if (t === "--latest") {
      continue;
    }
    if (t.startsWith("-")) {
      continue;
    }
    return false;
  }
  return true;
}
