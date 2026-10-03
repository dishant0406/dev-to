/**
 * Query-parameter and body mapping for every method that takes options.
 *
 * `coverage.test.ts` proves each operation hits the right method and path. This
 * file proves the other half of the contract: that camelCase options become the
 * API's snake_case parameters, and that request bodies are wrapped the way the
 * API expects. A wrong name here is invisible until runtime, so each one is
 * pinned by a test.
 */

import { describe, expect, it } from "vitest";
import { DevToClient } from "../src/index.js";
import { fakeFetch, pathOf, queryOf } from "./fakeFetch.js";

interface Case {
  /** What the test is checking. */
  name: string;
  /** The call to make. */
  run: (devto: DevToClient) => Promise<unknown>;
  /** The exact query string the API should receive. */
  query?: Record<string, string>;
  /** The exact JSON body the API should receive. */
  body?: string;
  /** The path, when it is not obvious from the name. */
  path?: string;
}

function setup() {
  const fetchFn = fakeFetch({ status: 204, body: "" });
  const devto = new DevToClient({ apiKey: "k", fetch: fetchFn, throttle: { enabled: false } });
  return { devto, fetchFn };
}

const CASES: Case[] = [
  // --- articles ---
  {
    name: "articles.list maps every filter",
    run: (d) =>
      d.articles.list({
        page: 2,
        perPage: 5,
        tag: "rust",
        tags: "rust,wasm",
        tagsExclude: "ai",
        username: "ben",
        state: "rising",
        top: 7,
        collectionId: 12,
      }),
    query: {
      page: "2",
      per_page: "5",
      tag: "rust",
      tags: "rust,wasm",
      tags_exclude: "ai",
      username: "ben",
      state: "rising",
      top: "7",
      collection_id: "12",
    },
  },
  {
    name: "articles.search",
    run: (d) => d.articles.search({ q: "x", top: 3, page: 2, perPage: 4 }),
    query: { q: "x", top: "3", page: "2", per_page: "4" },
  },
  {
    name: "articles.latest",
    run: (d) => d.articles.latest({ page: 2, perPage: 4 }),
    query: { page: "2", per_page: "4" },
  },
  {
    name: "articles.create wraps the payload",
    run: (d) => d.articles.create({ title: "T", tags: "rust" }),
    body: '{"article":{"title":"T","tags":"rust"}}',
  },
  {
    name: "articles.update wraps the payload",
    run: (d) => d.articles.update(5, { title: "T" }),
    body: '{"article":{"title":"T"}}',
  },
  {
    name: "articles.unpublish sends the note as a query parameter",
    run: (d) => d.articles.unpublish(5, "why"),
    query: { note: "why" },
  },
  {
    name: "articles.mine",
    run: (d) => d.articles.mine({ page: 3, perPage: 6 }),
    query: { page: "3", per_page: "6" },
  },
  {
    name: "articles.minePublished",
    run: (d) => d.articles.minePublished({ perPage: 6 }),
    query: { per_page: "6" },
  },
  {
    name: "articles.mineUnpublished",
    run: (d) => d.articles.mineUnpublished({ page: 2 }),
    query: { page: "2" },
  },
  { name: "articles.mineAll", run: (d) => d.articles.mineAll({ page: 2 }), query: { page: "2" } },

  // --- users ---
  { name: "users.search", run: (d) => d.users.search("a@b.co"), query: { email: "a@b.co" } },
  {
    name: "users.adminList",
    run: (d) => d.users.adminList({ page: 2, perPage: 3, email: "a@b.co", username: "ben" }),
    query: { page: "2", per_page: "3", email: "a@b.co", username: "ben" },
  },
  {
    name: "users.adminUpdate sends a flat body",
    run: (d) => d.users.adminUpdate(1, { name: "N", website_url: "u" }),
    body: '{"name":"N","website_url":"u"}',
  },
  {
    name: "users.adminUpdateEmail",
    run: (d) => d.users.adminUpdateEmail(1, "a@b.co"),
    body: '{"email":"a@b.co"}',
  },
  {
    name: "users.adminUpdateStatus",
    run: (d) => d.users.adminUpdateStatus(1, { status: "s", note: "n" }),
    body: '{"status":"s","note":"n"}',
  },
  {
    name: "users.adminUpdateNotificationSettings nests the setting",
    run: (d) =>
      d.users.adminUpdateNotificationSettings(1, {
        notification_setting: { email_newsletter: true },
      }),
    body: '{"notification_setting":{"email_newsletter":true}}',
  },
  { name: "users.adminMerge", run: (d) => d.users.adminMerge(1, 2), body: '{"merge_user_id":2}' },
  {
    name: "users.adminCreateNote",
    run: (d) => d.users.adminCreateNote(1, { content: "c", reason: "r" }),
    body: '{"content":"c","reason":"r"}',
  },
  {
    name: "users.adminCreateIdentity",
    run: (d) => d.users.adminCreateIdentity(1, { provider: "p", uid: "u" }),
    body: '{"provider":"p","uid":"u"}',
  },
  {
    name: "users.adminBulkIdentities",
    run: (d) =>
      d.users.adminBulkIdentities({ provider: "p", identities: [{ user_id: 1, uid: "u" }] }),
    body: '{"provider":"p","identities":[{"user_id":1,"uid":"u"}]}',
  },

  // --- comments and reactions ---
  {
    name: "comments.list maps a_id, p_id and the string per_page",
    run: (d) => d.comments.list({ aId: 1, pId: 2, page: 3, perPage: "30" }),
    query: { a_id: "1", p_id: "2", page: "3", per_page: "30" },
  },
  {
    name: "reactions.create puts everything in the query string",
    run: (d) => d.reactions.create({ category: "fire", reactableId: 4, reactableType: "Comment" }),
    query: { category: "fire", reactable_id: "4", reactable_type: "Comment" },
  },
  {
    name: "reactions.toggle puts everything in the query string",
    run: (d) => d.reactions.toggle({ category: "fire", reactableId: 4, reactableType: "Comment" }),
    query: { category: "fire", reactable_id: "4", reactable_type: "Comment" },
  },

  // --- reading list, follows, followers ---
  {
    name: "readingList.list",
    run: (d) => d.readingList.list({ page: 2, perPage: 3 }),
    query: { page: "2", per_page: "3" },
  },
  {
    name: "follows.create",
    run: (d) => d.follows.create({ userIds: [1, 2], organizationIds: [3] }),
    body: '{"user_ids":[1,2],"organization_ids":[3]}',
  },
  {
    name: "followers.list",
    run: (d) => d.followers.list({ page: 2, perPage: 3, sort: "created_at" }),
    query: { page: "2", per_page: "3", sort: "created_at" },
  },

  // --- analytics ---
  {
    name: "analytics.totals",
    run: (d) => d.analytics.totals({ articleId: 1, organizationId: 2 }),
    query: { article_id: "1", organization_id: "2" },
  },
  {
    name: "analytics.historical",
    run: (d) => d.analytics.historical({ start: "2026-01-01", end: "2026-02-01", articleId: 1 }),
    query: { start: "2026-01-01", end: "2026-02-01", article_id: "1" },
  },
  {
    name: "analytics.pastDay uses the past_day path",
    run: (d) => d.analytics.pastDay({ organizationId: 2 }),
    path: "/api/analytics/past_day",
    query: { organization_id: "2" },
  },
  {
    name: "analytics.referrers",
    run: (d) => d.analytics.referrers({ start: "2026-01-01" }),
    query: { start: "2026-01-01" },
  },
  {
    name: "analytics.topContributors",
    run: (d) => d.analytics.topContributors({ articleId: 1 }),
    query: { article_id: "1" },
  },
  {
    name: "analytics.followerEngagement",
    run: (d) => d.analytics.followerEngagement({ start: "2026-01-01" }),
    query: { start: "2026-01-01" },
  },
  {
    name: "analytics.dashboard",
    run: (d) => d.analytics.dashboard({ articleId: 1 }),
    query: { article_id: "1" },
  },
  {
    name: "analytics.heatmap",
    run: (d) => d.analytics.heatmap({ end: "2026-01-01" }),
    query: { end: "2026-01-01" },
  },

  // --- discovery ---
  {
    name: "tags.list",
    run: (d) => d.tags.list({ page: 2, perPage: 3 }),
    query: { page: "2", per_page: "3" },
  },
  {
    name: "trends.list",
    run: (d) => d.trends.list({ page: 2, perPage: 3 }),
    query: { page: "2", per_page: "3" },
  },
  {
    name: "trends.articles",
    run: (d) => d.trends.articles("t", { page: 2, perPage: 3 }),
    query: { page: "2", per_page: "3" },
  },
  {
    name: "videos.list",
    run: (d) => d.videos.list({ page: 2, perPage: 3 }),
    query: { page: "2", per_page: "3" },
  },
  {
    name: "podcastEpisodes.list",
    run: (d) => d.podcastEpisodes.list({ username: "ben", page: 2 }),
    query: { username: "ben", page: "2" },
  },

  // --- organizations, pages, segments, billboards ---
  {
    name: "organizations.list",
    run: (d) => d.organizations.list({ page: 2, perPage: 3 }),
    query: { page: "2", per_page: "3" },
  },
  {
    name: "organizations.users",
    run: (d) => d.organizations.users("org", { page: 2 }),
    query: { page: "2" },
  },
  {
    name: "organizations.articles",
    run: (d) => d.organizations.articles(7, { perPage: 3 }),
    query: { per_page: "3" },
  },
  {
    name: "organizations.create sends a flat body",
    run: (d) => d.organizations.create({ name: "N", summary: "S" }),
    body: '{"name":"N","summary":"S"}',
  },
  {
    name: "pages.create sends a flat body",
    run: (d) => d.pages.create({ title: "T", template: "contained" }),
    body: '{"title":"T","template":"contained"}',
  },
  { name: "segments.list", run: (d) => d.segments.list({ perPage: 3 }), query: { per_page: "3" } },
  {
    name: "segments.users",
    run: (d) => d.segments.users(1, { perPage: 3 }),
    query: { per_page: "3" },
  },
  {
    name: "segments.addUsers",
    run: (d) => d.segments.addUsers(1, [2, 3]),
    body: '{"user_ids":[2,3]}',
  },
  {
    name: "segments.removeUsers",
    run: (d) => d.segments.removeUsers(1, [2]),
    body: '{"user_ids":[2]}',
  },
  {
    name: "billboards.create sends the payload as-is",
    run: (d) => d.billboards.create({ name: "B", placement_area: "sidebar" }),
    body: '{"name":"B","placement_area":"sidebar"}',
  },

  // --- concepts, badges, lists, surveys, redirects ---
  {
    name: "concepts.list",
    run: (d) => d.concepts.list({ page: 2, perPage: 3, days: 7 }),
    query: { page: "2", per_page: "3", days: "7" },
  },
  { name: "concepts.get", run: (d) => d.concepts.get(1, 7), query: { days: "7" } },
  {
    name: "concepts.articles",
    run: (d) => d.concepts.articles(1, { sort: "score", page: 2, perPage: 3 }),
    query: { sort: "score", page: "2", per_page: "3" },
  },
  {
    name: "concepts.update wraps the payload",
    run: (d) => d.concepts.update(1, { score: 5 }),
    body: '{"concept":{"score":5}}',
  },
  {
    name: "concepts.adminCreate wraps the payload",
    run: (d) => d.concepts.adminCreate({ name: "N" }),
    body: '{"concept":{"name":"N"}}',
  },
  {
    name: "concepts.adminUpdate wraps the payload",
    run: (d) => d.concepts.adminUpdate(1, { name: "N" }),
    body: '{"concept":{"name":"N"}}',
  },
  {
    name: "concepts.adminList",
    run: (d) => d.concepts.adminList({ page: 2, perPage: 3 }),
    query: { page: "2", per_page: "3" },
  },
  {
    name: "concepts.adminTriggerLookback",
    run: (d) => d.concepts.adminTriggerLookback(1, 7),
    body: '{"days":7}',
  },
  { name: "badges.list", run: (d) => d.badges.list({ page: 2 }), query: { page: "2" } },
  {
    name: "badges.create wraps the payload",
    run: (d) => d.badges.create({ title: "T" }),
    body: '{"badge":{"title":"T"}}',
  },
  {
    name: "badges.update wraps the payload",
    run: (d) => d.badges.update(1, { title: "T" }),
    body: '{"badge":{"title":"T"}}',
  },
  {
    name: "badgeAchievements.create wraps the payload",
    run: (d) => d.badgeAchievements.create({ user_id: 1, badge_id: 2 }),
    body: '{"badge_achievement":{"user_id":1,"badge_id":2}}',
  },
  {
    name: "recommendedLists.list",
    run: (d) => d.recommendedLists.list({ page: 2, search: "x" }),
    query: { page: "2", search: "x" },
  },
  {
    name: "recommendedLists.create sends a flat body",
    run: (d) => d.recommendedLists.create({ name: "N", user_id: 1 }),
    body: '{"name":"N","user_id":1}',
  },
  {
    name: "surveys.list",
    run: (d) => d.surveys.list({ page: 2, perPage: 3, active: true }),
    query: { page: "2", per_page: "3", active: "true" },
  },
  {
    name: "surveys.pollVotes",
    run: (d) => d.surveys.pollVotes("s", { perPage: 3, after: 9 }),
    query: { per_page: "3", after: "9" },
  },
  {
    name: "surveys.pollTextResponses",
    run: (d) => d.surveys.pollTextResponses("s", { after: 9 }),
    query: { after: "9" },
  },
  {
    name: "requestRedirects.list",
    run: (d) => d.requestRedirects.list({ page: 2, perPage: 3 }),
    query: { page: "2", per_page: "3" },
  },
  {
    name: "requestRedirects.create wraps the payload",
    run: (d) => d.requestRedirects.create({ original_url: "a" }),
    body: '{"request_redirect":{"original_url":"a"}}',
  },
  {
    name: "requestRedirects.update wraps the payload",
    run: (d) => d.requestRedirects.update(1, { original_url: "a" }),
    body: '{"request_redirect":{"original_url":"a"}}',
  },
  {
    name: "feedbackMessages.update wraps the payload",
    run: (d) => d.feedbackMessages.update(1, "Resolved"),
    body: '{"feedback_message":{"status":"Resolved"}}',
  },

  // --- agent sessions and listings ---
  {
    name: "agentSessions.create sends curated_data as a JSON string",
    run: (d) => d.agentSessions.create({ title: "T", s3_key: "k", curated_data: '{"a":1}' }),
    body: '{"title":"T","s3_key":"k","curated_data":"{\\"a\\":1}"}',
  },
  {
    name: "listings.list",
    run: (d) => d.listings.list({ category: "cfp", page: 2, perPage: 3 }),
    query: { category: "cfp", page: "2", per_page: "3" },
  },
];

describe("parameter and body mapping", () => {
  it.each(CASES.map((testCase) => [testCase.name, testCase] as const))(
    "%s",
    async (_name, testCase) => {
      const { devto, fetchFn } = setup();

      await testCase.run(devto);

      expect(fetchFn.requests).toHaveLength(1);
      if (testCase.query !== undefined) expect(queryOf(fetchFn.last())).toEqual(testCase.query);
      if (testCase.body !== undefined) expect(fetchFn.last().body).toBe(testCase.body);
      if (testCase.path !== undefined) expect(pathOf(fetchFn.last())).toBe(testCase.path);
    },
  );
});
