/**
 * Vitest configuration for AHQ tests.
 * Unit tests use isolated mocks; integration tests use temp dirs and STATION_PATH.
 */

import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    globals: true,
  },
  resolve: {
    alias: {
      "#test-fixtures": path.resolve(__dirname, "test/fixtures"),
    },
  },
});
