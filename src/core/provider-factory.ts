import { ClaudeCodeProvider } from "../providers/claude-code.provider.js";
import { CustomProvider } from "../providers/custom.provider.js";
import type { ProviderConfig } from "../types/config.js";
import type { AIProvider } from "../types/providers.js";

/**
 * Creates an AI provider instance from config.
 */
export function createProvider(providerName: string, providerConfig?: ProviderConfig): AIProvider | null {
  if (providerName === "claude-code") {
    return new ClaudeCodeProvider(providerConfig?.bin ?? "claude");
  }

  if (providerName === "custom" && providerConfig?.script !== undefined) {
    return new CustomProvider(providerConfig.script);
  }

  return null;
}
