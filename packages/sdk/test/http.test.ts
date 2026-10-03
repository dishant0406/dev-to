import { describe, expect, it } from "vitest";
import { buildUrl } from "../src/http.js";

describe("buildUrl", () => {
  it("joins the base URL and path", () => {
    expect(buildUrl("https://dev.to", "/api/articles")).toBe("https://dev.to/api/articles");
  });

  it("adds a missing leading slash", () => {
    expect(buildUrl("https://dev.to", "api/articles")).toBe("https://dev.to/api/articles");
  });

  it("ignores a trailing slash on the base URL", () => {
    expect(buildUrl("https://dev.to/", "/api/articles")).toBe("https://dev.to/api/articles");
  });

  it("drops undefined, null and empty values", () => {
    const url = buildUrl("https://dev.to", "/api/articles", {
      page: undefined,
      tag: null,
      state: "",
      username: "ben",
    });
    expect(url).toBe("https://dev.to/api/articles?username=ben");
  });

  it("turns arrays into comma-separated values", () => {
    const url = buildUrl("https://dev.to", "/api/articles", { tag: ["rust", "wasm"] });
    expect(url).toBe("https://dev.to/api/articles?tag=rust%2Cwasm");
  });

  it("formats dates as YYYY-MM-DD", () => {
    const url = buildUrl("https://dev.to", "/api/analytics/historical", {
      start: new Date("2026-03-04T15:30:00Z"),
    });
    expect(url).toBe("https://dev.to/api/analytics/historical?start=2026-03-04");
  });

  it("keeps numbers and booleans", () => {
    const url = buildUrl("https://dev.to", "/api/surveys", { per_page: 30, active: true });
    expect(url).toBe("https://dev.to/api/surveys?per_page=30&active=true");
  });

  it("escapes path-unfriendly characters", () => {
    const url = buildUrl("https://dev.to", "/api/comments/a b");
    expect(url).toBe("https://dev.to/api/comments/a%20b");
  });
});
