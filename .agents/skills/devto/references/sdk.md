# The TypeScript SDK

Use the SDK instead of the CLI when the work belongs in a TypeScript file — a
build script, a scheduled job, a test — or when you need to handle individual
items from a large result without buffering them all.

```sh
npm install @dishant0406/dev-to
```

## Making a client

```ts
import { DevToClient } from "@dishant0406/dev-to";

const devto = new DevToClient({ apiKey: process.env.DEVTO_API_KEY });
```

Options, all optional:

| Option       | Default          | What it does                               |
| ------------ | ---------------- | ------------------------------------------ |
| `baseUrl`    | `https://dev.to` | A self-hosted Forem instance               |
| `apiKey`     | none             | Sent as the `api-key` header               |
| `timeout`    | `30000`          | Milliseconds before the request is aborted |
| `maxRetries` | `2`              | Retries after a `429`                      |
| `throttle`   | enabled          | See below                                  |
| `fetch`      | global fetch     | Inject a fake in tests                     |

`devto.baseUrl` reads the resolved base URL back.

## Resources

One property per API resource group, one method per API operation:

```
articles          users              comments           reactions
readingList       follows            followers          analytics
tags              trends             videos             podcastEpisodes
profileImages     instance           subforems          healthChecks
organizations     pages              segments           billboards
concepts          badges             badgeAchievements  recommendedLists
surveys           requestRedirects   feedbackMessages   agentSessions
listings
```

```ts
const articles = await devto.articles.list({ tag: "typescript", perPage: 5 });
const article = await devto.articles.get(12345);
const me = await devto.users.me();
const tags = await devto.tags.list();

const created = await devto.articles.create({
  title: "Hello",
  body_markdown: "World",
  tags: "typescript",
  published: false,
});

await devto.articles.update(created.id, { published: true });
```

Conventions, so you can predict a signature you have not seen:

- Path parameters are positional: `get(id)`, `getByPath(username, slug)`.
- Everything else is one options object: `list({ tag, perPage })`.
- Names are camelCase: the API's `per_page` is `perPage`, `past_day` is `pastDay`.
- Methods that delete or unpublish are typed `Promise<void>`; a `204` returns
  `undefined`.
- Nothing is wrapped or caught. Failures throw the typed errors below.

## Paging

The API sends no `Link` header, so a page is the last one when it comes back
short. These helpers stop at the right place, and every request they make goes
through the rate limiter.

```ts
// One item at a time — use this for large results.
for await (const article of devto.paginate((p) => devto.articles.list({ tag: "rust", ...p }), 30)) {
  console.log(article.title);
}

// Or collect everything. Keep the perPage honest: the API caps it at 1000
// silently, and a short page is what ends the walk.
const all = await devto.pageAll(
  (p) => devto.articles.list({ username: "ben", state: "all", ...p }),
  100,
);
```

The second argument is `perPage`, default `30`. The fetch callback receives
`{ page, perPage }` and must forward both.

## Errors

Every failure throws a typed error. `429` responses are plain text
(`Retry later`) and are parsed too.

```ts
import {
  DevToError, // base class, has status, method, path, body
  AuthenticationError, // 401
  ForbiddenError, // 403
  NotFoundError, // 404
  ConflictError, // 409
  ValidationError, // 422, has .errors
  RateLimitError, // 429, has .retryAfterSeconds
  ServerError, // 5xx
  ConnectionError, // never reached the API
} from "@dishant0406/dev-to";

try {
  await devto.articles.get(1);
} catch (error) {
  if (error instanceof NotFoundError) console.log("no such article");
}
```

A `422` often explains itself in the response's `error` field rather than in an
`errors` array. `error.message` carries whichever the API sent.

## Rate limits

The API allows **3 reads/second, 30 reads/minute and 1 write/second**, and sends
no rate-limit headers. The client slows itself down to stay inside those limits,
so do not add your own delay.

```ts
new DevToClient({ apiKey, throttle: { enabled: false } }); // admin keys bypass limits
new DevToClient({ apiKey, throttle: { readPerSecond: 10, readPerMinute: 300 } });
```

## Any endpoint

`request` reaches every endpoint, including ones added after this SDK was
published, and including the two undocumented agent-session routes:

```ts
await devto.request("POST", "/api/agent_sessions/presign");
await devto.request("GET", "/api/articles", { query: { tag: "rust" } });
```

The third argument is `{ query, body, headers }`. Query keys use the API's own
snake_case names here, not the camelCase the resource methods use.

## Testing against the SDK

Pass a fake `fetch` — nothing in this SDK requires a network:

```ts
const devto = new DevToClient({
  apiKey: "test",
  fetch: async (url, init) => new Response(JSON.stringify([]), { status: 200 }),
});
```
