# CLI reference

```
devto <resource> <action> [arguments] [options]
```

Global options come before the resource name:

| Flag               | What it does                                            |
| ------------------ | ------------------------------------------------------- |
| `--api-key <key>`  | API key, overriding `DEVTO_API_KEY` and the config file |
| `--base-url <url>` | Forem instance URL (default `https://dev.to`)           |
| `--json`           | Print the raw API response instead of a table           |
| `--quiet`          | Print nothing on success                                |
| `--verbose`        | Print the resolved base URL and whether a key was found |
| `--no-color`       | Disable coloured output                                 |
| `--timeout <ms>`   | Request timeout, default 30000                          |
| `--dry-run`        | Print the request that would be sent, and send nothing  |
| `--yes`            | Skip the confirmation prompt on destructive commands    |

Exit codes: `0` success, `1` API error, `2` usage error.

The API key is never printed. Everywhere it could appear — `--verbose`, `--dry-run`,
error messages — it is replaced with `****` plus its last four characters.

---

## Configuration

```
devto auth login --key <key> [--base-url <url>]
devto auth logout
devto auth whoami
devto config list
devto config get <apiKey|baseUrl>
devto config set <apiKey|baseUrl> <value>
```

`auth login` writes `<config dir>/config.json` with mode `0600`. The config
directory is `~/Library/Application Support/devto` on macOS,
`%APPDATA%\devto` on Windows, and `$XDG_CONFIG_HOME/devto` (or `~/.config/devto`)
elsewhere. `DEVTO_CONFIG_DIR` overrides it.

Resolution order: `--api-key` → `DEVTO_API_KEY` → config file.

---

## Any endpoint

```
devto api <METHOD> <path> [--query key=value]... [--data <json>]
```

Always prints JSON, so it pipes into `jq`. Methods other than `GET` ask for
confirmation unless `--yes` is passed, and `--dry-run` shows the request without
sending it.

```sh
devto api GET /api/articles --query tag=rust --query per_page=5
devto api POST /api/follows --data '{"user_ids":[1,2]}'
devto api POST /api/articles --data @article.json
cat article.json | devto api POST /api/articles --data -
devto api GET /api/articles/me | jq '.username'
```

---

## Articles

```
devto articles list [--tag] [--tags] [--tags-exclude] [--username] [--state fresh|rising|all]
                    [--top <days>] [--collection-id] [--page] [--per-page] [--all]
devto articles latest [--page] [--per-page] [--all]
devto articles search -q <text> [--top] [--page] [--per-page]
devto articles get <id>
devto articles get-by-path <username> <slug>
devto articles mine [--state published|unpublished|all] [--page] [--per-page] [--all]
devto articles create --file <path>
devto articles update <id> --file <path>
devto articles push --file <path>
devto articles unpublish <id> [--note <text>]
```

### Markdown files

`create`, `update` and `push` read YAML front matter:

```md
---
title: My post
tags: javascript, typescript
published: false
description: A short summary
canonical_url: https://example.com/original
cover_image: https://example.com/cover.png
organization_id: 42
series: Building things
---

Body goes here.
```

| Front matter                 | API field         | Notes                                                       |
| ---------------------------- | ----------------- | ----------------------------------------------------------- |
| `title`                      | `title`           |                                                             |
| `tags`                       | `tags`            | A list or a comma-separated string                          |
| `published`                  | `published`       | Defaults to the API's default when omitted                  |
| `description`                | `description`     |                                                             |
| `canonical_url`              | `canonical_url`   |                                                             |
| `cover_image` / `main_image` | `main_image`      | Both names work                                             |
| `organization_id`            | `organization_id` |                                                             |
| `series`                     | `series`          |                                                             |
| `id`                         | —                 | Written back by `push`, and used to decide create vs update |

`push` creates the article when there is no `id`, then writes the returned id into
the file. Running it again updates that article instead of creating another one.

---

## Users

```
devto users me
devto users get <id-or-username>
devto users search --email <email>            # admin key
devto users suspend|limit|unlimit|spam|unspam|trust|untrust|unpublish <id>
devto users admin list [--page] [--per-page] [--email] [--username]
devto users admin get <id>
devto users admin create [--email] [--name]
devto users admin update <id> [--name] [--username] [--summary] [--location] [--website-url]
devto users admin set-email <id> --email <email>
devto users admin set-status <id> --status <status> [--note <note>]
devto users admin set-notification-settings <id> --email-newsletter <true|false>
devto users admin merge <id> --into <id>       # irreversible
devto users admin notes <user-id>
devto users admin add-note <user-id> --content <text> [--reason <reason>]
devto users admin identities <user-id>
devto users admin add-identity <user-id> --provider <p> --uid <u> [--username]
devto users admin remove-identity <user-id> <identity-id>
devto users admin bulk-identities --data <json>
```

Every moderation command and everything under `admin` needs an admin API key and
asks for confirmation.

---

## Comments, reactions, reading list, follows

