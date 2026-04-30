import { execaCommand } from "execa";

import type { CommandStepConfig } from "../types/config.js";
import type { StepResult } from "../types/pipeline.js";

/**
 * Executes a shell command and returns a normalized step result.
 */
export async function runCommandStep(step: CommandStepConfig): Promise<StepResult> {
  try {
    await execaCommand(step.run, {
      shell: true,
      stdio: "inherit"
    });

    return {
      message: "passed",
      passed: true
    };
  } catch (error: unknown) {
    const message = error instanceof Error && error.message.length > 0 ? error.message : "command failed";

    return {
      message,
      passed: false
    };
  }
}
