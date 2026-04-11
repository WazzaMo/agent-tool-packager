/**
 * Op **10** — validate or normalise `${…}`-style placeholders in JSON config strings (MCP, hooks).
 */

/**
 * @param s - String scanned for `${` … `}` segments.
 * @returns Error message, or `null` when no structural issue.
 */
export function validateInterpolationPlaceholdersInString(s: string): string | null {
  let i = 0;
  while (i < s.length) {
    const open = s.indexOf("${", i);
    if (open < 0) {
      return null;
    }
    const close = s.indexOf("}", open + 2);
    if (close < 0) {
      return "unclosed ${…} placeholder in config string";
    }
    const inner = s.slice(open + 2, close);
    if (inner.trim() === "") {
      return "empty ${} placeholder in config string";
    }
    i = close + 1;
  }
  return null;
}

/**
 * Collect validation messages for every string leaf in a JSON-like tree.
 *
 * @param value - Parsed JSON root.
 * @param pathPrefix - Dot/bracket path for error messages.
 */
export function collectInterpolationIssuesInJson(
  value: unknown,
  pathPrefix = ""
): string[] {
  const issues: string[] = [];
  const label = (key: string) => (pathPrefix ? `${pathPrefix}.${key}` : key);

  if (typeof value === "string") {
    const err = validateInterpolationPlaceholdersInString(value);
    if (err) {
      issues.push(`${pathPrefix || "(root)"}: ${err}`);
    }
    return issues;
  }
  if (Array.isArray(value)) {
    value.forEach((item, idx) => {
      issues.push(...collectInterpolationIssuesInJson(item, `${pathPrefix}[${idx}]`));
    });
    return issues;
  }
  if (value !== null && typeof value === "object") {
    for (const k of Object.keys(value as Record<string, unknown>)) {
      issues.push(
        ...collectInterpolationIssuesInJson(
          (value as Record<string, unknown>)[k],
          label(k)
        )
      );
    }
  }
  return issues;
}

/**
 * VS Code / Cursor deprecated `workspaceRoot` in favour of `workspaceFolder`.
 */
export function normalizeWorkspaceVariableString(s: string): string {
  return s.replace(/\$\{workspaceRoot\}/g, "${workspaceFolder}");
}

/**
 * Deep-clone JSON-like value while applying {@link normalizeWorkspaceVariableString} to every string leaf.
 *
 * @returns Cloned tree and whether any string changed.
 */
export function normalizeWorkspaceVariablesInJson(value: unknown): {
  doc: unknown;
  changed: boolean;
} {
  let changed = false;

  function walk(v: unknown): unknown {
    if (typeof v === "string") {
      const n = normalizeWorkspaceVariableString(v);
      if (n !== v) {
        changed = true;
      }
      return n;
    }
    if (Array.isArray(v)) {
      return v.map(walk);
    }
    if (v !== null && typeof v === "object") {
      const o = v as Record<string, unknown>;
      const next: Record<string, unknown> = {};
      for (const k of Object.keys(o)) {
        next[k] = walk(o[k]);
      }
      return next;
    }
    return v;
  }

  return { doc: walk(value), changed };
}