```
devto comments list [--article <id>] [--parent <id>] [--page] [--per-page 10|30]
devto comments get <id-code>
devto reactions create --type Article|Comment|User --id <n> --category <c>
devto reactions toggle --type Article|Comment|User --id <n> --category <c>
devto reading-list list [--page] [--per-page] [--all]
devto follows create [--users 1,2] [--organizations 3,4]
devto follows tags
devto followers list [--sort <field>] [--page] [--per-page] [--all]
```

`--category` is one of `like`, `unicorn`, `exploding_head`, `raised_hands`, `fire`.
The reaction parameters go in the query string, which is what the API expects.

---

## Analytics

All of these need an API key and report on your own content.

```
devto analytics totals            [--start] [--end] [--article-id] [--organization-id]
devto analytics historical        [--start] [--end] [--article-id] [--organization-id]
devto analytics past-day          [--start] [--end] [--article-id] [--organization-id]
devto analytics referrers         [--start] [--end] [--article-id] [--organization-id]
devto analytics top-contributors  [--start] [--end] [--article-id] [--organization-id]
devto analytics follower-engagement [--start] [--end] [--article-id] [--organization-id]
devto analytics dashboard         [--start] [--end] [--article-id] [--organization-id]
devto analytics heatmap           [--start] [--end] [--article-id] [--organization-id]
```

All eight accept the same four filters; the API ignores the ones that do not apply.

Dates are `YYYY-MM-DD`.

---

## Organizations, pages, segments, billboards

```
devto organizations list [--page] [--per-page]
devto organizations get <username-or-id>
devto organizations articles <username-or-id> [--page] [--per-page]
devto organizations users <username-or-id> [--page] [--per-page]
devto organizations create --data <json>
devto organizations update <id> --data <json>
devto organizations delete <id>

devto pages list
devto pages get <id>
devto pages create --data <json>
devto pages update <id> --data <json>
devto pages delete <id>

devto segments list [--per-page]
devto segments get <id>
devto segments create
devto segments delete <id>                       # 409 while a billboard uses it
devto segments users <id> [--per-page]
devto segments add-users <id> --users 1,2
devto segments remove-users <id> --users 1,2

devto billboards list
devto billboards get <id>
devto billboards create --data <json>
devto billboards update <id> --data <json>
devto billboards unpublish <id>
```

`--data` accepts inline JSON, `@file.json`, or `-` to read stdin.

---

## Discovery

```
devto tags list [--page] [--per-page]
devto trends list [--page] [--per-page]
devto trends get <id-or-slug>
devto trends articles <id-or-slug> [--page] [--per-page]
devto videos list [--page] [--per-page]
devto podcast-episodes list [--username] [--page] [--per-page]
devto profile-images <username>
devto instance
devto subforems
devto health app|database|cache [--token <token>]
```

---

## Concepts, badges, lists, surveys, redirects

```
devto concepts list [--page] [--per-page] [--days]
devto concepts get <id> [--days]
devto concepts articles <id> [--sort] [--page] [--per-page]
devto concepts update <id> --data <json>
devto concepts admin list [--page] [--per-page]
devto concepts admin get <id>
devto concepts admin create --data <json>
devto concepts admin update <id> --data <json>
devto concepts admin delete <id>
devto concepts admin trigger-lookback <id> --days <n>

devto badges list [--page]
devto badges get <id>
devto badges create --data <json>
devto badges update <id> --data <json>
devto badges delete <id>

devto badge-achievements list [--page]
devto badge-achievements get <id>
devto badge-achievements create --user <id> --badge <id> [--message <md>] [--include-default-description]
devto badge-achievements delete <id>

devto recommended-lists list [--page] [--search]
devto recommended-lists get <id>
devto recommended-lists create --data <json>
devto recommended-lists update <id> --data <json>

devto surveys list [--page] [--per-page] [--active]
devto surveys get <id-or-slug>
devto surveys poll-votes <id-or-slug> [--per-page] [--after]
devto surveys poll-text-responses <id-or-slug> [--per-page] [--after]

devto request-redirects list [--page] [--per-page]
devto request-redirects get <id>
devto request-redirects create --original-url <u> --destination-url <u> --request-domain <d>
devto request-redirects update <id> [--original-url] [--destination-url] [--request-domain]
devto request-redirects delete <id>

devto feedback-messages <id> --status <status>
```

---

## Agent sessions

```
devto agent-sessions list
devto agent-sessions get <id>
devto agent-sessions raw-url <id>
devto agent-sessions upload --file <transcript> --title <title> [--tool <name>] [--curated-data <json>]
```

`upload` is the only command that talks to two services:

1. `POST /api/agent_sessions/presign` to get an upload URL.
2. `PUT` the transcript to that URL (storage, not the API).
3. `POST /api/agent_sessions` with the returned `s3_key`.

If the instance has no S3 bucket configured the first step returns `503`, and the
command says so instead of failing obscurely.

`--tool` is one of `claude_code`, `codex`, `gemini_cli`, `github_copilot`,
`opencode`, `pi`. `curated_data` is sent as a JSON **string**, which is what the
API requires.

---

## Listings (deprecated)

```
devto listings list [--category] [--page] [--per-page]
devto listings get <id>
devto listings by-category <category>
devto listings by-organization <username>
```

These come from the deprecated v0 API. They still work, but Forem may remove them
at any time, so each command prints a warning.
