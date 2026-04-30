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
  prompt?: string;
  promptFile?: string;
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

export interface CommitlensConfig {
  fallback?: string[];
  hooks: Partial<Record<HookName, HookConfig>>;
  provider?: string;
  providers?: Record<string, ProviderConfig>;
}
