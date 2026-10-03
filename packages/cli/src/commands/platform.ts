/**
 * The remaining resource groups: concepts, badges, badge achievements,
 * recommended lists, surveys, request redirects, feedback messages.
 *
 * Several of these are admin-only and are marked as such in the help text.
 */

import { Command } from "commander";
import {
  asIdOrSlug,
  confirm,
  dryRunNotice,
  globalOf,
  openClient,
  parseIntArg,
  readJsonInput,
} from "../helpers.js";
import { info, print, success } from "../output.js";
import type {
  BadgeAchievementPayload,
  BadgePayload,
  ConceptPayload,
  RecommendedArticlesListPayload,
  RequestRedirectPayload,
} from "@dishant0406/dev-to";

export function registerPlatformCommands(program: Command): void {
  registerConcepts(program);
  registerBadges(program);
  registerBadgeAchievements(program);
  registerRecommendedLists(program);
  registerSurveys(program);
  registerRequestRedirects(program);
  registerFeedbackMessages(program);
}

function registerConcepts(program: Command): void {
  const concepts = program.command("concepts").description("Concepts (topic extraction)");

  concepts
    .command("list")
    .description("List concepts")
    .option("--page <n>")
    .option("--per-page <n>")
    .option("--days <n>")
    .action(
      async (options: { page?: string; perPage?: string; days?: string }, command: Command) => {
        const { client, options: output } = await openClient(globalOf(command));
        print(
          await client.concepts.list({
            page: options.page === undefined ? undefined : parseIntArg(options.page, "page"),
            perPage:
              options.perPage === undefined ? undefined : parseIntArg(options.perPage, "per-page"),
            days: options.days === undefined ? undefined : parseIntArg(options.days, "days"),
          }),
          output,
        );
      },
    );

  concepts
    .command("get")
    .description("Get a concept")
    .argument("<id>")
    .option("--days <n>")
    .action(async (id: string, options: { days?: string }, command: Command) => {
      const { client, options: output } = await openClient(globalOf(command));
      print(
        await client.concepts.get(
          parseIntArg(id, "id"),
          options.days === undefined ? undefined : parseIntArg(options.days, "days"),
        ),
        output,
      );
    });

  concepts
    .command("articles")
    .description("List the articles in a concept")
    .argument("<id>")
    .option("--sort <sort>")
    .option("--page <n>")
    .option("--per-page <n>")
    .action(
      async (
        id: string,
        options: { sort?: string; page?: string; perPage?: string },
        command: Command,
      ) => {
        const { client, options: output } = await openClient(globalOf(command));
        print(
          await client.concepts.articles(parseIntArg(id, "id"), {
            sort: options.sort,
            page: options.page === undefined ? undefined : parseIntArg(options.page, "page"),
            perPage:
              options.perPage === undefined ? undefined : parseIntArg(options.perPage, "per-page"),
          }),
          output,
        );
      },
    );

  concepts
    .command("update")
    .description("Update a concept from a JSON file")
    .argument("<id>")
    .requiredOption("--data <json>", "JSON body, @file.json, or - for stdin")
    .action(async (id: string, options: { data: string }, command: Command) => {
      const context = await openClient(globalOf(command));
      const payload = (await readJsonInput(options.data)) as ConceptPayload;
      const conceptId = parseIntArg(id, "id");

      if (context.dryRun) {
        dryRunNotice(`PATCH /api/concepts/${conceptId}`, { concept: payload }, context.options);
        return;
      }
      print(await context.client.concepts.update(conceptId, payload), context.options);
    });

  const admin = concepts
    .command("admin")
    .description("Admin concept management (needs an admin key)");

  admin
    .command("list")
    .description("List concepts")
    .option("--page <n>")
    .option("--per-page <n>")
    .action(async (options: { page?: string; perPage?: string }, command: Command) => {
      const { client, options: output } = await openClient(globalOf(command));
      print(
        await client.concepts.adminList({
          page: options.page === undefined ? undefined : parseIntArg(options.page, "page"),
          perPage:
            options.perPage === undefined ? undefined : parseIntArg(options.perPage, "per-page"),
        }),
        output,
      );
    });

  admin
    .command("get")
    .description("Get a concept")
    .argument("<id>")
    .action(async (id: string, _options: unknown, command: Command) => {
      const { client, options } = await openClient(globalOf(command));
      print(await client.concepts.adminGet(parseIntArg(id, "id")), options);
    });

  admin
    .command("create")
    .description("Create a concept from a JSON file")
    .requiredOption("--data <json>", "JSON body, @file.json, or - for stdin")
    .action(async (options: { data: string }, command: Command) => {
      const context = await openClient(globalOf(command));
      const payload = (await readJsonInput(options.data)) as ConceptPayload;

      if (context.dryRun) {
        dryRunNotice("POST /api/admin/concepts", { concept: payload }, context.options);
        return;
      }
      print(await context.client.concepts.adminCreate(payload), context.options);
    });

  admin
    .command("update")
    .description("Update a concept from a JSON file")
    .argument("<id>")
    .requiredOption("--data <json>", "JSON body, @file.json, or - for stdin")
    .action(async (id: string, options: { data: string }, command: Command) => {
      const context = await openClient(globalOf(command));
      const payload = (await readJsonInput(options.data)) as ConceptPayload;
      const conceptId = parseIntArg(id, "id");

      if (context.dryRun) {
        dryRunNotice(
          `PATCH /api/admin/concepts/${conceptId}`,
          { concept: payload },
          context.options,
        );
        return;
      }
      print(await context.client.concepts.adminUpdate(conceptId, payload), context.options);
    });

  admin
    .command("delete")
    .description("Delete a concept")
    .argument("<id>")
    .action(async (id: string, _options: unknown, command: Command) => {
      const context = await openClient(globalOf(command));
      const conceptId = parseIntArg(id, "id");

      if (context.dryRun) {
        dryRunNotice(`DELETE /api/admin/concepts/${conceptId}`, {}, context.options);
        return;
      }

      const ok = await confirm(`Delete concept ${conceptId}?`, { yes: context.global.yes });
      if (!ok) {
        info("Cancelled.", context.options);
        return;
      }
      await context.client.concepts.adminDelete(conceptId);
      success("Concept deleted.", context.options);
    });

  admin
    .command("trigger-lookback")
    .description("Re-scan past articles for a concept")
    .argument("<id>")
    .requiredOption("--days <n>")
    .action(async (id: string, options: { days: string }, command: Command) => {
      const context = await openClient(globalOf(command));
      const conceptId = parseIntArg(id, "id");
      const days = parseIntArg(options.days, "days");

      if (context.dryRun) {
        dryRunNotice(
          `POST /api/admin/concepts/${conceptId}/trigger_lookback`,
          { days },
          context.options,
        );
        return;
      }
      print(await context.client.concepts.adminTriggerLookback(conceptId, days), context.options);
    });
}

