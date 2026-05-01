import { readFile } from "node:fs/promises";

import type { CommitMessageStepConfig } from "../types/config.js";
import type { StepResult } from "../types/pipeline.js";

const CONVENTIONAL_COMMIT_REGEX =
  /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([\w-]+\))?!?: .+/;

// Unicode emoji or :shortcode: followed by a description
const GITMOJI_UNICODE_REGEX = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s+.+/u;
const GITMOJI_SHORTCODE_REGEX = /^:[a-z0-9_]+:\s+.+/;

const FORMAT_HINTS: Record<string, string> = {
  "angular": "feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert: description",
  "conventional-commits": "feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert: description",
  "gitmoji": ":sparkles: description  or  ✨ description"
};

const FORMAT_DISPLAY: Record<string, string> = {
  "angular": "angular commit convention",
  "conventional-commits": "conventional commits",
  "gitmoji": "gitmoji"
};

function validateFormat(format: string, firstLine: string): boolean {
  switch (format) {
    case "conventional-commits":
    case "angular":
      return CONVENTIONAL_COMMIT_REGEX.test(firstLine);
    case "gitmoji":
      return GITMOJI_UNICODE_REGEX.test(firstLine) || GITMOJI_SHORTCODE_REGEX.test(firstLine);
    default:
      return false;
  }
}

export async function runCommitMessageStep(
  step: CommitMessageStepConfig,
  hookArgs: string[] = []
): Promise<StepResult> {
  const hint = FORMAT_HINTS[step.format];
  if (hint === undefined) {
    return {
      message: `Unsupported commit message format: "${step.format}". Supported: conventional-commits, angular, gitmoji`,
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
  const passed = validateFormat(step.format, firstLine);

  const displayName = FORMAT_DISPLAY[step.format] ?? step.format;
  return {
    message: passed
      ? `commit message follows ${displayName}`
      : `commit message "${firstLine}" does not follow ${displayName} (expected: ${hint})`,
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
