/**
 * Client-side rate limiting.
 *
 * The Forem API allows 3 reads/second, 30 reads/minute, and 1 write/second, and
 * it sends no rate-limit headers. If you go faster you get `429 Retry later`.
 * Every request therefore waits in this queue first.
 *
 * It is a simple sliding window: keep the timestamps of recent requests and
 * wait until the oldest one is old enough to be forgotten.
 */

const ONE_SECOND = 1000;
const ONE_MINUTE = 60 * ONE_SECOND;

export interface ThrottleOptions {
  /** Set to false to disable entirely (useful for tests and for admin keys). */
  enabled?: boolean;
  readPerSecond?: number;
  readPerMinute?: number;
  writePerSecond?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class Throttle {
  private readonly enabled: boolean;
  private readonly readPerSecond: number;
  private readonly readPerMinute: number;
  private readonly writePerSecond: number;
  private readTimes: number[] = [];
  private writeTimes: number[] = [];

  constructor(options: ThrottleOptions = {}) {
    this.enabled = options.enabled !== false;
    this.readPerSecond = options.readPerSecond ?? 3;
    this.readPerMinute = options.readPerMinute ?? 30;
    this.writePerSecond = options.writePerSecond ?? 1;
  }

  /** Wait until this request is allowed to go out, then count it. */
  async wait(method: string): Promise<void> {
    if (!this.enabled) return;

    const isRead = method === "GET" || method === "HEAD";

    // Requests already in flight can be made while we wait.
    for (;;) {
      const now = Date.now();
      const times = isRead ? this.readTimes : this.writeTimes;
      const recent = times.filter((time) => now - time < ONE_MINUTE);
      if (isRead) this.readTimes = recent;
      else this.writeTimes = recent;

      const delay = isRead ? this.readDelay(recent, now) : this.writeDelay(recent, now);
      if (delay <= 0) {
        recent.push(now);
        return;
      }
      await sleep(delay);
    }
  }

  /** Sleep before retrying a request that came back 429. */
  async pause(ms: number): Promise<void> {
    if (ms > 0) await sleep(ms);
  }

  private readDelay(times: number[], now: number): number {
    let delay = 0;

    if (times.length >= this.readPerMinute) {
      const oldest = times[times.length - this.readPerMinute] ?? times[0] ?? now;
      delay = Math.max(delay, oldest + ONE_MINUTE - now);
    }

    const lastSecond = times.filter((time) => now - time < ONE_SECOND);
    if (lastSecond.length >= this.readPerSecond) {
      const oldest = lastSecond[lastSecond.length - this.readPerSecond] ?? lastSecond[0] ?? now;
      delay = Math.max(delay, oldest + ONE_SECOND - now);
    }

    return delay;
  }

  private writeDelay(times: number[], now: number): number {
    const lastSecond = times.filter((time) => now - time < ONE_SECOND);
    if (lastSecond.length >= this.writePerSecond) {
      const oldest = lastSecond[lastSecond.length - this.writePerSecond] ?? lastSecond[0] ?? now;
      return Math.max(0, oldest + ONE_SECOND - now);
    }
    return 0;
  }
}
