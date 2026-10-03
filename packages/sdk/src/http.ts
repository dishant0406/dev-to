/**
 * The only place in this project that talks to the network.
 *
 * Everything a resource method needs (URL building, headers, JSON, timeouts,
 * rate limiting, error creation) happens here, so it only has to be right once.
 */

import { ConnectionError, createError } from "./errors.js";
import { Throttle, type ThrottleOptions } from "./throttle.js";

export const API_VERSION_HEADER = "application/vnd.forem.api-v1+json";
export const DEFAULT_BASE_URL = "https://dev.to";
export const DEFAULT_USER_AGENT = "@dishant0406/dev-to";

/** Query values the API accepts. Keys are the API's own names (`per_page`, not `perPage`). */
export type QueryValue =
  string | number | boolean | Date | readonly (string | number)[] | null | undefined;

export type QueryParams = Record<string, QueryValue>;

export interface HttpOptions {
  baseUrl?: string;
  apiKey?: string;
  /** Milliseconds before the request is aborted. Default 30000. */
  timeout?: number;
  /** How many times a 429 is retried. Default 2. */
  maxRetries?: number;
  throttle?: ThrottleOptions;
  /** Injectable for tests. Defaults to the global `fetch`. */
  fetch?: typeof globalThis.fetch;
}

export interface RequestOptions {
  query?: QueryParams;
  body?: unknown;
  /** Extra headers for this one request, merged over the defaults. */
  headers?: Record<string, string>;
}

/** Build a full URL from a path and query params. `undefined`, `null` and `""` are dropped. */
export function buildUrl(baseUrl: string, path: string, query?: QueryParams): string {
  const base = baseUrl.replace(/\/+$/, "");
  const url = new URL(`${base}${path.startsWith("/") ? path : `/${path}`}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, formatQueryValue(value));
    }
  }

  return url.toString();
}

function formatQueryValue(value: Exclude<QueryValue, null | undefined>): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (Array.isArray(value)) return value.join(",");
  return String(value);
}

/** A JSON response, a plain-text response, or `undefined` for 204 No Content. */
function parseBody(text: string): unknown {
  if (text.trim() === "") return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function retryAfterSeconds(response: Response): number | undefined {
  const header = response.headers.get("retry-after");
  if (header === null) return undefined;
  const seconds = Number(header);
  return Number.isFinite(seconds) ? seconds : undefined;
}

export class HttpClient {
  readonly baseUrl: string;
  readonly apiKey: string | undefined;

  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly fetchFn: typeof globalThis.fetch;
  private readonly throttle: Throttle;

  constructor(options: HttpOptions = {}) {
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.apiKey = options.apiKey;
    this.timeout = options.timeout ?? 30_000;
    this.maxRetries = options.maxRetries ?? 2;
    this.fetchFn = options.fetch ?? globalThis.fetch;
    this.throttle = new Throttle(options.throttle);
  }

  get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>("GET", path, options);
  }

  post<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>("POST", path, options);
  }

  put<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>("PUT", path, options);
  }

  patch<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>("PATCH", path, options);
  }

  delete<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>("DELETE", path, options);
  }

  async request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
    const url = buildUrl(this.baseUrl, path, options.query);
    const headers = { ...this.buildHeaders(options.body), ...options.headers };
    const body = options.body === undefined ? undefined : JSON.stringify(options.body);

    let attempt = 0;
    for (;;) {
      await this.throttle.wait(method);

      let response: Response;
      try {
        response = await this.fetchFn(url, {
          method,
          headers,
          body,
          signal: AbortSignal.timeout(this.timeout),
        });
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        throw new ConnectionError(`Could not reach ${url}: ${reason}`, {
          status: 0,
          method,
          path,
          body: "",
        });
      }

      const text = await response.text();

      if (response.ok) {
        return parseBody(text) as T;
      }

      if (response.status === 429 && attempt < this.maxRetries) {
        attempt += 1;
        const waitMs = (retryAfterSeconds(response) ?? 1) * 1000;
        await this.throttle.pause(waitMs);
        continue;
      }

      throw createError(response.status, text, method, path, retryAfterSeconds(response));
    }
  }

  private buildHeaders(body: unknown): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: API_VERSION_HEADER,
      "User-Agent": DEFAULT_USER_AGENT,
    };
    if (this.apiKey !== undefined && this.apiKey !== "") headers["api-key"] = this.apiKey;
    if (body !== undefined) headers["Content-Type"] = "application/json";
    return headers;
  }
}