function registerBadges(program: Command): void {
  const badges = program.command("badges").description("Badges");

  badges
    .command("list")
    .description("List badges")
    .option("--page <n>")
    .action(async (options: { page?: string }, command: Command) => {
      const { client, options: output } = await openClient(globalOf(command));
      print(
        await client.badges.list({
          page: options.page === undefined ? undefined : parseIntArg(options.page, "page"),
        }),
        output,
      );
    });

  badges
    .command("get")
    .description("Get a badge")
    .argument("<id>")
    .action(async (id: string, _options: unknown, command: Command) => {
      const { client, options } = await openClient(globalOf(command));
      print(await client.badges.get(parseIntArg(id, "id")), options);
    });

  badges
    .command("create")
    .description("Create a badge from a JSON file")
    .requiredOption("--data <json>", "JSON body, @file.json, or - for stdin")
    .action(async (options: { data: string }, command: Command) => {
      const context = await openClient(globalOf(command));
      const payload = (await readJsonInput(options.data)) as BadgePayload;

      if (context.dryRun) {
        dryRunNotice("POST /api/badges", { badge: payload }, context.options);
        return;
      }
      print(await context.client.badges.create(payload), context.options);
    });

  badges
    .command("update")
    .description("Update a badge from a JSON file")
    .argument("<id>")
    .requiredOption("--data <json>", "JSON body, @file.json, or - for stdin")
    .action(async (id: string, options: { data: string }, command: Command) => {
      const context = await openClient(globalOf(command));
      const payload = (await readJsonInput(options.data)) as BadgePayload;
      const badgeId = parseIntArg(id, "id");

      if (context.dryRun) {
        dryRunNotice(`PATCH /api/badges/${badgeId}`, { badge: payload }, context.options);
        return;
      }
      print(await context.client.badges.update(badgeId, payload), context.options);
    });

  badges
    .command("delete")
    .description("Delete a badge")
    .argument("<id>")
    .action(async (id: string, _options: unknown, command: Command) => {
      const context = await openClient(globalOf(command));
      const badgeId = parseIntArg(id, "id");

      if (context.dryRun) {
        dryRunNotice(`DELETE /api/badges/${badgeId}`, {}, context.options);
        return;
      }

      const ok = await confirm(`Delete badge ${badgeId}?`, { yes: context.global.yes });
      if (!ok) {
        info("Cancelled.", context.options);
        return;
      }
      await context.client.badges.delete(badgeId);
      success("Badge deleted.", context.options);
    });
}

