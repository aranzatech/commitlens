import { readFile } from "node:fs/promises";

import type { CommitMessageStepConfig } from "../types/config.js";
import type { StepResult } from "../types/pipeline.js";

const CONVENTIONAL_COMMIT_REGEX =
  /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([\w-]+\))?!?: .+/;

/**
 * Validates commit message content according to configured format.
 */
export async function runCommitMessageStep(
  step: CommitMessageStepConfig,
  hookArgs: string[] = []
): Promise<StepResult> {
  if (step.format !== "conventional-commits") {
    return {
      message: `Unsupported commit message format: ${step.format}`,
      passed: false
    };
  }

  const commitMessage = await resolveCommitMessage(hookArgs);
  if (commitMessage === null) {
    return {
      forceWarning: true,
      message: "Commit message input not provided. Skipping validation.",
      passed: false
    };
  }

  const firstLine = commitMessage.split("\n")[0]?.trim() ?? "";
  const passed = CONVENTIONAL_COMMIT_REGEX.test(firstLine);

  return {
    message: passed
      ? "commit message follows conventional commits"
      : `commit message "${firstLine}" does not follow conventional commits`,
    passed
  };
}

async function resolveCommitMessage(hookArgs: string[]): Promise<string | null> {
  const commitMessageFilePath = hookArgs[0];
  if (commitMessageFilePath !== undefined) {
    return (await readFile(commitMessageFilePath, "utf8")).trim();
  }

  const envMessage = process.env.COMMITLENS_COMMIT_MSG;
  if (typeof envMessage === "string" && envMessage.trim().length > 0) {
    return envMessage.trim();
  }

  return null;
}
