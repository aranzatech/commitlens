import process from "node:process";

import { loadCommitlensConfig } from "../../config/loader.js";
import { evaluateProviderHealth } from "../../core/provider-doctor.js";
import { doctorHeader, doctorProviderLine, stderrWarn } from "../../core/terminal-style.js";

/**
 * Handles the doctor CLI command.
 */
export async function handleDoctorCommand(): Promise<void> {
  const config = await loadCommitlensConfig(process.cwd());

  if (config === null) {
    stderrWarn("No commitlens.config.ts found — nothing to diagnose.");
    return;
  }

  const statuses = await evaluateProviderHealth(config);
  if (statuses.length === 0) {
    stderrWarn("No providers configured.");
    return;
  }

  process.stdout.write(doctorHeader());
  for (const status of statuses) {
    process.stdout.write(doctorProviderLine(status.providerName, status.available, status.message));
  }
}
