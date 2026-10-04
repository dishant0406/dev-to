---
name: devto
description: Read and write dev.to / Forem content with the `devto` CLI or the `@dishant0406/dev-to` TypeScript SDK. Use when publishing, updating, or drafting articles from markdown, listing articles, tags, comments, users, followers, or analytics, or reaching any endpoint of the dev.to API v1. Prefer this over hand-rolled curl so rate limits, key redaction, and confirmation prompts are handled.
---

# dev.to

Publish and read dev.to content with the `devto` CLI, or import the SDK in
TypeScript. Both cover the same 126 API operations.

Start by checking the tool is there and the key works:

```sh
devto auth whoami
```

If `devto` is not installed: `npm install -g @dishant0406/dev-to-cli`.

## Pick the right verb

- **Read something** → a typed command with `--json`. It prints the exact API
  response, so it pipes into `jq`:
  `devto articles list --tag typescript --per-page 5 --json`
- **Publish or update a post** → `devto articles push --file post.md`. It
  creates the article the first time and updates it after that.
- **Anything not wrapped as a typed command** → `devto api <METHOD> <path>`.
  This is the fallback, not the default: typed commands carry the confirmation
  prompts and the correct query parameter names.

## Writing an article

Write a markdown file with YAML front matter, then push it:

```md
---
title: My post
tags: typescript, api
published: false
description: A short summary
---

Body goes here.
```

```sh
devto --dry-run articles push --file post.md   # always do this first
devto articles push --file post.md             # then the real thing
```

`push` writes the returned `id` into the front matter, so running it again
updates the same article. Use `articles create` only when you deliberately want
a second copy — it always creates, and a retry after a timeout creates a
duplicate.

Set `published: false` for a draft. Set `published: true` to publish.

## Safety rules

- **Preview every write with `--dry-run`.** It prints the exact request and
  sends nothing. It works in either position: `devto --dry-run articles push
--file post.md` and `devto articles push --file post.md --dry-run` both work.
- **Destructive commands need `--yes` when stdin is not a terminal.** That
  includes `unpublish`, `users suspend`, `merge`, `pages delete`, and any
  non-GET `devto api`. Without it the command exits 2 and sends nothing. Pass
  `--yes` only after you have shown the user what will happen.
- **Never print the API key.** The CLI masks it in every output path; do not
  work around that by echoing `$DEVTO_API_KEY`. `devto config get apiKey` prints
  the masked value on purpose, not the real key.
- **Exit codes say what went wrong.** `0` success, `1` the API rejected the
  request, `2` the command was called wrongly. A `2` is your mistake — fix the
  arguments rather than retrying.

## Gotchas

- **Rate limits are low and invisible.** 3 reads/second and 30 reads/minute,
  1 write/second. There are no rate-limit headers. Exceeding them returns `429`
  with a plain-text body `Retry later`. The client already slows itself down, so
  do not add your own delay.
- **`--all` only exists on five list commands**: `articles list`, `articles
latest`, `articles mine`, `reading-list list`, `followers list`. Elsewhere,
  page manually with `--page`.
- **Errors come in two shapes.** Usually JSON `{"error": "...", "status": 401}`,
  but `429` is plain text. Check the exit code rather than parsing JSON.
- **A `422` puts its explanation in `error`, not `errors`.** A duplicate title
  reads `Validation failed (422): Title has already been used in the last five
minutes`.
- **There is no article delete endpoint.** `devto articles unpublish <id>` is
  the closest thing and it takes the post off the site. Do not tell the user a
  draft was deleted — it was not. Drafts are removed at
  https://dev.to/dashboard.
- **`articles push` rewrites the file it reads.** It writes the returned `id`
  into the front matter, so the user's markdown file changes on disk. Say so
  before running it in a git repository.
- **`articles mine` only lists published articles unless you pass `--state`.**
  Ask for `--state all` to include drafts.
- **`users get` takes an id or a username.** `devto users get dishant0406` and
  `devto users get 811279` both work. The published API spec is wrong about this.
- **`devto pages list` returns rows with megabyte-sized `body_json`.** Print it
  with `--json` and filter, never in a table, and never pipe the whole thing into
  a model's context.
- **`per_page` is silently capped at 1000.** Asking for more returns 1000 with
  no error.
- **A missing title fails server-side.** The dry run will happily print a
  payload with no `title`; the API rejects it. Check the front matter has one.
- **Admin endpoints return 401 without an admin key.** That is expected, not a
  bug. They are `/api/admin/*`, `request-redirects`, and most of `segments`,
  `billboards`, `surveys`, `badges`, `badge-achievements`, `recommended-lists`.
- **`listings` is the deprecated v0 API.** It may disappear.

## Loading more detail

Read `references/commands.md` when you need to find the command for a task —
publishing, reading, moderation, analytics, or admin work — or when a command
you tried did not exist.

Read `references/sdk.md` when the work belongs in a TypeScript file rather than
a shell command, or when you need the client options, pagination helpers, or
typed error classes.

`docs/cli-reference.md` in the repository has the exhaustive flag list for every
command. `docs/api-coverage.md` maps each API operation to the command that
covers it.
