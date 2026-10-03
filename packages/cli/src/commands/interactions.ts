/**
 * `devto comments`, `devto reactions`, `devto reading-list`, `devto follows`, `devto followers`.
 */

import { Command } from "commander";
import { globalOf, openClient, parseIntArg, parseNumberList, UsageError } from "../helpers.js";
import { print } from "../output.js";
import type { ReactionCategory, ReactableType } from "@dishant0406/dev-to";

export function registerInteractionCommands(program: Command): void {
  const comments = program.command("comments").description("Read comments");

  comments
    .command("list")
    .description("List comments on an article, or the replies to a comment")
    .option("--article <id>", "article id (required in practice)")
    .option("--parent <id>", "parent comment id")
    .option("--page <n>")
    .option("--per-page <10|30>", "the API only accepts 10 or 30 here")
    .action(
      async (
        options: { article?: string; parent?: string; page?: string; perPage?: string },
        command: Command,
      ) => {
        const { client, options: output } = await openClient(globalOf(command));
        if (options.perPage !== undefined && options.perPage !== "10" && options.perPage !== "30") {
          throw new UsageError('--per-page must be "10" or "30"; the API rejects anything else.');
        }

        print(
          await client.comments.list({
            aId:
              options.article === undefined ? undefined : parseIntArg(options.article, "article"),
            pId: options.parent === undefined ? undefined : parseIntArg(options.parent, "parent"),
            page: options.page === undefined ? undefined : parseIntArg(options.page, "page"),
            perPage: options.perPage,
          }),
          output,
        );
      },
    );

  comments
    .command("get")
    .description("Get one comment by its id code")
    .argument("<id-code>")
    .action(async (idCode: string, _options: unknown, command: Command) => {
      const { client, options } = await openClient(globalOf(command));
      print(await client.comments.get(idCode), options);
    });

  const reactions = program
    .command("reactions")
    .description("React to articles, comments and users");

  for (const action of ["create", "toggle"] as const) {
    reactions
      .command(action)
      .description(
        action === "create"
          ? "Add a reaction (fails if it already exists)"
          : "Add the reaction if missing, remove it if present",
      )
      .requiredOption("--type <type>", "Article, Comment or User")
      .requiredOption("--id <id>", "the id of the thing being reacted to")
      .requiredOption(
        "--category <category>",
        "like, unicorn, exploding_head, raised_hands or fire",
      )
      .action(async (options: { type: string; id: string; category: string }, command: Command) => {
        const { client, options: output } = await openClient(globalOf(command));
        const params = {
          reactableType: options.type as ReactableType,
          reactableId: parseIntArg(options.id, "id"),
          category: options.category as ReactionCategory,
        };
        const result =
          action === "create"
            ? await client.reactions.create(params)
            : await client.reactions.toggle(params);
        print(result, output);
      });
  }

  const readingList = program.command("reading-list").description("Your saved articles");

  readingList
    .command("list")
    .description("List your reading list")
    .option("--page <n>")
    .option("--per-page <n>")
    .option("--all", "fetch every page")
    .action(
      async (options: { page?: string; perPage?: string; all?: boolean }, command: Command) => {
        const { client, options: output } = await openClient(globalOf(command));
        const perPage =
          options.perPage === undefined ? undefined : parseIntArg(options.perPage, "per-page");

        if (options.all === true) {
          print(await client.pageAll((p) => client.readingList.list(p), perPage ?? 30), output);
          return;
        }
        print(
          await client.readingList.list({
            page: options.page === undefined ? undefined : parseIntArg(options.page, "page"),
            perPage,
          }),
          output,
        );
      },
    );

  const follows = program.command("follows").description("Follow users and organizations");

  follows
    .command("create")
    .description("Follow users and/or organizations")
    .option("--users <ids>", "comma-separated user ids")
    .option("--organizations <ids>", "comma-separated organization ids")
    .action(async (options: { users?: string; organizations?: string }, command: Command) => {
      const { client, options: output } = await openClient(globalOf(command));
      print(
        await client.follows.create({
          userIds:
            options.users === undefined ? undefined : parseNumberList(options.users, "users"),
          organizationIds:
            options.organizations === undefined
              ? undefined
              : parseNumberList(options.organizations, "organizations"),
        }),
        output,
      );
    });

  follows
    .command("tags")
    .description("List the tags you follow")
    .action(async (_options: unknown, command: Command) => {
      const { client, options } = await openClient(globalOf(command));
      print(await client.follows.tags(), options);
    });

  const followers = program.command("followers").description("People who follow you");

  followers
    .command("list")
    .description("List your followers")
    .option("--sort <field>")
    .option("--page <n>")
    .option("--per-page <n>")
    .option("--all", "fetch every page")
    .action(
      async (
        options: { sort?: string; page?: string; perPage?: string; all?: boolean },
        command: Command,
      ) => {
        const { client, options: output } = await openClient(globalOf(command));
        const perPage =
          options.perPage === undefined ? undefined : parseIntArg(options.perPage, "per-page");
        const params = { sort: options.sort, page: options.page, perPage };

        if (options.all === true) {
          print(
            await client.pageAll(
              (p) =>
                client.followers.list({
                  sort: params.sort,
                  page: p.page,
                  perPage: p.perPage ?? perPage,
                }),
              perPage ?? 30,
            ),
            output,
          );
          return;
        }
        print(
          await client.followers.list({
            sort: params.sort,
            page: options.page === undefined ? undefined : parseIntArg(options.page, "page"),
            perPage,
          }),
          output,
        );
      },
    );
}