function registerBadgeAchievements(program: Command): void {
  const achievements = program.command("badge-achievements").description("Badge awards");

  achievements
    .command("list")
    .description("List badge awards")
    .option("--page <n>")
    .action(async (options: { page?: string }, command: Command) => {
      const { client, options: output } = await openClient(globalOf(command));
      print(
        await client.badgeAchievements.list({
          page: options.page === undefined ? undefined : parseIntArg(options.page, "page"),
        }),
        output,
      );
    });

  achievements
    .command("get")
    .description("Get a badge award")
    .argument("<id>")
    .action(async (id: string, _options: unknown, command: Command) => {
      const { client, options } = await openClient(globalOf(command));
      print(await client.badgeAchievements.get(parseIntArg(id, "id")), options);
    });

  achievements
    .command("create")
    .description("Award a badge to a user")
    .requiredOption("--user <id>")
    .requiredOption("--badge <id>")
    .option("--message <markdown>", "message shown with the award")
    .option("--include-default-description")
    .action(
      async (
        options: {
          user: string;
          badge: string;
          message?: string;
          includeDefaultDescription?: boolean;
        },
        command: Command,
      ) => {
        const context = await openClient(globalOf(command));
        const payload: BadgeAchievementPayload = {
          user_id: parseIntArg(options.user, "user"),
          badge_id: parseIntArg(options.badge, "badge"),
          rewarding_context_message_markdown: options.message,
          include_default_description: options.includeDefaultDescription,
        };

        if (context.dryRun) {
          dryRunNotice(
            "POST /api/badge_achievements",
            { badge_achievement: payload },
            context.options,
          );
          return;
        }
        print(await context.client.badgeAchievements.create(payload), context.options);
      },
    );

  achievements
    .command("delete")
    .description("Revoke a badge award")
    .argument("<id>")
    .action(async (id: string, _options: unknown, command: Command) => {
      const context = await openClient(globalOf(command));
      const achievementId = parseIntArg(id, "id");

      if (context.dryRun) {
        dryRunNotice(`DELETE /api/badge_achievements/${achievementId}`, {}, context.options);
        return;
      }

      const ok = await confirm(`Revoke badge award ${achievementId}?`, { yes: context.global.yes });
      if (!ok) {
        info("Cancelled.", context.options);
        return;
      }
      await context.client.badgeAchievements.delete(achievementId);
      success("Badge award revoked.", context.options);
    });
}

