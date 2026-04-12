/**
 * Safehouse agent assignment helpers.
 */

import { describe, it, expect } from "vitest";

import {
  assignedSafehouseAgentName,
  formatSafehouseAgentNotAssignedMessage,
  SafehouseAgentNotAssignedError,
} from "../../src/config/safehouse-agent.js";
import type { SafehouseConfig } from "../../src/config/types.js";

describe("assignedSafehouseAgentName", () => {
  it("returns null for null config", () => {
    expect(assignedSafehouseAgentName(null)).toBeNull();
  });

  it("returns null when agent is null", () => {
    const c: SafehouseConfig = { agent: null, station_path: null };
    expect(assignedSafehouseAgentName(c)).toBeNull();
  });

  it("returns null for blank or whitespace-only agent", () => {
    expect(
      assignedSafehouseAgentName({
        agent: "   ",
        station_path: null,
      })
    ).toBeNull();
    expect(
      assignedSafehouseAgentName({
        agent: "",
        station_path: null,
      })
    ).toBeNull();
  });

  it("returns trimmed non-empty agent", () => {
    expect(
      assignedSafehouseAgentName({
        agent: "  cursor  ",
        station_path: null,
      })
    ).toBe("cursor");
  });
});

describe("SafehouseAgentNotAssignedError", () => {
  it("message matches formatted helper", () => {
    const e = new SafehouseAgentNotAssignedError();
    expect(e.message).toBe(formatSafehouseAgentNotAssignedMessage());
    expect(e.name).toBe("SafehouseAgentNotAssignedError");
  });
});
