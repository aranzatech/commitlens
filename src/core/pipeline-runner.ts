import { loadCommitlensConfig } from "../config/loader.js";
import { runStep } from "./step-runner.js";
import type { CommitlensConfig, HookConfig, HookName } from "../types/config.js";
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
    process.stdout.write("[commitlens] No commitlens.config.ts found, skipping hook.\n");
    return {
      counters: createInitialCounters(),
      shouldBlock: false
    };
  }

  const hookConfig = config.hooks[hook];
  if (hookConfig === undefined) {
    process.stdout.write(`[commitlens] No steps configured for ${hook}, skipping.\n`);
    return {
      counters: createInitialCounters(),
      shouldBlock: false
    };
  }

  process.stdout.write(`[commitlens] Running ${hook} pipeline...\n`);
  const counters = createInitialCounters();
  const shouldBlock = await executeSteps(hookConfig, counters, config, cwd, hookArgs);

  process.stdout.write(
    `[commitlens] Summary: passed=${counters.passed}, warnings=${counters.warnings}, errors=${counters.errors}\n`
  );

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
      process.stdout.write(`  ✅ ${step.name} passed\n`);
      continue;
    }

    if (result.forceWarning === true) {
      counters.warnings += 1;
      process.stdout.write(`  ⚠️  ${step.name} warning -> ${result.message} (non-blocking)\n`);
      continue;
    }

    if (step.blocking) {
      counters.errors += 1;
      process.stderr.write(`  ❌ ${step.name} FAILED -> ${result.message} (blocking)\n`);
      return true;
    }

    counters.warnings += 1;
    process.stdout.write(`  ⚠️  ${step.name} warning -> ${result.message} (non-blocking)\n`);
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
