import type { AiStepConfig, CommitlensConfig } from "../types/config.js";
import type { StepResult } from "../types/pipeline.js";
import { createProvider } from "../core/provider-factory.js";

const DEFAULT_PROMPT =
  "Review staged files for bugs and security issues. Reply exactly OK if no issues are found.";

/**
 * Executes an AI review step using configured provider and fallback order.
 */
export async function runAiStep(
  step: AiStepConfig,
  config: CommitlensConfig,
  files: string[] = []
): Promise<StepResult> {
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

    const reviewResult = await provider.review({
      files,
      prompt: step.prompt ?? DEFAULT_PROMPT
    });

    return {
      message: `${provider.name}: ${reviewResult.message}`,
      passed: reviewResult.passed
    };
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
