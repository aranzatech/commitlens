/**
 * Handles the use CLI command.
 */
export function handleUseCommand(provider: string): void {
  process.stdout.write(`[commitlens] use command received provider: ${provider}\n`);
}
