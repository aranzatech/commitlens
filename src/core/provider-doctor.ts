import { access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";

import { execaCommand } from "execa";

import type { CommitlensConfig, ProviderConfig } from "../types/config.js";

export interface ProviderHealthStatus {
  available: boolean;
  message: string;
  providerName: string;
}

/**
 * Evaluates provider availability for the configured providers.
 */
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
  if (providerConfig.bin !== undefined) {
    return evaluateCliProvider(providerName, providerConfig.bin);
  }

  if (providerConfig.apiKey !== undefined) {
    return {
      available: providerConfig.apiKey.length > 0,
      message: providerConfig.apiKey.length > 0 ? "API key configured" : "Missing API key",
      providerName
    };
  }

  if (providerConfig.script !== undefined) {
    try {
      await access(providerConfig.script, fsConstants.X_OK);
      return {
        available: true,
        message: "Custom script is executable",
        providerName
      };
    } catch {
      return {
        available: false,
        message: "Custom script is missing or not executable",
        providerName
      };
    }
  }

  return {
    available: false,
    message: "No supported health-check config found",
    providerName
  };
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
