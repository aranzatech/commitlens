import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { describe, expect, it } from "vitest";

import { runPipeline } from "../src/core/pipeline-runner.js";
import { runAiStep } from "../src/steps/ai.step.js";
import type { CommitlensConfig } from "../src/types/config.js";

const tempRoot = path.join(process.cwd(), ".tmp-tests");

describe("runAiStep", () => {
  it("uses fallback provider when primary is unavailable", async () => {
    await mkdir(tempRoot, { recursive: true });
    const cwd = await mkdtemp(path.join(tempRoot, "commitlens-ai-fallback-"));
    const scriptPath = path.join(cwd, "review.sh");

    try {
      await writeFile(scriptPath, "#!/bin/sh\necho OK\n", "utf8");
      await chmod(scriptPath, 0o755);

      const config: CommitlensConfig = {
        fallback: ["custom"],
        hooks: {},
        provider: "unknown-primary",
        providers: {
          custom: { script: scriptPath }
        }
      };

      const result = await runAiStep(
        { blocking: true, name: "ai-review", prompt: "Review", type: "ai" },
        config,
        ["src/index.ts"]
      );

      expect(result.passed).toBe(true);
      expect(result.message).toContain("custom");
    } finally {
      await rm(cwd, { force: true, recursive: true });
    }
  });

  it("returns forced warning when no providers are available", async () => {
    const config: CommitlensConfig = {
      fallback: ["missing-provider"],
      hooks: {},
      provider: "unknown-provider",
      providers: {}
    };

    const result = await runAiStep(
      { blocking: true, name: "ai-review", prompt: "Review", type: "ai" },
      config,
      []
    );

    expect(result.passed).toBe(false);
    expect(result.forceWarning).toBe(true);
  });

  it("skips AI execution when ai.enabled is false", async () => {
    const config: CommitlensConfig = {
      ai: {
        enabled: false
      },
      fallback: ["custom"],
      hooks: {},
      provider: "custom",
      providers: {
        custom: {
          script: "/path/that/should/not/run.sh"
        }
      }
    };

    const result = await runAiStep(
      { blocking: true, name: "ai-review", prompt: "Review", type: "ai" },
      config,
      []
    );

    expect(result.passed).toBe(true);
    expect(result.message).toContain("AI is disabled by config");
  });
});

describe("pipeline with ai step", () => {
  it("does not block when ai provider is unavailable", async () => {
    await mkdir(tempRoot, { recursive: true });
    const cwd = await mkdtemp(path.join(tempRoot, "commitlens-ai-pipeline-"));

    try {
      await writeFile(
        path.join(cwd, "commitlens.config.ts"),
        `
        export default {
          provider: "unknown-provider",
          fallback: ["missing-provider"],
          providers: {},
          hooks: {
            "pre-commit": {
              steps: [
                { name: "ai-review", type: "ai", blocking: true, prompt: "Review please" }
              ]
            }
          }
        };
        `,
        "utf8"
      );

      const result = await runPipeline("pre-commit", cwd);
      expect(result.shouldBlock).toBe(false);
      expect(result.counters.warnings).toBe(1);
      expect(result.counters.errors).toBe(0);
    } finally {
      await rm(cwd, { force: true, recursive: true });
    }
  });

  it("passes AI step when ai.enabled is false", async () => {
    await mkdir(tempRoot, { recursive: true });
    const cwd = await mkdtemp(path.join(tempRoot, "commitlens-ai-disabled-"));

    try {
      await writeFile(
        path.join(cwd, "commitlens.config.ts"),
        `
        export default {
          ai: { enabled: false },
          provider: "custom",
          providers: {
            custom: { script: ".commitlens/missing-reviewer.sh" }
          },
          hooks: {
            "pre-commit": {
              steps: [
                { name: "ai-review", type: "ai", blocking: true, prompt: "Review please" }
              ]
            }
          }
        };
        `,
        "utf8"
      );

      const result = await runPipeline("pre-commit", cwd);
      expect(result.shouldBlock).toBe(false);
      expect(result.counters.passed).toBe(1);
      expect(result.counters.warnings).toBe(0);
      expect(result.counters.errors).toBe(0);
    } finally {
      await rm(cwd, { force: true, recursive: true });
    }
  });
});
