/**
 * Unit tests: {@link applyRawFileCopyAction} directory trees vs single files.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import type { InstallContext } from "../../src/file-ops/install-context.js";
import { OperationIds } from "../../src/file-ops/operation-ids.js";
import { applyRawFileCopyAction } from "../../src/provider/apply-provider-plan-base.js";

describe("applyRawFileCopyAction", () => {
  let tmp: string;
  let projectRoot: string;
  let layerRoot: string;
  let srcDir: string;

  beforeEach(() => {
    tmp = path.join(os.tmpdir(), `atp-rawcopy-${Date.now()}`);
    projectRoot = path.join(tmp, "proj");
    layerRoot = path.join(projectRoot, ".cursor");
    srcDir = path.join(tmp, "src-tree");
    fs.mkdirSync(path.join(srcDir, "nested"), { recursive: true });
    fs.writeFileSync(path.join(srcDir, "a.txt"), "A");
    fs.writeFileSync(path.join(srcDir, "nested", "b.txt"), "B");
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  function ctx(): InstallContext {
    return {
      agent: "cursor",
      layer: "project",
      projectRoot,
      layerRoot,
      stagingDir: path.join(tmp, "staging"),
    };
  }

  const prov = { packageName: "p", fragmentKey: "hooks/x" } as const;

  it("throws when source is a directory without recursiveDirectorySource", () => {
    expect(() =>
      applyRawFileCopyAction(ctx(), {
        kind: "raw_file_copy",
        operationId: OperationIds.TreeMaterialise,
        provenance: prov,
        relativeTargetPath: "hooks/pkg",
        sourceAbsolutePath: srcDir,
        destinationRoot: "layer",
      })
    ).toThrow(/recursiveDirectorySource/);
  });

  it("copies a full directory tree when recursiveDirectorySource is true", () => {
    applyRawFileCopyAction(ctx(), {
      kind: "raw_file_copy",
      operationId: OperationIds.TreeMaterialise,
      provenance: prov,
      relativeTargetPath: "hooks/my-pkg",
      sourceAbsolutePath: srcDir,
      destinationRoot: "layer",
      recursiveDirectorySource: true,
    });
    const a = path.join(layerRoot, "hooks", "my-pkg", "a.txt");
    const b = path.join(layerRoot, "hooks", "my-pkg", "nested", "b.txt");
    expect(fs.readFileSync(a, "utf8")).toBe("A");
    expect(fs.readFileSync(b, "utf8")).toBe("B");
  });
});
