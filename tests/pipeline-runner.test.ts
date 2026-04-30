import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { describe, expect, it } from "vitest";

import { runPipeline } from "../src/core/pipeline-runner.js";

const tempRoot = path.join(process.cwd(), ".tmp-tests");

async function withTempProject(
  configSource: string,
  callback: (cwd: string) => Promise<void>
): Promise<void> {
  await mkdir(tempRoot, { recursive: true });
  const cwd = await mkdtemp(path.join(tempRoot, "commitlens-phase2-"));

  try {
    await writeFile(path.join(cwd, "commitlens.config.ts"), configSource, "utf8");
    await callback(cwd);
  } finally {
    await rm(cwd, { force: true, recursive: true });
  }
}

describe("runPipeline", () => {
  it("skips when config file is missing", async () => {
    await mkdir(tempRoot, { recursive: true });
    const cwd = await mkdtemp(path.join(tempRoot, "commitlens-phase2-empty-"));

    try {
      const result = await runPipeline("pre-commit", cwd);
      expect(result.shouldBlock).toBe(false);
      expect(result.counters).toEqual({ errors: 0, passed: 0, warnings: 0 });
    } finally {
      await rm(cwd, { force: true, recursive: true });
    }
  });

  it("continues when a non-blocking step fails", async () => {
    await withTempProject(
      `
      export default {
        hooks: {
          "pre-commit": {
            steps: [
              { name: "ok-step", type: "command", run: "node -e \\"process.exit(0)\\"", blocking: true },
              { name: "warn-step", type: "command", run: "node -e \\"process.exit(1)\\"", blocking: false },
              { name: "last-step", type: "command", run: "node -e \\"process.exit(0)\\"", blocking: true }
            ]
          }
        }
      };
      `,
      async (cwd) => {
        const result = await runPipeline("pre-commit", cwd);

        expect(result.shouldBlock).toBe(false);
        expect(result.counters.passed).toBe(2);
        expect(result.counters.warnings).toBe(1);
        expect(result.counters.errors).toBe(0);
      }
    );
  });

  it("stops when a blocking step fails", async () => {
    await withTempProject(
      `
      export default {
        hooks: {
          "pre-commit": {
            steps: [
              { name: "ok-step", type: "command", run: "node -e \\"process.exit(0)\\"", blocking: true },
              { name: "block-step", type: "command", run: "node -e \\"process.exit(1)\\"", blocking: true },
              { name: "not-executed", type: "command", run: "node -e \\"process.exit(0)\\"", blocking: true }
            ]
          }
        }
      };
      `,
      async (cwd) => {
        const result = await runPipeline("pre-commit", cwd);

        expect(result.shouldBlock).toBe(true);
        expect(result.counters.passed).toBe(1);
        expect(result.counters.warnings).toBe(0);
        expect(result.counters.errors).toBe(1);
      }
    );
  });
});
