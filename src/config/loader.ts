import { access } from "node:fs/promises";
import path from "node:path";

import { createJiti } from "jiti";

import { commitlensConfigSchema } from "./schema.js";
import { CommitlensError } from "../errors/commitlens-error.js";
import type { CommitlensConfig } from "../types/config.js";

const CONFIG_FILE_NAME = "commitlens.config.ts";

/**
 * Loads commitlens config from the current working directory.
 */
export async function loadCommitlensConfig(cwd: string): Promise<CommitlensConfig | null> {
  const configPath = path.join(cwd, CONFIG_FILE_NAME);

  try {
    await access(configPath);
  } catch {
    return null;
  }

  try {
    const jiti = createJiti(cwd, { interopDefault: true });
    const importedModule = await jiti.import(configPath);
    const rawConfig =
      importedModule !== null &&
      typeof importedModule === "object" &&
      "default" in importedModule &&
      importedModule.default !== undefined
        ? importedModule.default
        : importedModule;
    const parsedConfig = commitlensConfigSchema.safeParse(rawConfig);

    if (!parsedConfig.success) {
      throw new CommitlensError(
        `[commitlens] Invalid commitlens config: ${parsedConfig.error.message}`,
        "INVALID_CONFIG"
      );
    }

    return parsedConfig.data;
  } catch (error: unknown) {
    if (error instanceof CommitlensError) {
      throw error;
    }

    throw new CommitlensError(
      `[commitlens] Failed to load config at ${configPath}: ${String(error)}`,
      "CONFIG_LOAD_FAILED"
    );
  }
}
