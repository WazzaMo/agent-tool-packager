/**
 * Vitest configuration for ATP tests.
 *
 * Two projects run in parallel:
 * - **unit** — `pool: threads`, all unit test files under `test/` except `test/integration` (user-home cases mock `os.homedir`).
 * - **integration** — `pool: forks` for subprocess CLI isolation (`node dist/atp.js`).
 *
 * Tune: `VITEST_MAX_WORKERS`, `vitest run --max-workers=N`, or `vitest run --shard=i/n` in CI.
 */

import os from "node:os";
import path from "node:path";

import { defineConfig } from "vitest/config";

const cpus = os.availableParallelism();
/**
 * Vitest requires the same `maxWorkers` for projects that share a `sequence.groupOrder` (default 0).
 */
const maxWorkers = Math.min(32, Math.max(4, cpus));

export default defineConfig({
  resolve: {
    alias: {
      "#test-fixtures": path.resolve(__dirname, "test/fixtures"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          pool: "threads",
          maxWorkers,
          fileParallelism: true,
          include: ["test/**/*.test.ts"],
          exclude: ["test/integration/**"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          pool: "forks",
          maxWorkers,
          fileParallelism: true,
          include: ["test/integration/**/*.test.ts"],
        },
      },
    ],
  },
});
