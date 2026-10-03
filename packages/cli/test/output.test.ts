import { describe, expect, it } from "vitest";
import { AuthenticationError, NotFoundError } from "@dishant0406/dev-to";
import { printError, redact, renderTable } from "../src/output.js";

describe("redact", () => {
  it("replaces the API key with its masked form", () => {
    expect(redact("failed with key abcdefgh", "abcdefgh")).toBe("failed with key ****efgh");
  });

  it("replaces every occurrence", () => {
    expect(redact("abcdefgh abcdefgh", "abcdefgh")).toBe("****efgh ****efgh");
  });

  it("leaves text alone when there is no key", () => {
    expect(redact("nothing to hide", undefined)).toBe("nothing to hide");
    expect(redact("nothing to hide", "")).toBe("nothing to hide");
  });

  it("never leaks the raw key", () => {
    const key = "super-secret-key";
    const output = redact(`api-key: ${key}`, key);
    expect(output).not.toContain(key);
  });
});

describe("renderTable", () => {
  it("renders one row per object", () => {
    const table = renderTable([
      { id: 1, name: "one" },
      { id: 2, name: "two" },
    ]);
    const lines = table.split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain("id");
    expect(lines[0]).toContain("name");
    expect(lines[1]).toContain("one");
    expect(lines[2]).toContain("two");
  });

  it("drops columns whose values are all empty", () => {
    const table = renderTable([{ id: 1, note: null }]);
    expect(table).toContain("id");
    expect(table).not.toContain("note");
  });

  it("drops columns whose value never changes", () => {
    const table = renderTable([
      { id: 1, type_of: "article" },
      { id: 2, type_of: "article" },
    ]);
    expect(table).not.toContain("type_of");
  });

  it("keeps a single-row column even though there is nothing to compare against", () => {
    expect(renderTable([{ id: 1, title: "hello" }])).toContain("hello");
  });

  it("flattens nested objects into one cell", () => {
    expect(renderTable([{ id: 1, user: { username: "ben" } }])).toContain('{"username":"ben"}');
  });

  it("truncates very long values", () => {
    const table = renderTable([{ id: 1, body: "x".repeat(200) }]);
    expect(table).toContain("…");
  });

  it("handles an empty list", () => {
    expect(renderTable([])).toContain("no fields");
  });
});

describe("printError", () => {
  it("returns 1 for API errors and prints the message", () => {
    const code = printError(
      new AuthenticationError({ status: 401, method: "GET", path: "/api/users/me", body: "" }),
    );
    expect(code).toBe(1);
  });

  it("returns 2 for usage errors", () => {
    expect(printError(new Error("bad flag"))).toBe(2);
  });

  it("masks the API key inside the message", () => {
    const error = new NotFoundError({
      status: 404,
      method: "GET",
      path: "/api/articles/1?key=abcdefgh",
      body: "",
    });
    expect(printError(error, {}, "abcdefgh")).toBe(1);
  });
});
