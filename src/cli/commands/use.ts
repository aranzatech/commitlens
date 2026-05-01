import { bold, dim, tag } from "../../core/terminal-style.js";

/**
 * Handles the use CLI command.
 */
export function handleUseCommand(provider: string): void {
  process.stdout.write(`${tag()} ${dim("use — provider")} ${bold(provider)} ${dim("(placeholder)")}\n`);
}
