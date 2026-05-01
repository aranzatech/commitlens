import { ClaudeCodeProvider } from "../providers/claude-code.provider.js";
import { ClaudeApiProvider } from "../providers/claude-api.provider.js";
import { CodexProvider } from "../providers/codex.provider.js";
import { CustomProvider } from "../providers/custom.provider.js";
import { GeminiProvider } from "../providers/gemini.provider.js";
import { OpenAiProvider } from "../providers/openai.provider.js";
import type { ProviderConfig } from "../types/config.js";
import type { AIProvider } from "../types/providers.js";

export function createProvider(providerName: string, providerConfig?: ProviderConfig): AIProvider | null {
  // Local CLI providers (no API key required)
  if (providerName === "claude-code") return new ClaudeCodeProvider(providerConfig);
  if (providerName === "codex") return new CodexProvider(providerConfig);

  // API key providers
  if (providerName === "claude-api") return new ClaudeApiProvider(providerConfig);
  if (providerName === "openai") return new OpenAiProvider(providerConfig);
  if (providerName === "gemini") return new GeminiProvider(providerConfig);

  // Script-based custom provider
  if (providerName === "custom" && providerConfig?.script !== undefined) {
    return new CustomProvider(providerConfig.script);
  }

  return null;
}
