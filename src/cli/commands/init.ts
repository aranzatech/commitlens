import { access, copyFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { initCreatedLine, stderrWarn } from "../../core/terminal-style.js";
import { CommitlensError } from "../../errors/commitlens-error.js";

const CONFIG_FILE_NAME = "commitlens.config.ts";
const TEMPLATE_RELATIVE_PATH = path.join("templates", "commitlens.config.template.ts");

/**
 * Resolves the template path from local package layouts.
 */
async function resolveTemplatePath(cwd: string): Promise<string> {
  const currentFilePath = fileURLToPath(import.meta.url);
  const packageRootPath = path.resolve(path.dirname(currentFilePath), "..", "..", "..");
  const candidatePaths: string[] = [
    path.resolve(packageRootPath, TEMPLATE_RELATIVE_PATH),
    path.resolve(cwd, TEMPLATE_RELATIVE_PATH),
    path.resolve(cwd, "node_modules", "@aranzatech", "commitlens", TEMPLATE_RELATIVE_PATH)
  ];

  for (const candidatePath of candidatePaths) {
    try {
      await access(candidatePath);
      return candidatePath;
    } catch {
      continue;
    }
  }

  throw new CommitlensError(
    "[commitlens] Could not find config template file in package templates.",
    "MISSING_TEMPLATE"
  );
}

/**
 * Handles the init CLI command.
 */
export async function handleInitCommand(): Promise<void> {
  const cwd = process.cwd();
  const destinationPath = path.join(cwd, CONFIG_FILE_NAME);

  try {
    await access(destinationPath);
    stderrWarn("commitlens.config.ts already exists — skipping.");
    return;
  } catch {
    // Continue to create config from template.
  }

  const templatePath = await resolveTemplatePath(cwd);
  await copyFile(templatePath, destinationPath);
  process.stdout.write(initCreatedLine());
}
