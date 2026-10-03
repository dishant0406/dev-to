import { describe, expect, it } from "vitest";
import { DevToClient } from "../src/index.js";
import { fakeFetch, pathOf, queryOf } from "./fakeFetch.js";

function setup(response: { status?: number; body?: string } = { body: "{}" }) {
  const fetchFn = fakeFetch(response);
  const devto = new DevToClient({ apiKey: "k", fetch: fetchFn, throttle: { enabled: false } });
  return { devto, fetchFn };
}

describe("comments", () => {
  it('sends per_page as a string, because the API only accepts "10" or "30"', async () => {
    const { devto, fetchFn } = setup({ body: "[]" });
    await devto.comments.list({ aId: 42, perPage: "30" });

    expect(queryOf(fetchFn.last())).toEqual({ a_id: "42", per_page: "30" });
  });

  it("sends p_id when listing replies", async () => {
    const { devto, fetchFn } = setup({ body: "[]" });
    await devto.comments.list({ pId: 7 });

    expect(queryOf(fetchFn.last())).toEqual({ p_id: "7" });
  });

  it("escapes the comment id code in the path", async () => {
    const { devto, fetchFn } = setup();
    await devto.comments.get("a1b2");

    expect(pathOf(fetchFn.last())).toBe("/api/comments/a1b2");
  });
});

describe("reactions", () => {
  it("puts the parameters in the query string, not the body", async () => {
    const { devto, fetchFn } = setup();
    await devto.reactions.toggle({ category: "unicorn", reactableId: 9, reactableType: "Article" });

    expect(pathOf(fetchFn.last())).toBe("/api/reactions/toggle");
    expect(queryOf(fetchFn.last())).toEqual({
      category: "unicorn",
      reactable_id: "9",
      reactable_type: "Article",
    });
    expect(fetchFn.last().body).toBeUndefined();
  });
});

describe("articles", () => {
  it("sends the unpublish note as a query parameter and expects no body", async () => {
    const { devto, fetchFn } = setup({ status: 204 });
    await expect(devto.articles.unpublish(3, "superseded")).resolves.toBeUndefined();

    expect(pathOf(fetchFn.last())).toBe("/api/articles/3/unpublish");
    expect(queryOf(fetchFn.last())).toEqual({ note: "superseded" });
  });

  it("maps camelCase options to the API's snake_case parameters", async () => {
    const { devto, fetchFn } = setup({ body: "[]" });
    await devto.articles.list({ perPage: 5, tagsExclude: "ai", collectionId: 12, state: "rising" });

    expect(queryOf(fetchFn.last())).toEqual({
      per_page: "5",
      tags_exclude: "ai",
      collection_id: "12",
      state: "rising",
    });
  });

  it("wraps the payload in an `article` object", async () => {
    const { devto, fetchFn } = setup();
    await devto.articles.update(5, { title: "New" });

    expect(fetchFn.last().method).toBe("PUT");
    expect(pathOf(fetchFn.last())).toBe("/api/articles/5");
    expect(fetchFn.last().body).toBe('{"article":{"title":"New"}}');
  });
});

describe("organizations", () => {
  it("accepts a username or a numeric id for the same path", async () => {
    const { devto, fetchFn } = setup({ body: "[]" });

    await devto.organizations.users("my-org");
    expect(pathOf(fetchFn.last())).toBe("/api/organizations/my-org/users");

    await devto.organizations.users(42);
    expect(pathOf(fetchFn.last())).toBe("/api/organizations/42/users");
  });

  it("uses the numeric path for getById", async () => {
    const { devto, fetchFn } = setup();
    await devto.organizations.getById(7);

    expect(pathOf(fetchFn.last())).toBe("/api/organizations/7");
  });
});

