import { access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";

import { execaCommand } from "execa";

import type { CommitlensConfig, ProviderConfig } from "../types/config.js";

export interface ProviderHealthStatus {
  available: boolean;
  message: string;
  providerName: string;
}

/** Maps known provider names to their canonical env var for the API key. */
const PROVIDER_ENV_KEYS: Record<string, string> = {
  "claude-api": "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  gemini: "GEMINI_API_KEY"
};

/** Maps known CLI providers to their default binary name. */
const CLI_PROVIDER_BINS: Record<string, string> = {
  "claude-code": "claude",
  codex: "codex"
};

export async function evaluateProviderHealth(
  config: CommitlensConfig
): Promise<ProviderHealthStatus[]> {
  const providerEntries = Object.entries(config.providers ?? {});
  const statuses: ProviderHealthStatus[] = [];

  for (const [providerName, providerConfig] of providerEntries) {
    statuses.push(await evaluateSingleProvider(providerName, providerConfig));
  }

  return statuses;
}

async function evaluateSingleProvider(
  providerName: string,
  providerConfig: ProviderConfig
): Promise<ProviderHealthStatus> {
  // Explicit bin in config → CLI binary check
  if (providerConfig.bin !== undefined) {
    return evaluateCliProvider(providerName, providerConfig.bin);
  }

  // Known CLI provider with no explicit bin → use default binary
  const defaultBin = CLI_PROVIDER_BINS[providerName];
  if (defaultBin !== undefined) {
    return evaluateCliProvider(providerName, defaultBin);
  }

  // API key providers: resolve from config or env var
  const envVar = PROVIDER_ENV_KEYS[providerName];
  const resolvedKey = providerConfig.apiKey ?? (envVar !== undefined ? process.env[envVar] : undefined);

  if (resolvedKey !== undefined || envVar !== undefined) {
    const available = resolvedKey !== undefined && resolvedKey.length > 0;
    const source = providerConfig.apiKey !== undefined ? "config" : `env ${envVar ?? ""}`;
    const hint = envVar !== undefined ? `Set ${envVar} or providers['${providerName}'].apiKey` : `Set providers['${providerName}'].apiKey`;
    return {
      available,
      message: available ? `API key found (${source})` : `Missing API key — ${hint}`,
      providerName
    };
  }

  // Custom script provider
  if (providerConfig.script !== undefined) {
    try {
      await access(providerConfig.script, fsConstants.X_OK);
      return { available: true, message: "Custom script is executable", providerName };
    } catch {
      return { available: false, message: "Custom script is missing or not executable", providerName };
    }
  }

  return { available: false, message: "No supported health-check config found", providerName };
}

async function evaluateCliProvider(
  providerName: string,
  binaryName: string
): Promise<ProviderHealthStatus> {
  try {
    await execaCommand(`command -v ${binaryName}`, { shell: true });
    return {
      available: true,
      message: `Binary "${binaryName}" found`,
      providerName
    };
  } catch {
    return {
      available: false,
      message: `Binary "${binaryName}" not found in PATH`,
      providerName
    };
  }
}
