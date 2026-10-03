/**
 * `devto analytics ...` — all of these need an API key and report on your own content.
 */

import { Command } from "commander";
import { globalOf, openClient, parseIntArg } from "../helpers.js";
import { print } from "../output.js";
import type { AnalyticsParams } from "@dishant0406/dev-to";

interface AnalyticsOptions {
  start?: string;
  end?: string;
  articleId?: string;
  organizationId?: string;
}

function toParams(options: AnalyticsOptions): AnalyticsParams {
  return {
    start: options.start,
    end: options.end,
    articleId:
      options.articleId === undefined ? undefined : parseIntArg(options.articleId, "article-id"),
    organizationId:
      options.organizationId === undefined
        ? undefined
        : parseIntArg(options.organizationId, "organization-id"),
  };
}

function addCommonOptions(command: Command): Command {
  return command
    .option("--start <date>", "start date, YYYY-MM-DD")
    .option("--end <date>", "end date, YYYY-MM-DD")
    .option("--article-id <id>")
    .option("--organization-id <id>");
}

export function registerAnalyticsCommands(program: Command): void {
  const analytics = program.command("analytics").description("Your content's performance");

  const endpoints = [
    { name: "totals", description: "Lifetime totals" },
    { name: "historical", description: "Daily counts over a date range" },
    { name: "past-day", description: "The last 24 hours" },
    { name: "referrers", description: "Where your readers came from" },
    { name: "top-contributors", description: "Your most engaged readers" },
    { name: "follower-engagement", description: "Follower activity over time" },
    { name: "dashboard", description: "A summary of everything" },
    { name: "heatmap", description: "Reading activity by day" },
  ] as const;

  for (const endpoint of endpoints) {
    addCommonOptions(analytics.command(endpoint.name).description(endpoint.description)).action(
      async (options: AnalyticsOptions, command: Command) => {
        const { client, options: output } = await openClient(globalOf(command));
        const params = toParams(options);

        const result = await {
          totals: () => client.analytics.totals(params),
          historical: () => client.analytics.historical(params),
          "past-day": () => client.analytics.pastDay(params),
          referrers: () => client.analytics.referrers(params),
          "top-contributors": () => client.analytics.topContributors(params),
          "follower-engagement": () => client.analytics.followerEngagement(params),
          dashboard: () => client.analytics.dashboard(params),
          heatmap: () => client.analytics.heatmap(params),
        }[endpoint.name]();

        print(result, output);
      },
    );
  }
}
