/**
 * Stable HTML-comment markers for ATP-managed regions in aggregate markdown (op **4**).
 */

import { createHash } from "node:crypto";

/**
 * Deterministic 16-hex id from package + fragment so markers stay stable across re-installs.
 *
 * @param packageName - Catalog package name.
 * @param fragmentKey - Unique key for this fragment (e.g. `rules/doc.md` under the agent layer).
 */
function managedBlockId(packageName: string, fragmentKey: string): string {
  return createHash("sha256")
    .update(`${packageName}\0${fragmentKey}`, "utf8")
    .digest("hex")
    .slice(0, 16);
}

/**
 * HTML comment begin/end pair; safe inside markdown and unlikely to collide with user prose.
 *
 * @param packageName - Installed package name.
 * @param fragmentKey - Distinguishes multiple rules from one package (e.g. posix path under layer).
 */
export function atpManagedBlockMarkers(
  packageName: string,
  fragmentKey: string
): { begin: string; end: string } {
  const id = managedBlockId(packageName, fragmentKey);
  return {
    begin: `<!-- ATP_MGR_${id}_BEGIN -->`,
    end: `<!-- ATP_MGR_${id}_END -->`,
  };
}
