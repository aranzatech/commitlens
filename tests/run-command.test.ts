import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { describe, expect, it } from "vitest";

import { handleRunCommand } from "../src/cli/commands/run.js";

const tempRoot = path.join(process.cwd(), ".tmp-tests");

describe("handleRunCommand", () => {
  it("throws for unsupported hooks", async () => {
    await expect(handleRunCommand("post-merge")).rejects.toThrow("Invalid hook");
  });

  it("sets exitCode=1 when pipeline should block", async () => {
    await mkdir(tempRoot, { recursive: true });
    const cwd = await mkdtemp(path.join(tempRoot, "run-command-"));
    const previousCwd = process.cwd();
    const previousExitCode = process.exitCode;

    try {
      await writeFile(
        path.join(cwd, "commitlens.config.ts"),
        `
        export default {
          hooks: {
            "pre-commit": {
              steps: [
                { name: "fail", type: "command", run: "node -e \\"process.exit(1)\\"", blocking: true }
              ]
            }
          }
        };
        `,
        "utf8"
      );

      process.chdir(cwd);
      process.exitCode = undefined;
      await handleRunCommand("pre-commit");
      expect(process.exitCode).toBe(1);
    } finally {
      process.chdir(previousCwd);
      process.exitCode = previousExitCode;
      await rm(cwd, { force: true, recursive: true });
    }
  });
});
