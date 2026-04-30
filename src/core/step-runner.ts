import { CommitlensError } from "../errors/commitlens-error.js";
import { runAiStep } from "../steps/ai.step.js";
import { runCommandStep } from "../steps/command.step.js";
import { runCommitMessageStep } from "../steps/commit-msg.step.js";
import type { CommitlensConfig, StepConfig } from "../types/config.js";
import type { StepExecutionContext, StepResult } from "../types/pipeline.js";

/**
 * Delegates step execution to the correct step handler.
 */
export async function runStep(
  step: StepConfig,
  context: Omit<StepExecutionContext, "step"> & { config: CommitlensConfig }
): Promise<StepResult> {
  if (step.type === "command") {
    return runCommandStep(step);
  }

  if (step.type === "ai") {
    return runAiStep(step, context.config);
  }

  if (step.type === "commit-msg") {
    return runCommitMessageStep(step, context.hookArgs);
  }

  throw new CommitlensError(`[commitlens] Unsupported step type: ${JSON.stringify(step)}`, "STEP_NOT_SUPPORTED");
}
