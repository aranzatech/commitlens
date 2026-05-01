import { cac } from "cac";
import pc from "picocolors";

import { CommitlensError } from "../errors/commitlens-error.js";
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
const DEFAULT_VERSION = "0.1.6";

/**
 * Runs the commitlens CLI entrypoint.
 */
export function runCli(argv: string[], options: RunCliOptions = {}): void {
  const cli = cac(CLI_NAME);

  cli
    .command("init", "Genera commitlens.config.ts con valores por defecto")
    .action(async (): Promise<void> => {
      try {
        await handleInitCommand();
      } catch (error: unknown) {
        handleCliError(error);
      }
    });

  cli
    .command("install", "Instala los git hooks en .git/hooks/")
    .action(async (): Promise<void> => {
      try {
        await handleInstallCommand();
      } catch (error: unknown) {
        handleCliError(error);
      }
    });

  cli
    .command("run <hook> [hookArg]", "Ejecuta un hook manualmente")
    .action(async (hook: string, hookArg?: string): Promise<void> => {
      try {
        await handleRunCommand(hook, hookArg);
      } catch (error: unknown) {
        handleCliError(error);
      }
    });

  cli
    .command("doctor", "Verifica disponibilidad de providers")
    .action(async (): Promise<void> => {
      try {
        await handleDoctorCommand();
      } catch (error: unknown) {
        handleCliError(error);
      }
    });

  cli
    .command("ai-ping", "Ejecuta una petición mínima a la IA para comprobar que responde OK")
    .action(async (): Promise<void> => {
      try {
        await handleAiPingCommand();
      } catch (error: unknown) {
        handleCliError(error);
      }
    });

  cli
    .command("use <provider>", "Cambia el provider AI activo")
    .action(handleUseCommand);

  cli
    .command("help", "Muestra comandos y opciones disponibles (igual que --help)")
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
