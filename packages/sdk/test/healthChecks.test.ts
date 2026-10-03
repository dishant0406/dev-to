/**
 * Health checks take a token in a header, not a query parameter. The spec declares
 * `in: header`, and sending it in the query string means the token is ignored.
 */

import { describe, expect, it } from "vitest";
import { DevToClient } from "../src/index.js";
import { fakeFetch, pathOf, queryOf } from "./fakeFetch.js";

function setup(body = "ok") {
  const fetchFn = fakeFetch({ body });
  const devto = new DevToClient({ apiKey: "k", fetch: fetchFn, throttle: { enabled: false } });
  return { devto, fetchFn };
}

describe("health checks", () => {
  it("sends the token as a health-check-token header", async () => {
    const { devto, fetchFn } = setup();
    await devto.healthChecks.check("app", "tok-123");

    expect(fetchFn.last().headers["health-check-token"]).toBe("tok-123");
    expect(queryOf(fetchFn.last())).toEqual({});
  });

  it("sends no token header when none is given", async () => {
    const { devto, fetchFn } = setup();
    await devto.healthChecks.database();

    expect(fetchFn.last().headers["health-check-token"]).toBeUndefined();
    expect(pathOf(fetchFn.last())).toBe("/api/health_checks/database");
  });

  it("has a method per check", async () => {
    const { devto, fetchFn } = setup();

    await devto.healthChecks.app();
    expect(pathOf(fetchFn.last())).toBe("/api/health_checks/app");

    await devto.healthChecks.database();
    expect(pathOf(fetchFn.last())).toBe("/api/health_checks/database");

    await devto.healthChecks.cache();
    expect(pathOf(fetchFn.last())).toBe("/api/health_checks/cache");
  });

  it("returns the plain-text body the API sends", async () => {
    const { devto } = setup("ok");
    await expect(devto.healthChecks.app()).resolves.toBe("ok");
  });
});

describe("extra headers", () => {
  it("keeps the default headers alongside request-specific ones", async () => {
    const { devto, fetchFn } = setup();
    await devto.request("GET", "/api/instance", { headers: { "x-test": "1" } });

    expect(fetchFn.last().headers["x-test"]).toBe("1");
    expect(fetchFn.last().headers["api-key"]).toBe("k");
    expect(fetchFn.last().headers["accept"]).toBe("application/vnd.forem.api-v1+json");
  });
});
