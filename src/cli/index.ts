import { cac } from "cac";
import pc from "picocolors";

import { CommitlensError } from "../errors/commitlens-error.js";
import { loadDotEnv } from "../core/env-loader.js";
import { handleAiPingCommand } from "./commands/ai-ping.js";
import { handleDoctorCommand } from "./commands/doctor.js";
import { handleInitCommand } from "./commands/init.js";
import { handleInstallCommand } from "./commands/install.js";
import { handleRunCommand } from "./commands/run.js";
import { handleUseCommand } from "./commands/use.js";

export interface RunCliOptions {
  version?: string;
}

const CLI_NAME = "commitlens";
const DEFAULT_VERSION = "0.3.0";

export function runCli(argv: string[], options: RunCliOptions = {}): void {
  loadDotEnv(process.cwd());

  const cli = cac(CLI_NAME);

  cli
    .command("init", "Create commitlens.config.ts from the built-in template")
    .action(async (): Promise<void> => {
      try {
        await handleInitCommand();
      } catch (error: unknown) {
        handleCliError(error);
      }
    });

  cli
    .command("install", "Install git hook scripts into .git/hooks")
    .action(async (): Promise<void> => {
      try {
        await handleInstallCommand();
      } catch (error: unknown) {
        handleCliError(error);
      }
    });

  cli
    .command("run <hook> [hookArg]", "Run a hook pipeline manually")
    .action(async (hook: string, hookArg?: string): Promise<void> => {
      try {
        await handleRunCommand(hook, hookArg);
      } catch (error: unknown) {
        handleCliError(error);
      }
    });

  cli
    .command("doctor", "Check availability of configured AI providers")
    .action(async (): Promise<void> => {
      try {
        await handleDoctorCommand();
      } catch (error: unknown) {
        handleCliError(error);
      }
    });

  cli
    .command("ai-ping", "Send a minimal request to validate AI provider connectivity")
    .action(async (): Promise<void> => {
      try {
        await handleAiPingCommand();
      } catch (error: unknown) {
        handleCliError(error);
      }
    });

  cli
    .command("use <provider>", "Switch the active AI provider")
    .action(handleUseCommand);

  cli
    .command("help", "Print available commands and options (same as --help)")
    .action((): void => {
      cli.globalCommand.outputHelp();
    });

  cli.help();
  cli.version(options.version ?? DEFAULT_VERSION);
  cli.parse(argv);
}

function handleCliError(error: unknown): void {
  if (error instanceof CommitlensError) {
    process.stderr.write(pc.red(error.message) + "\n");
    process.exitCode = 1;
    return;
  }

  if (error instanceof Error) {
    process.stderr.write(pc.red(`[commitlens] ${error.message}`) + "\n");
    process.exitCode = 1;
    return;
  }

  process.stderr.write(pc.red("[commitlens] Unknown error while running command.") + "\n");
  process.exitCode = 1;
}
