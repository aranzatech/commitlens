import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Reads a .env file from cwd and injects variables into process.env.
 * Only sets variables not already present — never overrides shell exports.
 */
export function loadDotEnv(cwd: string): void {
  const envPath = path.join(cwd, ".env");
  let content: string;
  try {
    content = readFileSync(envPath, "utf8");
  } catch {
    return;
  }

  for (const raw of content.split("\n")) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;

    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;

    const key = line.slice(0, eqIndex).trim();
    if (key === "") continue;

    let value = line.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // Never override variables already in the environment
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
