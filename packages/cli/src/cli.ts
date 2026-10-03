/**
 * The `devto` command line tool.
 *
 * Every command lives in `src/commands/`. This file only builds the command tree,
 * sets the global options, and turns errors into exit codes.
 */

import { Command, CommanderError } from "commander";
import { resolveCredentials } from "./config.js";
import { parseIntArg, UsageError } from "./helpers.js";
import { printError } from "./output.js";
import { registerAgentSessionCommands } from "./commands/agentSessions.js";
import { registerAnalyticsCommands } from "./commands/analytics.js";
import { registerApiCommands } from "./commands/api.js";
import { registerArticlesCommands } from "./commands/articles.js";
import { registerAuthCommands } from "./commands/auth.js";
import { registerContentCommands } from "./commands/content.js";
import { registerDiscoveryCommands } from "./commands/discovery.js";
import { registerInteractionCommands } from "./commands/interactions.js";
import { registerListingCommands } from "./commands/listings.js";
import { registerPlatformCommands } from "./commands/platform.js";
import { registerUsersCommands } from "./commands/users.js";

export const VERSION = "1.0.0";

export function buildProgram(): Command {
  const program = new Command();

  // Subcommands copy the exit callback when `.command()` creates them, so this
  // has to be set before the command tree is built. Without it commander calls
  // process.exit() itself and the CLI cannot control its own exit code.
  program.exitOverride();

  program
    .name("devto")
    .description("Talk to the dev.to / Forem API v1 from the command line")
    .version(VERSION, "-v, --version")
    .option("--api-key <key>", "API key (overrides DEVTO_API_KEY and the config file)")
    .option("--base-url <url>", "Forem instance URL (defaults to https://dev.to)")
    .option("--json", "print the raw API response instead of a table")
    .option("--quiet", "print nothing except errors")
    .option("--verbose", "print request details")
    .option("--no-color", "disable coloured output")
    .option("--timeout <ms>", "request timeout in milliseconds", (value: string) =>
      parseIntArg(value, "timeout"),
    )
    .option("--dry-run", "show what would be sent, without sending it")
    .option("--yes", "skip confirmation prompts (only use this in scripts you trust)")
    .showHelpAfterError()
    .showSuggestionAfterError();

  registerAuthCommands(program);
  registerApiCommands(program);
  registerArticlesCommands(program);
  registerUsersCommands(program);
  registerInteractionCommands(program);
  registerAnalyticsCommands(program);
  registerContentCommands(program);
  registerDiscoveryCommands(program);
  registerPlatformCommands(program);
  registerAgentSessionCommands(program);
  registerListingCommands(program);

  program.addHelpText(
    "after",
    `
Configuration:
  The API key is read from --api-key, then DEVTO_API_KEY, then the config file
  written by "devto auth login". Get a key at https://dev.to/settings/extensions.

Rate limits:
  The API allows 3 reads/second and 1 write/second, so bulk commands are slowed
  down automatically to avoid 429 errors.

Any endpoint:
  devto api GET /api/articles --query tag=rust

Examples:
  devto articles list --tag javascript --per-page 5
  devto articles push --file post.md
  devto analytics totals
  devto users me`,
  );

  return program;
}

async function main(): Promise<void> {
  const program = buildProgram();

  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    const global = program.opts() as { json?: boolean; noColor?: boolean; apiKey?: string };
    const { apiKey } = resolveCredentials(global);

    if (error instanceof CommanderError) {
      // Commander already printed help or the error message itself.
      process.exitCode = error.exitCode === 0 ? 0 : 2;
      return;
    }

    if (error instanceof UsageError) {
      process.exitCode = printError(error, { json: global.json, noColor: global.noColor }, apiKey);
      return;
    }

    process.exitCode = printError(error, { json: global.json, noColor: global.noColor }, apiKey);
  }
}

await main();
