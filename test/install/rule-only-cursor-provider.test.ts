/**
 * Unit tests: when catalog install uses CursorAgentProvider vs copy.
 */

import { describe, it, expect } from "vitest";

import {
  usesCursorAgentProviderProjectInstall,
  usesGeminiAgentProviderProjectInstall,
} from "../../src/install/rule-only-cursor-provider.js";
import type { PackageManifest } from "../../src/install/types.js";

function ctx(agent: "cursor" | "claude" | "gemini", layer: "project" | "user") {
  const layerRoot =
    agent === "gemini" ? "/p/.gemini" : agent === "cursor" ? "/p/.cursor" : "/p/.claude";
  return {
    agent,
    layer,
    projectRoot: "/p",
    layerRoot,
    stagingDir: "/s",
  };
}

describe("usesCursorAgentProviderProjectInstall", () => {
  const ruleManifest: PackageManifest = {
    name: "r",
    assets: [{ path: "a.md", type: "rule", name: "a" }],
  };

  const baseOpts = {
    promptScope: "project" as const,
    binaryScope: "user-bin" as const,
    dependencies: false,
  };

  it("is true for cursor + project layer + project scope + rule-only assets", () => {
    expect(usesCursorAgentProviderProjectInstall(ctx("cursor", "project"), ruleManifest, baseOpts)).toBe(
      true
    );
  });

  it("is true for skill-only cursor project install", () => {
    const skill: PackageManifest = {
      name: "s",
      assets: [{ path: "s.md", type: "skill", name: "s" }],
    };
    expect(usesCursorAgentProviderProjectInstall(ctx("cursor", "project"), skill, baseOpts)).toBe(true);
  });

  it("is true when only program assets (provider path + separate program copy)", () => {
    const prog: PackageManifest = {
      name: "p",
      assets: [{ path: "bin/x", type: "program", name: "x" }],
    };
    expect(usesCursorAgentProviderProjectInstall(ctx("cursor", "project"), prog, baseOpts)).toBe(true);
  });

  it("is false when agent is not cursor", () => {
    expect(usesCursorAgentProviderProjectInstall(ctx("claude", "project"), ruleManifest, baseOpts)).toBe(
      false
    );
  });

  it("is false when layer is user (e.g. station scope home root)", () => {
    expect(usesCursorAgentProviderProjectInstall(ctx("cursor", "user"), ruleManifest, baseOpts)).toBe(
      false
    );
  });

  it("is false when promptScope is station", () => {
    expect(
      usesCursorAgentProviderProjectInstall(ctx("cursor", "project"), ruleManifest, {
        ...baseOpts,
        promptScope: "station",
      })
    ).toBe(false);
  });

  it("is true for mixed rule + skill (non-program) assets", () => {
    const mixed: PackageManifest = {
      name: "m",
      assets: [
        { path: "a.md", type: "rule", name: "a" },
        { path: "b.md", type: "skill", name: "b" },
      ],
    };
    expect(usesCursorAgentProviderProjectInstall(ctx("cursor", "project"), mixed, baseOpts)).toBe(true);
  });

  it("is true when manifest includes mcp JSON assets", () => {
    const withMcp: PackageManifest = {
      name: "mc",
      assets: [{ path: "srv.json", type: "mcp", name: "srv" }],
    };
    expect(usesCursorAgentProviderProjectInstall(ctx("cursor", "project"), withMcp, baseOpts)).toBe(true);
  });

  it("is false when assets list is empty", () => {
    expect(
      usesCursorAgentProviderProjectInstall(ctx("cursor", "project"), { name: "e" }, baseOpts)
    ).toBe(false);
  });
});

describe("usesGeminiAgentProviderProjectInstall", () => {
  const ruleManifest: PackageManifest = {
    name: "r",
    assets: [{ path: "a.md", type: "rule", name: "a" }],
  };

  const baseOpts = {
    promptScope: "project" as const,
    binaryScope: "user-bin" as const,
    dependencies: false,
  };

  it("is true for gemini + project layer + project scope + supported assets", () => {
    expect(usesGeminiAgentProviderProjectInstall(ctx("gemini", "project"), ruleManifest, baseOpts)).toBe(
      true
    );
  });

  it("is false when agent is cursor", () => {
    expect(usesGeminiAgentProviderProjectInstall(ctx("cursor", "project"), ruleManifest, baseOpts)).toBe(
      false
    );
  });

  it("is false when layer is user", () => {
    expect(usesGeminiAgentProviderProjectInstall(ctx("gemini", "user"), ruleManifest, baseOpts)).toBe(
      false
    );
  });

  it("is true for mcp + hook manifest rows", () => {
    const manifest: PackageManifest = {
      name: "x",
      assets: [
        { path: "m.json", type: "mcp", name: "m" },
        { path: "hooks.json", type: "hook", name: "h" },
      ],
    };
    expect(usesGeminiAgentProviderProjectInstall(ctx("gemini", "project"), manifest, baseOpts)).toBe(
      true
    );
  });
});
