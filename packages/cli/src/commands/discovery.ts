/**
 * `devto tags`, `devto trends`, `devto videos`, `devto podcast-episodes`,
 * `devto profile-images`, `devto instance`, `devto subforems`, `devto health`.
 */

import { Command } from "commander";
import { asIdOrSlug, globalOf, openClient, parseIntArg } from "../helpers.js";
import { print } from "../output.js";
import type { HealthCheckName } from "@dishant0406/dev-to";

export function registerDiscoveryCommands(program: Command): void {
  const tags = program.command("tags").description("Browse tags");

  tags
    .command("list")
    .description("List tags")
    .option("--page <n>")
    .option("--per-page <n>")
    .action(async (options: { page?: string; perPage?: string }, command: Command) => {
      const { client, options: output } = await openClient(globalOf(command));
      print(
        await client.tags.list({
          page: options.page === undefined ? undefined : parseIntArg(options.page, "page"),
          perPage:
            options.perPage === undefined ? undefined : parseIntArg(options.perPage, "per-page"),
        }),
        output,
      );
    });

  const trends = program.command("trends").description("Browse trends");

  trends
    .command("list")
    .description("List trends")
    .option("--page <n>")
    .option("--per-page <n>")
    .action(async (options: { page?: string; perPage?: string }, command: Command) => {
      const { client, options: output } = await openClient(globalOf(command));
      print(
        await client.trends.list({
          page: options.page === undefined ? undefined : parseIntArg(options.page, "page"),
          perPage:
            options.perPage === undefined ? undefined : parseIntArg(options.perPage, "per-page"),
        }),
        output,
      );
    });

  trends
    .command("get")
    .description("Get a trend by id or slug")
    .argument("<id-or-slug>")
    .action(async (value: string, _options: unknown, command: Command) => {
      const { client, options } = await openClient(globalOf(command));
      print(await client.trends.get(asIdOrSlug(value)), options);
    });

  trends
    .command("articles")
    .description("List the articles in a trend")
    .argument("<id-or-slug>")
    .option("--page <n>")
    .option("--per-page <n>")
    .action(
      async (value: string, options: { page?: string; perPage?: string }, command: Command) => {
        const { client, options: output } = await openClient(globalOf(command));
        print(
          await client.trends.articles(asIdOrSlug(value), {
            page: options.page === undefined ? undefined : parseIntArg(options.page, "page"),
            perPage:
              options.perPage === undefined ? undefined : parseIntArg(options.perPage, "per-page"),
          }),
          output,
        );
      },
    );

  const videos = program.command("videos").description("Browse videos");

  videos
    .command("list")
    .description("List videos")
    .option("--page <n>")
    .option("--per-page <n>")
    .action(async (options: { page?: string; perPage?: string }, command: Command) => {
      const { client, options: output } = await openClient(globalOf(command));
      print(
        await client.videos.list({
          page: options.page === undefined ? undefined : parseIntArg(options.page, "page"),
          perPage:
            options.perPage === undefined ? undefined : parseIntArg(options.perPage, "per-page"),
        }),
        output,
      );
    });

  const podcasts = program.command("podcast-episodes").description("Browse podcast episodes");

  podcasts
    .command("list")
    .description("List podcast episodes")
    .option("--username <username>")
    .option("--page <n>")
    .option("--per-page <n>")
    .action(
      async (options: { username?: string; page?: string; perPage?: string }, command: Command) => {
        const { client, options: output } = await openClient(globalOf(command));
        print(
          await client.podcastEpisodes.list({
            username: options.username,
            page: options.page === undefined ? undefined : parseIntArg(options.page, "page"),
            perPage:
              options.perPage === undefined ? undefined : parseIntArg(options.perPage, "per-page"),
          }),
          output,
        );
      },
    );

  program
    .command("profile-images")
    .description("Get a user's profile images")
    .argument("<username>")
    .action(async (username: string, _options: unknown, command: Command) => {
      const { client, options } = await openClient(globalOf(command));
      print(await client.profileImages.get(username), options);
    });

  program
    .command("instance")
    .description("Show metadata about this Forem instance")
    .action(async (_options: unknown, command: Command) => {
      const { client, options } = await openClient(globalOf(command));
      print(await client.instance.get(), options);
    });

  program
    .command("subforems")
    .description("List subforems")
    .action(async (_options: unknown, command: Command) => {
      const { client, options } = await openClient(globalOf(command));
      print(await client.subforems.list(), options);
    });

  const health = program.command("health").description("Public health checks");

  for (const name of ["app", "database", "cache"] as const) {
    health
      .command(name)
      .description(`Check the ${name}`)
      .option("--token <token>", "health check token, if the instance requires one")
      .action(async (options: { token?: string }, command: Command) => {
        const { client, options: output } = await openClient(globalOf(command));
        const result = await client.healthChecks.check(name as HealthCheckName, options.token);
        print({ check: name, status: result }, output);
      });
  }
}
