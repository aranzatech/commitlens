import { loadCommitlensConfig } from "../config/loader.js";
import { runStep } from "./step-runner.js";
import {
  aiReviewOutputBlock,
  pipelineBanner,
  pipelineSummaryFooter,
  skipHookNoSteps,
  softWarnLine,
  stepBlockingFailLine,
  stepPassedLine,
  stepWarningLine
} from "./terminal-style.js";
import type { CommitlensConfig, HookConfig, HookName, StepConfig } from "../types/config.js";
import type { PipelineCounters, PipelineRunResult } from "../types/pipeline.js";

/**
 * Runs a configured hook pipeline and prints summary output.
 */
export async function runPipeline(
  hook: HookName,
  cwd: string,
  hookArgs: string[] = []
): Promise<PipelineRunResult> {
  const config = await loadCommitlensConfig(cwd);

  if (config === null) {
    process.stdout.write(softWarnLine("No commitlens.config.ts found, skipping hook."));
    return {
      counters: createInitialCounters(),
      shouldBlock: false
    };
  }

  const hookConfig = config.hooks[hook];
  if (hookConfig === undefined) {
    process.stdout.write(skipHookNoSteps(hook));
    return {
      counters: createInitialCounters(),
      shouldBlock: false
    };
  }

  process.stdout.write(pipelineBanner(hook));
  const counters = createInitialCounters();
  const shouldBlock = await executeSteps(hookConfig, counters, config, cwd, hookArgs);

  process.stdout.write(pipelineSummaryFooter(counters));

  return {
    counters,
    shouldBlock
  };
}

async function executeSteps(
  hookConfig: HookConfig,
  counters: PipelineCounters,
  config: CommitlensConfig,
  cwd: string,
  hookArgs: string[]
): Promise<boolean> {
  for (const step of hookConfig.steps) {
    const result = await runStep(step, { config, cwd, hookArgs });
    if (result.passed) {
      counters.passed += 1;
      if (step.type === "ai" && shouldShowAiReviewOutput(step, config)) {
        const block = aiReviewOutputBlock(result.message);
        if (block !== "") {
          process.stdout.write(block);
        }
      }
      process.stdout.write(stepPassedLine(step.name));
      continue;
    }

    if (result.forceWarning === true) {
      counters.warnings += 1;
      process.stdout.write(stepWarningLine(step.name, result.message));
      continue;
    }

    if (step.blocking) {
      counters.errors += 1;
      process.stderr.write(stepBlockingFailLine(step.name, result.message));
      return true;
    }

    counters.warnings += 1;
    process.stdout.write(stepWarningLine(step.name, result.message));
  }

  return false;
}

function createInitialCounters(): PipelineCounters {
  return {
    errors: 0,
    passed: 0,
    warnings: 0
  };
}

function shouldShowAiReviewOutput(step: StepConfig, config: CommitlensConfig): boolean {
  if (step.type !== "ai") {
    return false;
  }

  if (step.showOutput === true) {
    return true;
  }

  if (step.showOutput === false) {
    return false;
  }

  return config.ai?.showReviewOutput === true;
}
