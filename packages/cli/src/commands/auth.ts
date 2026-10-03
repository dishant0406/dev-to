/**
 * `devto auth ...` and `devto config ...` — managing the API key.
 */

import { Command } from "commander";
import {
  configPath,
  deleteConfig,
  maskSecret,
  readConfig,
  resolveCredentials,
  writeConfig,
  DEFAULT_BASE_URL,
} from "../config.js";
import { openClient, type GlobalOptions } from "../helpers.js";
import { info, print, success, type OutputOptions } from "../output.js";

export function registerAuthCommands(program: Command): void {
  const auth = program.command("auth").description("Manage the stored API key");

  auth
    .command("login")
    .description("Save an API key to the config file")
    .requiredOption("-k, --key <key>", "your dev.to API key")
    .option("-u, --base-url <url>", "Forem instance URL", DEFAULT_BASE_URL)
    .action(async (options: { key: string; baseUrl: string }, command: Command) => {
      const global = command.optsWithGlobals() as GlobalOptions;
      const output: OutputOptions = {
        json: global.json,
        quiet: global.quiet,
        noColor: global.noColor,
      };

      writeConfig({ apiKey: options.key, baseUrl: options.baseUrl });
      success(`Saved API key ${maskSecret(options.key)} to ${configPath()}`, output);
    });

  auth
    .command("logout")
    .description("Delete the stored API key")
    .action((_options: unknown, command: Command) => {
      const global = command.optsWithGlobals() as GlobalOptions;
      const output: OutputOptions = {
        json: global.json,
        quiet: global.quiet,
        noColor: global.noColor,
      };

      if (deleteConfig()) success(`Deleted ${configPath()}`, output);
      else info("No stored credentials.", output);
    });

  auth
    .command("whoami")
    .description("Show the account the current API key belongs to")
    .action(async (_options: unknown, command: Command) => {
      const global = command.optsWithGlobals() as GlobalOptions;
      const { client, options } = await openClient(global);
      const me = await client.users.me();
      print({ id: me.id, username: me.username, name: me.name, email: me.email }, options);
    });

  const config = program.command("config").description("Inspect the configuration");

  config
    .command("list")
    .description("Show the resolved configuration (the API key is masked)")
    .action((_options: unknown, command: Command) => {
      const global = command.optsWithGlobals() as GlobalOptions;
      const { apiKey, baseUrl, sources } = resolveCredentials(global);

      print(
        {
          configFile: configPath(),
          configFileExists: Object.keys(readConfig()).length > 0,
          apiKey: maskSecret(apiKey),
          apiKeySource: sources.apiKey,
          baseUrl,
          baseUrlSource: sources.baseUrl,
        },
        { json: global.json, quiet: global.quiet, noColor: global.noColor },
      );
    });

  config
    .command("get")
    .description("Print one configuration value")
    .argument("<key>", "apiKey or baseUrl")
    .action((key: string) => {
      const config = readConfig();

      if (key === "apiKey") console.log(maskSecret(config.apiKey));
      else if (key === "baseUrl") console.log(config.baseUrl ?? "");
      else throw new Error(`Unknown key "${key}". Use "apiKey" or "baseUrl".`);
    });

  config
    .command("set")
    .description("Save a configuration value")
    .argument("<key>", "apiKey or baseUrl")
    .argument("<value>")
    .action((key: string, value: string, _options: unknown, command: Command) => {
      const global = command.optsWithGlobals() as GlobalOptions;
      const output: OutputOptions = {
        json: global.json,
        quiet: global.quiet,
        noColor: global.noColor,
      };
      const config = readConfig();

      if (key === "apiKey") config.apiKey = value;
      else if (key === "baseUrl") config.baseUrl = value;
      else throw new Error(`Unknown key "${key}". Use "apiKey" or "baseUrl".`);

      writeConfig(config);
      success(`Saved ${key}.`, output);
    });
}
