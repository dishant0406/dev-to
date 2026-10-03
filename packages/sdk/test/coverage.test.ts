import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import yaml from "js-yaml";
import { DevToClient } from "../src/index.js";
import { API_COVERAGE } from "./coverage.js";
import { fakeFetch, pathOf } from "./fakeFetch.js";

const specPath = fileURLToPath(new URL("../../../spec/forem-api-v1.yaml", import.meta.url));

function specOperations(): string[] {
  const spec = yaml.load(readFileSync(specPath, "utf8")) as {
    paths: Record<string, Record<string, unknown>>;
  };

  const operations: string[] = [];
  for (const [path, item] of Object.entries(spec.paths)) {
    for (const method of Object.keys(item)) {
      operations.push(`${method.toUpperCase()} ${path}`);
    }
  }
  return operations.sort();
}

describe("API coverage", () => {
  it("lists exactly the operations in the vendored OpenAPI spec", () => {
    const expected = specOperations();
    const actual = API_COVERAGE.map(
      (operation) => `${operation.method} ${operation.pattern}`,
    ).sort();

    expect(actual).toEqual(expected);
  });

  it("has no duplicate entries", () => {
    const keys = API_COVERAGE.map((operation) => `${operation.method} ${operation.pattern}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it.each(
    API_COVERAGE.map((operation) => [operation.method, operation.pattern, operation] as const),
  )("%s %s is called by the SDK", async (method, _pattern, operation) => {
    const fetchFn = fakeFetch({ status: 204, body: "" });
    const devto = new DevToClient({ fetch: fetchFn, throttle: { enabled: false } });

    await operation.call(devto);

    expect(fetchFn.requests).toHaveLength(1);
    expect(fetchFn.last().method).toBe(method);
    expect(pathOf(fetchFn.last())).toBe(operation.path);
  });
});