function registerRecommendedLists(program: Command): void {
  const lists = program.command("recommended-lists").description("Recommended article lists");

  lists
    .command("list")
    .description("List recommended article lists")
    .option("--page <n>")
    .option("--search <text>")
    .action(async (options: { page?: string; search?: string }, command: Command) => {
      const { client, options: output } = await openClient(globalOf(command));
      print(
        await client.recommendedLists.list({
          page: options.page === undefined ? undefined : parseIntArg(options.page, "page"),
          search: options.search,
        }),
        output,
      );
    });

  lists
    .command("get")
    .description("Get a recommended article list")
    .argument("<id>")
    .action(async (id: string, _options: unknown, command: Command) => {
      const { client, options } = await openClient(globalOf(command));
      print(await client.recommendedLists.get(parseIntArg(id, "id")), options);
    });

  lists
    .command("create")
    .description("Create a recommended article list from a JSON file")
    .requiredOption("--data <json>", "JSON body, @file.json, or - for stdin")
    .action(async (options: { data: string }, command: Command) => {
      const context = await openClient(globalOf(command));
      const payload = (await readJsonInput(options.data)) as RecommendedArticlesListPayload;

      if (context.dryRun) {
        dryRunNotice("POST /api/recommended_articles_lists", payload, context.options);
        return;
      }
      print(await context.client.recommendedLists.create(payload), context.options);
    });

  lists
    .command("update")
    .description("Update a recommended article list from a JSON file")
    .argument("<id>")
    .requiredOption("--data <json>", "JSON body, @file.json, or - for stdin")
    .action(async (id: string, options: { data: string }, command: Command) => {
      const context = await openClient(globalOf(command));
      const payload = (await readJsonInput(options.data)) as RecommendedArticlesListPayload;
      const listId = parseIntArg(id, "id");

      if (context.dryRun) {
        dryRunNotice(`PATCH /api/recommended_articles_lists/${listId}`, payload, context.options);
        return;
      }
      print(await context.client.recommendedLists.update(listId, payload), context.options);
    });
}

function registerSurveys(program: Command): void {
  const surveys = program.command("surveys").description("Surveys and polls");

  surveys
    .command("list")
    .description("List surveys")
    .option("--page <n>")
    .option("--per-page <n>")
    .option("--active", "only active surveys")
    .action(
      async (options: { page?: string; perPage?: string; active?: boolean }, command: Command) => {
        const { client, options: output } = await openClient(globalOf(command));
        print(
          await client.surveys.list({
            page: options.page === undefined ? undefined : parseIntArg(options.page, "page"),
            perPage:
              options.perPage === undefined ? undefined : parseIntArg(options.perPage, "per-page"),
            active: options.active,
          }),
          output,
        );
      },
    );

  surveys
    .command("get")
    .description("Get a survey with its polls")
    .argument("<id-or-slug>")
    .action(async (value: string, _options: unknown, command: Command) => {
      const { client, options } = await openClient(globalOf(command));
      print(await client.surveys.get(asIdOrSlug(value)), options);
    });

  surveys
    .command("poll-votes")
    .description("List poll votes")
    .argument("<id-or-slug>")
    .option("--per-page <n>")
    .option("--after <id>")
    .action(
      async (value: string, options: { perPage?: string; after?: string }, command: Command) => {
        const { client, options: output } = await openClient(globalOf(command));
        print(
          await client.surveys.pollVotes(asIdOrSlug(value), {
            perPage:
              options.perPage === undefined ? undefined : parseIntArg(options.perPage, "per-page"),
            after: options.after === undefined ? undefined : parseIntArg(options.after, "after"),
          }),
          output,
        );
      },
    );

  surveys
    .command("poll-text-responses")
    .description("List written poll responses")
    .argument("<id-or-slug>")
    .option("--per-page <n>")
    .option("--after <id>")
    .action(
      async (value: string, options: { perPage?: string; after?: string }, command: Command) => {
        const { client, options: output } = await openClient(globalOf(command));
        print(
          await client.surveys.pollTextResponses(asIdOrSlug(value), {
            perPage:
              options.perPage === undefined ? undefined : parseIntArg(options.perPage, "per-page"),
            after: options.after === undefined ? undefined : parseIntArg(options.after, "after"),
          }),
          output,
        );
      },
    );
}

