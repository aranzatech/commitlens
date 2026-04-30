import process from "node:process";

import { loadCommitlensConfig } from "../../config/loader.js";
import { evaluateProviderHealth } from "../../core/provider-doctor.js";

/**
 * Handles the doctor CLI command.
 */
export async function handleDoctorCommand(): Promise<void> {
  const config = await loadCommitlensConfig(process.cwd());

  if (config === null) {
    console.warn("[commitlens] No commitlens.config.ts found. Nothing to diagnose.");
    return;
  }

  const statuses = await evaluateProviderHealth(config);
  if (statuses.length === 0) {
    console.warn("[commitlens] No providers configured.");
    return;
  }

  process.stdout.write("[commitlens] Provider diagnostics:\n");
  for (const status of statuses) {
    const icon = status.available ? "✅" : "❌";
    process.stdout.write(`  ${icon} ${status.providerName}: ${status.message}\n`);
  }
}
