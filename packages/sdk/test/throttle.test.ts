import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Throttle } from "../src/throttle.js";
import { DevToClient } from "../src/client.js";
import { fakeFetch } from "./fakeFetch.js";

describe("Throttle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does nothing when disabled", async () => {
    const throttle = new Throttle({ enabled: false });
    const start = Date.now();
    for (let i = 0; i < 10; i += 1) await throttle.wait("GET");
    expect(Date.now() - start).toBe(0);
  });

  it("allows 3 reads per second, then waits", async () => {
    const throttle = new Throttle({ readPerSecond: 3, readPerMinute: 30 });

    await throttle.wait("GET");
    await throttle.wait("GET");
    await throttle.wait("GET");

    let fourthFinished = false;
    const fourth = throttle.wait("GET").then(() => {
      fourthFinished = true;
    });

    await vi.advanceTimersByTimeAsync(500);
    expect(fourthFinished).toBe(false);

    await vi.advanceTimersByTimeAsync(600);
    await fourth;
    expect(fourthFinished).toBe(true);
  });

  it("allows only 1 write per second", async () => {
    const throttle = new Throttle({ writePerSecond: 1 });

    await throttle.wait("POST");

    let secondFinished = false;
    const second = throttle.wait("POST").then(() => {
      secondFinished = true;
    });

    await vi.advanceTimersByTimeAsync(900);
    expect(secondFinished).toBe(false);

    await vi.advanceTimersByTimeAsync(200);
    await second;
    expect(secondFinished).toBe(true);
  });

  it("applies the per-minute limit even when the per-second limit is fine", async () => {
    const throttle = new Throttle({ readPerSecond: 100, readPerMinute: 5 });

    for (let i = 0; i < 5; i += 1) await throttle.wait("GET");

    let sixthFinished = false;
    const sixth = throttle.wait("GET").then(() => {
      sixthFinished = true;
    });

    await vi.advanceTimersByTimeAsync(30_000);
    expect(sixthFinished).toBe(false);

    await vi.advanceTimersByTimeAsync(31_000);
    await sixth;
    expect(sixthFinished).toBe(true);
  });

  it("counts reads and writes separately", async () => {
    const throttle = new Throttle({ readPerSecond: 1, writePerSecond: 1 });

    await throttle.wait("GET");
    await throttle.wait("POST");

    // The GET already used the read budget, but the write budget is independent.
    const write = throttle.wait("POST");
    await vi.advanceTimersByTimeAsync(1_100);
    await write;
  });
});

describe("throttling inside the client", () => {
  it("spaces out requests so a bulk read does not trip the rate limit", async () => {
    vi.useFakeTimers();
    try {
      const fetchFn = fakeFetch({ body: "[]" });
      const devto = new DevToClient({
        fetch: fetchFn,
        throttle: { readPerSecond: 2, readPerMinute: 30 },
      });

      const done = Promise.all([devto.tags.list(), devto.tags.list(), devto.tags.list()]);
      await vi.advanceTimersByTimeAsync(2_000);
      await done;

      expect(fetchFn.requests).toHaveLength(3);
    } finally {
      vi.useRealTimers();
    }
  });
});