function registerRequestRedirects(program: Command): void {
  const redirects = program
    .command("request-redirects")
    .description("Redirect old URLs (admin key required)");

  redirects
    .command("list")
    .description("List redirects")
    .option("--page <n>")
    .option("--per-page <n>")
    .action(async (options: { page?: string; perPage?: string }, command: Command) => {
      const { client, options: output } = await openClient(globalOf(command));
      print(
        await client.requestRedirects.list({
          page: options.page === undefined ? undefined : parseIntArg(options.page, "page"),
          perPage:
            options.perPage === undefined ? undefined : parseIntArg(options.perPage, "per-page"),
        }),
        output,
      );
    });

  redirects
    .command("get")
    .description("Get a redirect")
    .argument("<id>")
    .action(async (id: string, _options: unknown, command: Command) => {
      const { client, options } = await openClient(globalOf(command));
      print(await client.requestRedirects.get(parseIntArg(id, "id")), options);
    });

  redirects
    .command("create")
    .description("Create a redirect")
    .requiredOption("--original-url <url>")
    .requiredOption("--destination-url <url>")
    .requiredOption("--request-domain <domain>")
    .action(
      async (
        options: { originalUrl: string; destinationUrl: string; requestDomain: string },
        command: Command,
      ) => {
        const context = await openClient(globalOf(command));
        const payload: RequestRedirectPayload = {
          original_url: options.originalUrl,
          destination_url: options.destinationUrl,
          request_domain: options.requestDomain,
        };

        if (context.dryRun) {
          dryRunNotice(
            "POST /api/admin/request_redirects",
            { request_redirect: payload },
            context.options,
          );
          return;
        }
        print(await context.client.requestRedirects.create(payload), context.options);
      },
    );

  redirects
    .command("update")
    .description("Update a redirect")
    .argument("<id>")
    .option("--original-url <url>")
    .option("--destination-url <url>")
    .option("--request-domain <domain>")
    .action(
      async (
        id: string,
        options: { originalUrl?: string; destinationUrl?: string; requestDomain?: string },
        command: Command,
      ) => {
        const context = await openClient(globalOf(command));
        const payload: RequestRedirectPayload = {
          original_url: options.originalUrl,
          destination_url: options.destinationUrl,
          request_domain: options.requestDomain,
        };
        const redirectId = parseIntArg(id, "id");

        if (context.dryRun) {
          dryRunNotice(
            `PATCH /api/admin/request_redirects/${redirectId}`,
            { request_redirect: payload },
            context.options,
          );
          return;
        }
        print(await context.client.requestRedirects.update(redirectId, payload), context.options);
      },
    );

  redirects
    .command("delete")
    .description("Delete a redirect")
    .argument("<id>")
    .action(async (id: string, _options: unknown, command: Command) => {
      const context = await openClient(globalOf(command));
      const redirectId = parseIntArg(id, "id");

      if (context.dryRun) {
        dryRunNotice(`DELETE /api/admin/request_redirects/${redirectId}`, {}, context.options);
        return;
      }

      const ok = await confirm(`Delete redirect ${redirectId}?`, { yes: context.global.yes });
      if (!ok) {
        info("Cancelled.", context.options);
        return;
      }
      await context.client.requestRedirects.delete(redirectId);
      success("Redirect deleted.", context.options);
    });
}

function registerFeedbackMessages(program: Command): void {
  program
    .command("feedback-messages")
    .description("Update the status of a feedback message")
    .argument("<id>")
    .requiredOption("--status <status>", 'for example "Resolved"')
    .action(async (id: string, options: { status: string }, command: Command) => {
      const context = await openClient(globalOf(command));
      const messageId = parseIntArg(id, "id");

      if (context.dryRun) {
        dryRunNotice(
          `PATCH /api/feedback_messages/${messageId}`,
          { feedback_message: { status: options.status } },
          context.options,
        );
        return;
      }
      print(
        await context.client.feedbackMessages.update(messageId, options.status),
        context.options,
      );
    });
}
