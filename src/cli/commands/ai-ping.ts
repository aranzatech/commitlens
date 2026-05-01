import process from "node:process";

import { loadCommitlensConfig } from "../../config/loader.js";
import {
  aiPingFail,
  aiPingHint,
  aiPingIntro,
  aiPingSuccess,
  stderrError
} from "../../core/terminal-style.js";
import { runAiStep } from "../../steps/ai.step.js";

/**
 * Runs a minimal AI request so you can verify auth, CLI, and network without committing.
 */
export async function handleAiPingCommand(): Promise<void> {
  const cwd = process.cwd();
  const config = await loadCommitlensConfig(cwd);

  if (config === null) {
    stderrError("No commitlens.config.ts found in this directory.");
    process.exitCode = 1;
    return;
  }

  process.stdout.write(aiPingIntro());

  const result = await runAiStep(
    {
      blocking: true,
      name: "ai-ping",
      prompt:
        "You are a connectivity check for a git hook. Reply with exactly the two letters OK and nothing else. No punctuation, no explanation.",
      type: "ai"
    },
    config,
    cwd,
    { forceWithoutStaged: true }
  );

  if (result.passed) {
    process.stdout.write(aiPingSuccess(result.message));
    return;
  }

  process.stderr.write(aiPingFail(result.message));
  process.stderr.write(aiPingHint());
  process.exitCode = 1;
}
