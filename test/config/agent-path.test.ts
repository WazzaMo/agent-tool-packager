/**
 * Unit tests for agent path resolution.
 * Acceptance: Agent nomination uses project_path from config or default .{agent}/
 */

import { describe, it, expect } from "vitest";
import { resolveAgentProjectPath } from "../../src/config/agent-path.js";
import type { StationConfig } from "../../src/config/station-config.js";

describe("resolveAgentProjectPath", () => {
  it("returns project_path when configured", () => {
    const config: StationConfig = {
      configuration: {
        version: "0.1.0",
        "agent-paths": {
          cursor: { project_path: ".cursor/" },
        },
      },
    };
    expect(resolveAgentProjectPath("cursor", config)).toBe(".cursor/");
  });

  it("returns default .{agent}/ when project_path not configured", () => {
    const config: StationConfig = {
      configuration: {
        version: "0.1.0",
        "agent-paths": {
          claude: { home_path: "~/.claude" },
        },
      },
    };
    expect(resolveAgentProjectPath("claude", config)).toBe(".claude/");
  });

  it("returns default .{agent}/ when config is null", () => {
    expect(resolveAgentProjectPath("cursor", null)).toBe(".cursor/");
  });

  it("returns default for unknown agent", () => {
    const config: StationConfig = {
      configuration: {
        version: "0.1.0",
        "agent-paths": { cursor: { project_path: ".cursor/" } },
      },
    };
    expect(resolveAgentProjectPath("unknown-agent", config)).toBe(".unknown-agent/");
  });
});
