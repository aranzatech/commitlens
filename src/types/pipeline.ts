import type { ProviderConfig, StepConfig } from "./config.js";

export interface StepResult {
  forceWarning?: boolean;
  message: string;
  passed: boolean;
}

export interface PipelineCounters {
  errors: number;
  passed: number;
  warnings: number;
}

export interface PipelineRunResult {
  counters: PipelineCounters;
  shouldBlock: boolean;
}

export interface StepExecutionContext {
  cwd: string;
  fallback?: string[];
  hookArgs?: string[];
  provider?: string;
  providers?: Record<string, ProviderConfig>;
  step: StepConfig;
}
