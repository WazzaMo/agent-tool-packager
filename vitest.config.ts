/**
 * Vitest configuration for ATP tests.
 *
 * Three projects run in parallel (Vitest default):
 * - **unit** — `pool: threads` for fast startup; excludes integration and files that mutate `HOME` / heavy env.
 * - **unit-env** — `pool: forks` for `claude-agent-provider` + `config-merge-journal` (reliable `process.env.HOME` + `os.homedir()`).
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
 * Using one value keeps all three projects in one parallel wave.
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
          exclude: [
            "test/integration/**",
            "test/provider/claude-agent-provider.test.ts",
            "test/config/config-merge-journal.test.ts",
          ],
        },
      },
      {
        extends: true,
        test: {
          name: "unit-env",
          pool: "forks",
          maxWorkers,
          fileParallelism: true,
          include: [
            "test/provider/claude-agent-provider.test.ts",
            "test/config/config-merge-journal.test.ts",
          ],
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
