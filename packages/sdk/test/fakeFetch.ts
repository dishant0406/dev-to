/**
 * A fake `fetch` for tests.
 *
 * The SDK never talks to the network in tests: `HttpClient` takes a `fetch`
 * function, and this is what the tests pass in. It records every request so the
 * assertions can check the exact method, URL and body that was sent.
 */

export interface RecordedRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string | undefined;
}

export interface FakeResponse {
  status?: number;
  body?: string;
  headers?: Record<string, string>;
}

export interface FakeFetch {
  (url: string | URL | Request, init?: RequestInit): Promise<Response>;
  /** Every request that was made, in order. */
  requests: RecordedRequest[];
  /** The most recent request. Throws when nothing was requested. */
  last: () => RecordedRequest;
}

/**
 * Create a fake fetch that answers with `response` (or `responses[0]`, then
 * `responses[1]`, ... when a list is given).
 */
export function fakeFetch(response: FakeResponse | FakeResponse[] = {}): FakeFetch {
  const queue = Array.isArray(response) ? [...response] : [response];
  const requests: RecordedRequest[] = [];

  const fn = (async (url: string | URL | Request, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    requests.push({
      method: init?.method ?? "GET",
      url: String(url),
      headers: Object.fromEntries(headers.entries()),
      body: typeof init?.body === "string" ? init.body : undefined,
    });

    const next = queue.length > 1 ? queue.shift() : queue[0];
    const status = next?.status ?? 200;
    const body = next?.body ?? "";
    const responseHeaders = new Headers(next?.headers);

    if (status === 204) {
      return new Response(null, { status, headers: responseHeaders });
    }
    if (!responseHeaders.has("content-type")) {
      responseHeaders.set("content-type", "application/json");
    }
    return new Response(body, { status, headers: responseHeaders });
  }) as FakeFetch;

  fn.requests = requests;
  fn.last = () => {
    const request = requests[requests.length - 1];
    if (request === undefined) throw new Error("No request was made");
    return request;
  };
  return fn;
}

/** Parse the query string of a recorded request. */
export function queryOf(request: RecordedRequest): Record<string, string> {
  const url = new URL(request.url);
  return Object.fromEntries(url.searchParams.entries());
}

/** Just the path of a recorded request. */
export function pathOf(request: RecordedRequest): string {
  return new URL(request.url).pathname;
}
