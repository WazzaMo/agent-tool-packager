/**
 * Unit tests for catalog merge.
 * Acceptance: Catalog precedence project overrides user overrides global (AGENTS.md).
 */

import { describe, it, expect } from "vitest";
import { mergeCatalogs } from "../../src/catalog/merge.js";
import type { Catalog, CatalogPackage } from "../../src/catalog/types.js";

function catalog(...packages: CatalogPackage[]): Catalog {
  return { packages };
}

describe("mergeCatalogs", () => {
  it("returns empty when all catalogs empty", () => {
    const result = mergeCatalogs(catalog(), catalog(), catalog());
    expect(result).toEqual([]);
  });

  it("merges packages from all sources", () => {
    const global = catalog({ name: "global-pkg", version: "1.0.0" });
    const user = catalog({ name: "user-pkg", version: "2.0.0" });
    const project = catalog({ name: "project-pkg", version: "3.0.0" });
    const result = mergeCatalogs(global, user, project);
    expect(result).toHaveLength(3);
    expect(result.map((p) => p.name)).toContain("global-pkg");
    expect(result.map((p) => p.name)).toContain("user-pkg");
    expect(result.map((p) => p.name)).toContain("project-pkg");
  });

  it("project overrides user for same package name", () => {
    const global = catalog({ name: "pkg", version: "1.0.0", description: "global" });
    const user = catalog({ name: "pkg", version: "2.0.0", description: "user" });
    const project = catalog({ name: "pkg", version: "3.0.0", description: "project" });
    const result = mergeCatalogs(global, user, project);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ name: "pkg", version: "3.0.0", description: "project" });
  });

  it("user overrides global for same package name", () => {
    const global = catalog({ name: "pkg", version: "1.0.0" });
    const user = catalog({ name: "pkg", version: "2.0.0" });
    const project = catalog();
    const result = mergeCatalogs(global, user, project);
    expect(result).toHaveLength(1);
    expect(result[0].version).toBe("2.0.0");
  });
});
