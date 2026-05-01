import { createProvider } from "../core/provider-factory.js";
import { filterPathsByPatterns } from "../core/file-patterns.js";
import { listStagedFilePaths } from "../core/git.js";
import { aiStepCalling } from "../core/terminal-style.js";
import type { AiStepConfig, CommitlensConfig } from "../types/config.js";
import type { StepResult } from "../types/pipeline.js";

const DEFAULT_PROMPT =
  "Review staged files for bugs and security issues. Reply exactly OK if no issues are found.";

export interface RunAiStepOptions {
  /** When set, skip reading git index and use this list instead (tests). */
  filesOverride?: string[];
  /**
   * Run the provider even with no staged files (e.g. `commitlens ai-ping`).
   */
  forceWithoutStaged?: boolean;
}

/**
 * Executes an AI review step using configured provider and fallback order.
 */
export async function runAiStep(
  step: AiStepConfig,
  config: CommitlensConfig,
  cwd: string,
  options?: RunAiStepOptions
): Promise<StepResult> {
  if (config.ai?.enabled === false) {
    return {
      message: "AI is disabled by config. Skipping AI review step.",
      passed: true
    };
  }

  let rawPaths: string[];
  if (options?.forceWithoutStaged === true) {
    rawPaths = options.filesOverride ?? [];
  } else {
    rawPaths = options?.filesOverride ?? (await listStagedFilePaths(cwd));
    if (rawPaths.length === 0) {
      return {
        message:
          "No staged files to review. Stage changes with `git add` or run `commitlens ai-ping` to test the provider.",
        passed: true
      };
    }
  }

  const files = filterPathsByPatterns(rawPaths, step.filePatterns);

  if (options?.forceWithoutStaged !== true && rawPaths.length > 0 && files.length === 0) {
    return {
      message: `No staged files match filePatterns (${(step.filePatterns ?? []).join(", ") || "none"}); nothing to review.`,
      passed: true
    };
  }

  const selectedProviderNames = collectProviderOrder(config);

  for (const providerName of selectedProviderNames) {
    const provider = createProvider(providerName, config.providers?.[providerName]);
    if (provider === null) {
      continue;
    }

    const available = await provider.isAvailable();
    if (!available) {
      continue;
    }

    process.stdout.write(aiStepCalling(step.name, providerName));

    const streamToConsole =
      step.streamModelOutput === true ||
      (step.streamModelOutput !== false && config.ai?.streamModelOutput === true);

    try {
      const reviewResult = await provider.review({
        files,
        prompt: step.prompt ?? DEFAULT_PROMPT,
        streamToConsole
      });

      return {
        message: `${provider.name}: ${reviewResult.message}`,
        passed: reviewResult.passed
      };
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : String(error);
      return {
        message: `${provider.name}: ${detail}`,
        passed: false
      };
    }
  }

  return {
    forceWarning: true,
    message: "No AI provider available. Skipping AI review without blocking.",
    passed: false
  };
}

function collectProviderOrder(config: CommitlensConfig): string[] {
  const order: string[] = [];

  if (config.provider !== undefined) {
    order.push(config.provider);
  }

  if (config.fallback !== undefined) {
    for (const providerName of config.fallback) {
      if (!order.includes(providerName)) {
        order.push(providerName);
      }
    }
  }

  return order;
}
