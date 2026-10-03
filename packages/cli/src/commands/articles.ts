/**
 * `devto articles ...` — reading, writing and publishing articles.
 *
 * The markdown workflow is the important one:
 *   devto articles create --file post.md
 *   devto articles push   --file post.md   (create the first time, update after that)
 */

import { Command } from "commander";
import { confirm, dryRunNotice, globalOf, openClient, parseIntArg } from "../helpers.js";
import { info, print, success } from "../output.js";
import { readArticleFile, writeArticleId } from "../frontmatter.js";
import type { ListArticlesParams } from "@dishant0406/dev-to";

export function registerArticlesCommands(program: Command): void {
  const articles = program.command("articles").description("Read, write and publish articles");

  articles
    .command("list")
    .description("List articles")
    .option("--tag <tag>")
    .option("--tags <tags>", "comma-separated tags that must all be present")
    .option("--tags-exclude <tags>")
    .option("--username <username>")
    .option("--state <state>", "fresh, rising or all")
    .option("--top <days>")
    .option("--collection-id <id>")
    .option("--page <n>")
    .option("--per-page <n>")
    .option("--all", "fetch every page")
    .action(async (options: ListOptions, command: Command) => {
      const { client, options: output } = await openClient(globalOf(command));

      const params: ListArticlesParams = {
        tag: options.tag,
        tags: options.tags,
        tagsExclude: options.tagsExclude,
        username: options.username,
        state: options.state as ListArticlesParams["state"],
        top: options.top === undefined ? undefined : parseIntArg(options.top, "top"),
        collectionId:
          options.collectionId === undefined
            ? undefined
            : parseIntArg(options.collectionId, "collection-id"),
        page: options.page === undefined ? undefined : parseIntArg(options.page, "page"),
        perPage:
          options.perPage === undefined ? undefined : parseIntArg(options.perPage, "per-page"),
      };

      if (options.all === true) {
        const perPage = params.perPage ?? 30;
        const all = await client.pageAll((p) => client.articles.list({ ...params, ...p }), perPage);
        print(all, output);
        return;
      }

      print(await client.articles.list(params), output);
    });

  articles
    .command("latest")
    .description("List the most recently published articles")
    .option("--page <n>")
    .option("--per-page <n>")
    .option("--all", "fetch every page")
    .action(async (options: PageOptions, command: Command) => {
      const { client, options: output } = await openClient(globalOf(command));
      const perPage =
        options.perPage === undefined ? undefined : parseIntArg(options.perPage, "per-page");
      const page = options.page === undefined ? undefined : parseIntArg(options.page, "page");

      if (options.all === true) {
        print(await client.pageAll((p) => client.articles.latest(p), perPage ?? 30), output);
        return;
      }
      print(await client.articles.latest({ page, perPage }), output);
    });

  articles
    .command("search")
    .description("Search articles")
    .requiredOption("-q, --query <text>")
    .option("--top <n>")
    .option("--page <n>")
    .option("--per-page <n>")
    .action(
      async (
        options: { query: string; top?: string; page?: string; perPage?: string },
        command: Command,
      ) => {
        const { client, options: output } = await openClient(globalOf(command));
        print(
          await client.articles.search({
            q: options.query,
            top: options.top === undefined ? undefined : parseIntArg(options.top, "top"),
            page: options.page === undefined ? undefined : parseIntArg(options.page, "page"),
            perPage:
              options.perPage === undefined ? undefined : parseIntArg(options.perPage, "per-page"),
          }),
          output,
        );
      },
    );

  articles
    .command("get")
    .description("Get one article by id")
    .argument("<id>")
    .action(async (id: string, _options: unknown, command: Command) => {
      const { client, options } = await openClient(globalOf(command));
      print(await client.articles.get(parseIntArg(id, "id")), options);
    });

  articles
    .command("get-by-path")
    .description("Get one article by author and slug")
    .argument("<username>")
    .argument("<slug>")
    .action(async (username: string, slug: string, _options: unknown, command: Command) => {
      const { client, options } = await openClient(globalOf(command));
      print(await client.articles.getByPath(username, slug), options);
    });

  articles
    .command("mine")
    .description("List your own articles")
    .option("--state <state>", "published, unpublished or all", "published")
    .option("--page <n>")
    .option("--per-page <n>")
    .option("--all", "fetch every page")
    .action(
      async (
        options: { state: string; page?: string; perPage?: string; all?: boolean },
        command: Command,
      ) => {
        const { client, options: output } = await openClient(globalOf(command));
        const perPage =
          options.perPage === undefined ? undefined : parseIntArg(options.perPage, "per-page");
        const page = options.page === undefined ? undefined : parseIntArg(options.page, "page");

        const listPage = (params: { page?: number; perPage?: number }) => {
          if (options.state === "unpublished") return client.articles.mineUnpublished(params);
          if (options.state === "all") return client.articles.mineAll(params);
          return client.articles.mine(params);
        };

        if (options.all === true) {
          const fetchPage = (p: { page: number; perPage?: number }) =>
            listPage({ page: p.page, perPage: p.perPage ?? perPage });
          print(await client.pageAll(fetchPage, perPage ?? 30), output);
          return;
        }
        print(await listPage({ page, perPage }), output);
      },
    );

  articles
    .command("create")
    .description("Create an article from a markdown file (YAML front matter + body)")
    .requiredOption("-f, --file <path>", "path to a markdown file")
    .action(async (options: { file: string }, command: Command) => {
      const context = await openClient(globalOf(command));
      const { payload } = await readArticleFile(options.file);

      if (context.dryRun) {
        dryRunNotice("POST /api/articles", { article: payload }, context.options);
        return;
      }

      const created = await context.client.articles.create(payload);
      success(`Created article ${created.id}`, context.options);
      print({ id: created.id, url: created.url, title: created.title }, context.options);
    });

  articles
    .command("update")
    .description("Update an article from a markdown file")
    .argument("<id>")
    .requiredOption("-f, --file <path>", "path to a markdown file")
    .action(async (id: string, options: { file: string }, command: Command) => {
      const context = await openClient(globalOf(command));
      const { payload } = await readArticleFile(options.file);
      const articleId = parseIntArg(id, "id");

      if (context.dryRun) {
        dryRunNotice(`PUT /api/articles/${articleId}`, { article: payload }, context.options);
        return;
      }

      const updated = await context.client.articles.update(articleId, payload);
      success(`Updated article ${updated.id}`, context.options);
      print({ id: updated.id, url: updated.url, title: updated.title }, context.options);
    });

  articles
    .command("push")
    .description("Create or update an article from a markdown file, and write the id back into it")
    .requiredOption("-f, --file <path>", "path to a markdown file")
    .action(async (options: { file: string }, command: Command) => {
      const context = await openClient(globalOf(command));
      const { id, payload } = await readArticleFile(options.file);

      if (id === undefined) {
        if (context.dryRun) {
          dryRunNotice("POST /api/articles", { article: payload }, context.options);
          return;
        }
        const created = await context.client.articles.create(payload);
        await writeArticleId(options.file, created.id);
        success(
          `Created article ${created.id} and wrote the id into ${options.file}`,
          context.options,
        );
        print({ id: created.id, url: created.url, title: created.title }, context.options);
        return;
      }

      if (context.dryRun) {
        dryRunNotice(`PUT /api/articles/${id}`, { article: payload }, context.options);
        return;
      }
      const updated = await context.client.articles.update(id, payload);
      success(`Updated article ${updated.id}`, context.options);
      print({ id: updated.id, url: updated.url, title: updated.title }, context.options);
    });

  articles
    .command("unpublish")
    .description("Unpublish an article (this takes it off the site)")
    .argument("<id>")
    .option("--note <note>", "reason shown to the author")
    .action(async (id: string, options: { note?: string }, command: Command) => {
      const context = await openClient(globalOf(command));
      const articleId = parseIntArg(id, "id");

      if (context.dryRun) {
        dryRunNotice(
          `PUT /api/articles/${articleId}/unpublish`,
          { note: options.note },
          context.options,
        );
        return;
      }

      const ok = await confirm(`Unpublish article ${articleId}?`, {
        yes: context.global.yes,
        dryRun: context.dryRun,
      });
      if (!ok) {
        info("Cancelled.", context.options);
        return;
      }

      await context.client.articles.unpublish(articleId, options.note);
      success(`Unpublished article ${articleId}`, context.options);
    });
}

interface ListOptions {
  tag?: string;
  tags?: string;
  tagsExclude?: string;
  username?: string;
  state?: string;
  top?: string;
  collectionId?: string;
  page?: string;
  perPage?: string;
  all?: boolean;
}

interface PageOptions {
  page?: string;
  perPage?: string;
  all?: boolean;
}
