import { describe, expect, it } from "vitest";
import { pageAll, paginate } from "../src/pagination.js";
import { DevToClient } from "../src/client.js";
import { fakeFetch, queryOf } from "./fakeFetch.js";

describe("paginate", () => {
  it("stops when a page comes back short", async () => {
    const pages = [[1, 2], [3, 4], [5]];
    let call = 0;

    const items: number[] = [];
    for await (const item of paginate(async () => pages[call++] ?? [], 2)) items.push(item);

    expect(items).toEqual([1, 2, 3, 4, 5]);
    expect(call).toBe(3);
  });

  it("stops immediately on an empty first page", async () => {
    let call = 0;
    const items: number[] = [];
    for await (const item of paginate(async () => {
      call += 1;
      return [];
    }, 30))
      items.push(item);

    expect(items).toEqual([]);
    expect(call).toBe(1);
  });

  it("keeps going while pages are full, even if they repeat", async () => {
    let call = 0;
    const items: number[] = [];
    for await (const item of paginate(async () => {
      call += 1;
      return call <= 3 ? [1, 2] : [];
    }, 2))
      items.push(item);

    expect(items).toEqual([1, 2, 1, 2, 1, 2]);
  });

  it("passes the page number and perPage to the fetcher", async () => {
    const seen: { page: number; perPage?: number }[] = [];
    await pageAll(async (params) => {
      seen.push(params);
      return [];
    }, 25);

    expect(seen).toEqual([{ page: 1, perPage: 25 }]);
  });

  it("walks the real API through the client", async () => {
    const fetchFn = fakeFetch([
      { body: JSON.stringify([{ id: 1 }, { id: 2 }]) },
      { body: JSON.stringify([{ id: 3 }]) },
    ]);
    const devto = new DevToClient({ fetch: fetchFn, throttle: { enabled: false } });

    const all = await devto.pageAll((p) => devto.articles.list({ tag: "rust", ...p }), 2);

    expect(all).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    expect(fetchFn.requests).toHaveLength(2);
    expect(queryOf(fetchFn.requests[0]!)).toEqual({ tag: "rust", page: "1", per_page: "2" });
    expect(queryOf(fetchFn.requests[1]!)).toEqual({ tag: "rust", page: "2", per_page: "2" });
  });
});
