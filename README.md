# dev-to

A typed TypeScript SDK and a command line tool for the
[dev.to / Forem API v1](https://developers.forem.com/api/v1).

- **`@dishant0406/dev-to`** — the SDK. Zero runtime dependencies, one typed method
  per API operation, built-in rate limiting so bulk work does not get throttled.
- **`@dishant0406/dev-to-cli`** — the `devto` command. Same coverage, plus a raw
  `devto api` command that can reach any endpoint.

Every operation in the API spec is implemented. See
[`docs/api-coverage.md`](https://github.com/dishant0406/dev-to/blob/main/docs/api-coverage.md)
for the checklist, which is also enforced by a test.

---

## Install

```sh
npm install @dishant0406/dev-to        # the SDK
npm install -g @dishant0406/dev-to-cli # the CLI
```

Requires Node 20 or newer.

---

## SDK

```ts
import { DevToClient } from "@dishant0406/dev-to";

const devto = new DevToClient({ apiKey: process.env.DEVTO_API_KEY });

// Read
const articles = await devto.articles.list({ tag: "javascript", perPage: 5 });
const article = await devto.articles.get(12345);
const me = await devto.users.me();
const tags = await devto.tags.list();

// Write
const created = await devto.articles.create({
  title: "Hello",
  body_markdown: "World",
  tags: "javascript",
  published: false,
});

await devto.articles.update(created.id, { published: true });
await devto.reactions.toggle({
  category: "like",
  reactableId: created.id,
  reactableType: "Article",
});
```

### Every resource

`articles`, `users`, `comments`, `reactions`, `readingList`, `follows`,
`followers`, `analytics`, `tags`, `trends`, `videos`, `podcastEpisodes`,
`profileImages`, `instance`, `subforems`, `healthChecks`, `organizations`,
`pages`, `segments`, `billboards`, `concepts`, `badges`, `badgeAchievements`,
`recommendedLists`, `surveys`, `requestRedirects`, `feedbackMessages`,
`agentSessions`, `listings`.

### Pagination

The API sends no `Link` header, so a page is the last one when it comes back
short. `paginate` and `pageAll` handle that for you, and every request they make
goes through the rate limiter.

```ts
// One item at a time
for await (const article of devto.paginate((p) => devto.articles.list({ tag: "rust", ...p }), 30)) {
  console.log(article.title);
}

// Or collect everything
const all = await devto.pageAll(
  (p) => devto.articles.list({ username: "ben", state: "all", ...p }),
  1000,
);
```

### Errors

Every failure throws a typed error. `429` responses are plain text
(`Retry later`), and the SDK parses those too.

```ts
import {
  AuthenticationError, // 401
  ForbiddenError, // 403
  NotFoundError, // 404
  ConflictError, // 409
  ValidationError, // 422, with `.errors`
  RateLimitError, // 429, with `.retryAfterSeconds`
  ServerError, // 5xx
  ConnectionError, // never reached the API
} from "@dishant0406/dev-to";

try {
  await devto.articles.get(1);
} catch (error) {
  if (error instanceof NotFoundError) console.log("no such article");
}
```

### Rate limits

The API allows **3 reads/second, 30 reads/minute and 1 write/second**, and it
sends no rate-limit headers. The SDK slows requests down to stay inside those
limits. Tune or disable it if you have an admin key, which bypasses them:

```ts
new DevToClient({ apiKey, throttle: { enabled: false } });
new DevToClient({ apiKey, throttle: { readPerSecond: 10, readPerMinute: 300 } });
```

### Other options

```ts
new DevToClient({
  apiKey: "...",
  baseUrl: "https://my-forem.example", // self-hosted Forem
  timeout: 10_000, // milliseconds, default 30000
  maxRetries: 2, // automatic retries after a 429
});
```

### Any endpoint

If an endpoint is added to the API tomorrow, `request` already reaches it:

```ts
await devto.request("POST", "/api/some/new/endpoint", { query: { a: 1 }, body: { b: 2 } });
```

---

## CLI

```sh
devto auth login --key YOUR_API_KEY   # stored at ~/Library/Application Support/devto/config.json (mode 0600)
devto users me
devto articles list --tag javascript --per-page 5
devto articles push --file post.md
devto analytics totals
```

The API key is read from `--api-key`, then `DEVTO_API_KEY`, then the config file.
Get one at <https://dev.to/settings/extensions>.

### Publishing markdown

Write a post with YAML front matter:

```md
---
title: My post
tags: javascript, typescript
published: false
description: A short summary
cover_image: https://example.com/cover.png
---

Body goes here.
```

```sh
devto articles create --file post.md   # create
devto articles push   --file post.md   # create the first time, then update
```

`push` writes the returned article id back into the front matter, so running it
again updates the same article instead of creating a duplicate.

### Safety

- Commands that delete, suspend, merge, spam or unpublish ask for confirmation.
  Use `--yes` only in scripts you trust; the CLI never assumes it.
- `--dry-run` prints the request that would be sent and sends nothing — including for
  `devto api`.
- The API key is masked in all output, including `--verbose` and error messages.

### Global flags

| Flag               | What it does                                  |
| ------------------ | --------------------------------------------- |
| `--api-key <key>`  | Override the stored key                       |
| `--base-url <url>` | Talk to a self-hosted Forem instance          |
| `--json`           | Print the raw API response instead of a table |
| `--quiet`          | Print nothing on success                      |
| `--verbose`        | Print request details                         |
| `--no-color`       | Disable coloured output                       |
| `--timeout <ms>`   | Request timeout                               |
| `--dry-run`        | Show the request without sending it           |
| `--yes`            | Skip confirmation prompts                     |

### Any endpoint

```sh
devto api GET /api/articles --query tag=rust --query per_page=5
devto api GET /api/articles/me | jq '.username'
devto api POST /api/follows --data '{"user_ids":[1,2]}'   # asks for confirmation first
```

`api` always prints JSON so it pipes cleanly into `jq`. Anything other than `GET`
asks for confirmation, and `--dry-run` shows the request without sending it.

The full command list is in
[`docs/cli-reference.md`](https://github.com/dishant0406/dev-to/blob/main/docs/cli-reference.md).

---

## Use it with a coding agent

The repository ships an [agent skill](https://agentskills.io) at
`.agents/skills/devto/`. It tells a coding agent which command to reach for, and
the behaviours that otherwise cause silent mistakes — the invisible rate limits,
the `422` shape, the fact that `articles push` rewrites the file it reads, and
that there is no article delete endpoint.

KajiCode and other tools that read `.agents/skills/` pick it up automatically
when working inside this repository. To use it everywhere:

```sh
cp -r .agents/skills/devto ~/.agents/skills/
```

Claude Code reads `.claude/skills/` instead, so copy it there for that tool:

```sh
mkdir -p ~/.claude/skills && cp -r .agents/skills/devto ~/.claude/skills/
```

`packages/cli/test/skill.test.ts` checks every command the skill mentions
against the real command tree, so the skill cannot silently drift out of date.

---

## Development

```sh
npm install
npm run verify   # typecheck, lint, build, test
```

| Script                | What it does                                                  |
| --------------------- | ------------------------------------------------------------- |
| `npm test`            | Unit tests plus the 126-operation coverage check (no network) |
| `npm run typecheck`   | `tsc --noEmit` for both packages                              |
| `npm run lint`        | ESLint and Prettier                                           |
| `npm run build`       | Bundle both packages into `dist/`                             |
| `npm run spec:check`  | Fail if the published API spec changed                        |
| `npm run spec:update` | Refresh the vendored spec                                     |

Read [`AGENTS.md`](https://github.com/dishant0406/dev-to/blob/main/AGENTS.md)
before changing anything — it explains how this codebase is written and why.

---

## License

MIT
