/**
 * `devto listings ...` — classified listings.
 *
 * These routes only exist in the deprecated v0 API. They still work today, but
 * Forem could remove them, so this is the only place that uses them.
 */

import { Command } from "commander";
import { globalOf, openClient, parseIntArg } from "../helpers.js";
import { print, warn } from "../output.js";

export function registerListingCommands(program: Command): void {
  const listings = program
    .command("listings")
    .description("Classified listings (deprecated v0 API — may be removed by Forem)");

  listings
    .command("list")
    .description("List listings")
    .option("--category <category>")
    .option("--page <n>")
    .option("--per-page <n>")
    .action(
      async (options: { category?: string; page?: string; perPage?: string }, command: Command) => {
        const { client, options: output } = await openClient(globalOf(command));
        warn("The listings endpoints come from the deprecated v0 API.", output);
        print(
          await client.listings.list({
            category: options.category,
            page: options.page === undefined ? undefined : parseIntArg(options.page, "page"),
            perPage:
              options.perPage === undefined ? undefined : parseIntArg(options.perPage, "per-page"),
          }),
          output,
        );
      },
    );

  listings
    .command("get")
    .description("Get a listing")
    .argument("<id>")
    .action(async (id: string, _options: unknown, command: Command) => {
      const { client, options } = await openClient(globalOf(command));
      warn("The listings endpoints come from the deprecated v0 API.", options);
      print(await client.listings.get(parseIntArg(id, "id")), options);
    });

  listings
    .command("by-category")
    .description("List listings in a category")
    .argument("<category>")
    .action(async (category: string, _options: unknown, command: Command) => {
      const { client, options } = await openClient(globalOf(command));
      warn("The listings endpoints come from the deprecated v0 API.", options);
      print(await client.listings.byCategory(category), options);
    });

  listings
    .command("by-organization")
    .description("List an organization's listings")
    .argument("<username>")
    .action(async (username: string, _options: unknown, command: Command) => {
      const { client, options } = await openClient(globalOf(command));
      warn("The listings endpoints come from the deprecated v0 API.", options);
      print(await client.listings.byOrganization(username), options);
    });
}
