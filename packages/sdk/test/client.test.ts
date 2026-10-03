import { describe, expect, it } from "vitest";
import { DevToClient } from "../src/client.js";
import {
  AuthenticationError,
  ConflictError,
  ConnectionError,
  DevToError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  ServerError,
  ValidationError,
} from "../src/errors.js";
import { fakeFetch } from "./fakeFetch.js";

function client(response: Parameters<typeof fakeFetch>[0], options: { maxRetries?: number } = {}) {
  const fetchFn = fakeFetch(response);
  return {
    fetchFn,
    devto: new DevToClient({
      apiKey: "test-key",
      fetch: fetchFn,
      throttle: { enabled: false },
      maxRetries: options.maxRetries ?? 0,
    }),
  };
}

describe("request", () => {
  it("sends the API version header and the api-key header", async () => {
    const { devto, fetchFn } = client({ body: "[]" });
    await devto.articles.list();

    expect(fetchFn.last().headers["accept"]).toBe("application/vnd.forem.api-v1+json");
    expect(fetchFn.last().headers["api-key"]).toBe("test-key");
  });

  it("omits the api-key header when there is no key", async () => {
    const fetchFn = fakeFetch({ body: "[]" });
    const devto = new DevToClient({ fetch: fetchFn, throttle: { enabled: false } });
    await devto.articles.list();

    expect(fetchFn.last().headers["api-key"]).toBeUndefined();
  });

  it("only sends Content-Type when there is a body", async () => {
    const { devto, fetchFn } = client({ body: "{}" });
    await devto.articles.list();
    expect(fetchFn.last().headers["content-type"]).toBeUndefined();

    await devto.articles.create({ title: "t" });
    expect(fetchFn.last().headers["content-type"]).toBe("application/json");
  });

  it("serialises the body as JSON", async () => {
    const { devto, fetchFn } = client({ body: "{}" });
    await devto.articles.create({ title: "Hello", published: false });

    expect(fetchFn.last().body).toBe(
      JSON.stringify({ article: { title: "Hello", published: false } }),
    );
  });

  it("returns undefined for 204 responses", async () => {
    const { devto } = client({ status: 204 });
    await expect(devto.articles.unpublish(1)).resolves.toBeUndefined();
  });

  it("passes unknown fields through untouched", async () => {
    const article = { id: 1, title: "t", something_new: { nested: true } };
    const { devto } = client({ body: JSON.stringify([article]) });

    const articles = await devto.articles.list();
    expect(articles[0]).toEqual(article);
  });

  it("wraps a network failure in a ConnectionError", async () => {
    const fetchFn = (() => Promise.reject(new Error("getaddrinfo ENOTFOUND"))) as typeof fetch;
    const devto = new DevToClient({ fetch: fetchFn, throttle: { enabled: false } });

    const error = await devto.articles.list().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ConnectionError);
    expect((error as ConnectionError).message).toContain("getaddrinfo ENOTFOUND");
  });
});

describe("errors", () => {
  it("maps 401 to AuthenticationError", async () => {
    const { devto } = client({ status: 401, body: '{"error":"unauthorized","status":401}' });
    await expect(devto.articles.mine()).rejects.toBeInstanceOf(AuthenticationError);
  });

  it("maps 403 to ForbiddenError", async () => {
    const { devto } = client({ status: 403, body: '{"error":"forbidden","status":403}' });
    await expect(devto.articles.mine()).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("maps 404 to NotFoundError", async () => {
    const { devto } = client({ status: 404, body: '{"error":"not found","status":404}' });
    await expect(devto.articles.get(1)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("maps 409 to ConflictError", async () => {
    const { devto } = client({ status: 409, body: '{"error":"conflict","status":409}' });
    await expect(devto.segments.delete(1)).rejects.toBeInstanceOf(ConflictError);
  });

  it("maps 422 to ValidationError and keeps the field errors", async () => {
    const body = '{"error":"validation failed","errors":["title can\'t be blank"],"status":422}';
    const { devto } = client({ status: 422, body });

    const error = (await devto.articles
      .create({})
      .catch((caught: unknown) => caught)) as ValidationError;
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.errors).toEqual(["title can't be blank"]);
    expect(error.message).toContain("title can't be blank");
  });

  it("keeps the API's own message when a 422 has no field errors", async () => {
    // dev.to answers a duplicate title this way: an `error` string and no `errors`.
    const body = '{"error":"Title has already been used in the last five minutes","status":422}';
    const { devto } = client({ status: 422, body });

    const error = (await devto.articles
      .create({ title: "x" })
      .catch((caught: unknown) => caught)) as ValidationError;
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.message).toContain("Title has already been used in the last five minutes");
  });

  it("maps 500 to ServerError", async () => {
    const { devto } = client({ status: 500, body: "boom" });
    await expect(devto.articles.list()).rejects.toBeInstanceOf(ServerError);
  });

  it("maps a plain-text 429 body to RateLimitError", async () => {
    const { devto } = client({
      status: 429,
      body: "Retry later",
      headers: { "retry-after": "2" },
    });

    const error = (await devto.articles
      .list()
      .catch((caught: unknown) => caught)) as RateLimitError;
    expect(error).toBeInstanceOf(RateLimitError);
    expect(error.retryAfterSeconds).toBe(2);
    expect(error.body).toBe("Retry later");
  });

  it("keeps the request details on the error", async () => {
    const { devto } = client({ status: 404, body: "{}" });

    const error = (await devto.articles.get(7).catch((caught: unknown) => caught)) as DevToError;
    expect(error.method).toBe("GET");
    expect(error.path).toBe("/api/articles/7");
    expect(error.status).toBe(404);
  });

  it("retries a 429 and then succeeds", async () => {
    const fetchFn = fakeFetch([
      { status: 429, body: "Retry later", headers: { "retry-after": "0" } },
      { status: 200, body: '[{"id":1}]' },
    ]);
    const devto = new DevToClient({ fetch: fetchFn, throttle: { enabled: false }, maxRetries: 1 });

    await expect(devto.articles.list()).resolves.toEqual([{ id: 1 }]);
    expect(fetchFn.requests).toHaveLength(2);
  });
});
