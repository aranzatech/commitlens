import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { describe, expect, it } from "vitest";

import { runPipeline } from "../src/core/pipeline-runner.js";
import { runCommitMessageStep } from "../src/steps/commit-msg.step.js";

const tempRoot = path.join(process.cwd(), ".tmp-tests");

describe("runCommitMessageStep", () => {
  it("passes for conventional commit messages", async () => {
    process.env.COMMITLENS_COMMIT_MSG = "feat(core): add pipeline summary";
    try {
      const result = await runCommitMessageStep(
        { blocking: true, format: "conventional-commits", name: "cc", type: "commit-msg" },
        []
      );

      expect(result.passed).toBe(true);
    } finally {
      delete process.env.COMMITLENS_COMMIT_MSG;
    }
  });

  it("fails when commit message file does not match convention", async () => {
    await mkdir(tempRoot, { recursive: true });
    const cwd = await mkdtemp(path.join(tempRoot, "commit-msg-step-"));
    const messagePath = path.join(cwd, "COMMIT_EDITMSG");

    try {
      await writeFile(messagePath, "bad commit title", "utf8");
      const result = await runCommitMessageStep(
        { blocking: true, format: "conventional-commits", name: "cc", type: "commit-msg" },
        [messagePath]
      );

      expect(result.passed).toBe(false);
      expect(result.message).toContain("does not follow conventional commits");
    } finally {
      await rm(cwd, { force: true, recursive: true });
    }
  });
});

describe("commit-msg pipeline integration", () => {
  it("blocks commit when commit-msg step is blocking and invalid", async () => {
    await mkdir(tempRoot, { recursive: true });
    const cwd = await mkdtemp(path.join(tempRoot, "commit-msg-pipeline-"));
    const messagePath = path.join(cwd, "COMMIT_EDITMSG");

    try {
      await writeFile(messagePath, "invalid message", "utf8");
      await writeFile(
        path.join(cwd, "commitlens.config.ts"),
        `
        export default {
          hooks: {
            "commit-msg": {
              steps: [
                { name: "cc", type: "commit-msg", format: "conventional-commits", blocking: true }
              ]
            }
          }
        };
        `,
        "utf8"
      );

      const result = await runPipeline("commit-msg", cwd, [messagePath]);
      expect(result.shouldBlock).toBe(true);
      expect(result.counters.errors).toBe(1);
    } finally {
      await rm(cwd, { force: true, recursive: true });
    }
  });
});
