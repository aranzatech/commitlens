export interface HookConfig {
  steps: StepConfig[];
}

export type HookName = "pre-commit" | "pre-push" | "commit-msg";

export interface BaseStepConfig {
  blocking: boolean;
  name: string;
  type: "command" | "ai" | "commit-msg";
}

export interface CommandStepConfig extends BaseStepConfig {
  run: string;
  type: "command";
}

export interface AiStepConfig extends BaseStepConfig {
  filePatterns?: string[];
  /** When true/false, overrides global `ai.showReviewOutput` for this step. */
  showOutput?: boolean;
  /** Max lines of diff to include per file before truncating (default: 150). */
  maxLinesPerFile?: number;
  /** Max total lines of diff to send to the AI across all files (default: 400). */
  maxDiffLines?: number;
  prompt?: string;
  /** Path to a file containing the review prompt, relative to the repo root. */
  promptFile?: string;
  /** Stream model output live; overrides global `ai.streamModelOutput` when set. */
  streamModelOutput?: boolean;
  type: "ai";
}

export interface CommitMessageStepConfig extends BaseStepConfig {
  format: string;
  type: "commit-msg";
}

export type StepConfig = CommandStepConfig | AiStepConfig | CommitMessageStepConfig;

export interface ProviderConfig {
  allowedTools?: string[];
  apiKey?: string;
  bin?: string;
  model?: string;
  script?: string;
}

export interface AiConfig {
  enabled?: boolean;
  /** Print provider reply to the terminal even when the AI step passes (OK). */
  showReviewOutput?: boolean;
  /** Stream Claude output while the review runs (stream-json + partial chunks). */
  streamModelOutput?: boolean;
}

export interface CommitlensConfig {
  ai?: AiConfig;
  fallback?: string[];
  hooks: Partial<Record<HookName, HookConfig>>;
  provider?: string;
  providers?: Record<string, ProviderConfig>;
}