describe("agent sessions", () => {
  it("sends curated_data as a JSON string", async () => {
    const { devto, fetchFn } = setup();
    await devto.agentSessions.create({
      title: "Session",
      s3_key: "key",
      tool_name: "claude_code",
      curated_data: JSON.stringify({ summary: "did things" }),
    });

    const body = JSON.parse(fetchFn.last().body ?? "{}") as { curated_data: unknown };
    expect(typeof body.curated_data).toBe("string");
    expect(JSON.parse(body.curated_data as string)).toEqual({ summary: "did things" });
  });

  it("calls the undocumented presign and raw_url routes", async () => {
    const { devto, fetchFn } = setup();

    await devto.agentSessions.presign();
    expect(fetchFn.last().method).toBe("POST");
    expect(pathOf(fetchFn.last())).toBe("/api/agent_sessions/presign");

    await devto.agentSessions.rawUrl(4);
    expect(fetchFn.last().method).toBe("GET");
    expect(pathOf(fetchFn.last())).toBe("/api/agent_sessions/4/raw_url");
  });

  it("surfaces the 503 that means S3 is not configured", async () => {
    const { devto } = setup({ status: 503, body: '{"error":"S3 storage is not configured"}' });
    await expect(devto.agentSessions.presign()).rejects.toThrow(/Server error \(503\)/);
  });
});

describe("users", () => {
  it("wraps the badge achievement payload", async () => {
    const { devto, fetchFn } = setup();
    await devto.badgeAchievements.create({ user_id: 1, badge_id: 2 });

    expect(fetchFn.last().body).toBe('{"badge_achievement":{"user_id":1,"badge_id":2}}');
  });

  it("wraps the concept payload", async () => {
    const { devto, fetchFn } = setup();
    await devto.concepts.adminCreate({ name: "Rust" });

    expect(pathOf(fetchFn.last())).toBe("/api/admin/concepts");
    expect(fetchFn.last().body).toBe('{"concept":{"name":"Rust"}}');
  });

  it("sends a numeric id straight to /api/users/{id}", async () => {
    const { devto, fetchFn } = setup();
    await devto.users.get(811279);

    expect(pathOf(fetchFn.last())).toBe("/api/users/811279");
    expect(queryOf(fetchFn.last())).toEqual({});
  });

  it("sends a username to by_username, because /api/users/{id} 404s on names", async () => {
    const { devto, fetchFn } = setup();
    await devto.users.get("dishant0406");

    expect(pathOf(fetchFn.last())).toBe("/api/users/by_username");
    expect(queryOf(fetchFn.last())).toEqual({ url: "dishant0406" });
  });

  it("only treats plain digits as an id", async () => {
    // Number() would call all of these integers and send them to /api/users/{id},
    // where they 404 — they are usernames.
    for (const value of ["1e5", "0x10", "12.0", "+5", "-1", " 12 "]) {
      const { devto, fetchFn } = setup();
      await devto.users.get(value);

      expect(pathOf(fetchFn.last())).toBe("/api/users/by_username");
      expect(queryOf(fetchFn.last())).toEqual({ url: value });
    }
  });

  it("does not round an id above 2^53", async () => {
    const { devto, fetchFn } = setup();
    await devto.users.get("9007199254740993");

    expect(pathOf(fetchFn.last())).toBe("/api/users/9007199254740993");
  });
});

describe("pagination parameter clamping", () => {
  it("sends per_page unchanged, letting the API cap it", async () => {
    const { devto, fetchFn } = setup({ body: "[]" });
    await devto.articles.list({ perPage: 1001 });

    expect(queryOf(fetchFn.last())).toEqual({ per_page: "1001" });
  });
});

describe("raw escape hatch", () => {
  it("sends any method to any path", async () => {
    const { devto, fetchFn } = setup({ body: "{}" });
    await devto.request("PUT", "/api/some/future/endpoint", {
      query: { flag: true },
      body: { hello: "world" },
    });

    expect(fetchFn.last().method).toBe("PUT");
    expect(pathOf(fetchFn.last())).toBe("/api/some/future/endpoint");
    expect(queryOf(fetchFn.last())).toEqual({ flag: "true" });
    expect(fetchFn.last().body).toBe('{"hello":"world"}');
  });
});

describe("listings (deprecated v0 API)", () => {
  it("calls the v0 paths", async () => {
    const { devto, fetchFn } = setup({ body: "[]" });

    await devto.listings.list({ category: "cfp" });
    expect(pathOf(fetchFn.last())).toBe("/api/listings");
    expect(queryOf(fetchFn.last())).toEqual({ category: "cfp" });

    await devto.listings.byCategory("cfp");
    expect(pathOf(fetchFn.last())).toBe("/api/listings/category/cfp");

    await devto.listings.get(3);
    expect(pathOf(fetchFn.last())).toBe("/api/listings/3");

    await devto.listings.byOrganization("org");
    expect(pathOf(fetchFn.last())).toBe("/api/organizations/org/listings");
  });
});
