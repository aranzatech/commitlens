import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import pc from "picocolors";

import { bold, dim, tag } from "../../core/terminal-style.js";

const KNOWN_PROVIDERS = ["claude-code", "codex", "claude-api", "openai", "gemini", "custom"];

export async function handleUseCommand(provider: string): Promise<void> {
  if (!KNOWN_PROVIDERS.includes(provider)) {
    process.stderr.write(
      pc.yellow(
        `[commitlens] Unknown provider "${provider}". Known providers: ${KNOWN_PROVIDERS.join(", ")}\n`
      )
    );
    process.exitCode = 1;
    return;
  }

  const configPath = path.join(process.cwd(), "commitlens.config.ts");
  let content: string;

  try {
    content = await readFile(configPath, "utf8");
  } catch {
    process.stderr.write(
      pc.red("[commitlens] commitlens.config.ts not found. Run `commitlens init` first.\n")
    );
    process.exitCode = 1;
    return;
  }

  // Match `provider:` (singular, not `providers:`) and replace its value
  const updated = content.replace(
    /(^\s*provider(?!s)\s*:\s*)(["'])[^"']*\2/m,
    (_match, prefix: string, quote: string) => `${prefix}${quote}${provider}${quote}`
  );

  if (updated === content) {
    process.stdout.write(
      `${tag()} ${dim("No")} ${bold("provider")} ${dim(`field found in config — add provider: "${provider}" manually.\n`)}`
    );
    return;
  }

  await writeFile(configPath, updated, "utf8");
  process.stdout.write(
    `${tag()} Provider switched to ${bold(provider)} in commitlens.config.ts\n`
  );
}
