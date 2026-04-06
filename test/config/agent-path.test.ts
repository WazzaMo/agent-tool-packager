/**
 * Unit tests for agent path resolution.
 * Acceptance: Agent nomination uses project_path from config or default .{agent}/
 */

import path from "node:path";
import os from "node:os";
import { describe, it, expect } from "vitest";

import {
  isAgentInStationConfig,
  resolveAgentHomePath,
  resolveAgentProjectPath,
} from "../../src/config/agent-path.js";
import type { StationConfig } from "../../src/config/station-config.js";

describe("isAgentInStationConfig", () => {
  it("returns true when agent has entry in agent-paths", () => {
    const config: StationConfig = {
      configuration: {
        version: "0.1.0",
        "agent-paths": {
          cursor: { project_path: ".cursor/" },
        },
      },
    };
    expect(isAgentInStationConfig("cursor", config)).toBe(true);
  });

  it("returns false when agent not in agent-paths", () => {
    const config: StationConfig = {
      configuration: {
        version: "0.1.0",
        "agent-paths": { cursor: { project_path: ".cursor/" } },
      },
    };
    expect(isAgentInStationConfig("unknown-agent", config)).toBe(false);
  });

  it("returns false when agent-paths is empty", () => {
    const config: StationConfig = {
      configuration: {
        version: "0.1.0",
        "agent-paths": {},
      },
    };
    expect(isAgentInStationConfig("cursor", config)).toBe(false);
  });

  it("returns false when station config is null", () => {
    expect(isAgentInStationConfig("cursor", null)).toBe(false);
  });
});

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

describe("resolveAgentHomePath", () => {
  it("expands ~/.cursor/ under the real home directory", () => {
    expect(resolveAgentHomePath("cursor", null)).toBe(
      path.normalize(path.join(os.homedir(), ".cursor"))
    );
  });

  it("uses station override when home_path is set", () => {
    const config: StationConfig = {
      configuration: {
        version: "0.1.0",
        "agent-paths": {
          cursor: { project_path: ".cursor/", home_path: "~/.atp-test-cursor/" },
        },
        "standard-catalog": { url: "https://example.com/" },
      },
    };
    expect(resolveAgentHomePath("cursor", config)).toBe(
      path.normalize(path.join(os.homedir(), ".atp-test-cursor"))
    );
  });
});
