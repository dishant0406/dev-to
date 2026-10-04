# Finding the command for a task

Grouped by what you are trying to do. Only the flags that matter are listed —
`docs/cli-reference.md` has every flag for every command, and `devto <group>
<command> --help` is always authoritative.

Every command accepts the global flags (`--json`, `--dry-run`, `--yes`,
`--quiet`, `--verbose`, `--api-key`, `--base-url`, `--timeout`, `--no-color`,
`--help`, `--version`).

## First: is it set up?

| Goal                        | Command                                             |
| --------------------------- | --------------------------------------------------- |
| Check which account you are | `devto auth whoami`                                 |
| Save a key                  | `devto auth login --key YOUR_KEY`                   |
| Forget the key              | `devto auth logout`                                 |
| See the resolved config     | `devto config list`                                 |
| Read one value              | `devto config get apiKey`                           |
| Set one value               | `devto config set baseUrl https://my-forem.example` |

The API key is found in this order, highest first: `--api-key`, then the
`DEVTO_API_KEY` environment variable, then the config file written by `devto
auth login`. So a key already in the environment needs no setup — just run the
command.

## Publish and update articles

| Goal                                   | Command                                    |
| -------------------------------------- | ------------------------------------------ |
| Create or update from markdown (usual) | `devto articles push --file post.md`       |
| Create a second copy on purpose        | `devto articles create --file post.md`     |
| Update a known article from a file     | `devto articles update 123 --file post.md` |
| Take a post off the site               | `devto articles unpublish 123`             |

Front matter keys the file understands: `title`, `tags` (comma list or YAML
list), `published`, `description`, `series`, `canonical_url`, `cover_image` (or
`main_image`), `organization_id`, `id`.

`push` writes the returned `id` back into the front matter. `create` does not,
so running it twice makes two articles.

## Read articles

| Goal                           | Command                                    |
| ------------------------------ | ------------------------------------------ |
| By tag                         | `devto articles list --tag typescript`     |
| By author                      | `devto articles list --username ben`       |
| Newest first                   | `devto articles latest`                    |
| Search by text                 | `devto articles search -q "rate limiting"` |
| One article by id              | `devto articles get 123`                   |
| One article by author and slug | `devto articles get-by-path ben my-post`   |
| Your own, including drafts     | `devto articles mine --state all`          |
| Every page of any of the above | add `--all`                                |

`--state` on `articles list` is `fresh`, `rising` or `all`. On `articles mine`
it is `published`, `unpublished` or `all`.

## People, tags, comments

| Goal                          | Command                             |
| ----------------------------- | ----------------------------------- |
| You                           | `devto users me`                    |
| A profile by id or username   | `devto users get dishant0406`       |
| A user's avatar images        | `devto profile-images dishant0406`  |
| Tags                          | `devto tags list`                   |
| Comments on an article        | `devto comments list --article 123` |
| Replies to a comment          | `devto comments list --parent 456`  |
| One comment                   | `devto comments get <id-code>`      |
| Who follows you               | `devto followers list`              |
| Who you follow                | `devto follows tags`                |
| Follow users or organizations | `devto follows create --users 1,2`  |

`comments list` takes `--per-page` of only `10` or `30`; anything else is a
usage error. Without `--article` the API ignores `per_page` entirely.

## Your own activity

| Goal                    | Command                                                          |
| ----------------------- | ---------------------------------------------------------------- |
| Lifetime totals         | `devto analytics totals`                                         |
| A date range            | `devto analytics historical --start 2026-01-01 --end 2026-03-01` |
| Last 24 hours           | `devto analytics past-day`                                       |
| Traffic sources         | `devto analytics referrers`                                      |
| Most engaged readers    | `devto analytics top-contributors`                               |
| Everything at once      | `devto analytics dashboard`                                      |
| Reading activity by day | `devto analytics heatmap`                                        |
| Saved articles          | `devto reading-list list`                                        |
| React to something      | `devto reactions toggle --type Article --id 123 --category like` |
| Add a reaction only     | `devto reactions create --type Article --id 123 --category like` |

All analytics commands take `--start`, `--end`, `--article-id` and
`--organization-id`. `--type` is `Article`, `Comment` or `User`. `--category`
is `like`, `unicorn`, `exploding_head`, `raised_hands` or `fire`.

## Moderation (needs a key with moderation rights)

`devto users suspend <id>` · `limit` · `unlimit` · `spam` · `unspam` · `trust`
· `untrust` · `unpublish <id>`

All of these confirm first. `users unpublish` unpublishes **every** article the
user wrote.

## Admin only (expect 401 without an admin key)

These are listed by group so you can tell which one owns a command. Run
`devto users admin --help` or `devto segments --help` for the flags.

| Group                | Commands                                                                                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users admin`        | `list`, `get`, `create`, `update`, `set-email`, `set-status`, `set-notification-settings`, `merge`, `notes`, `add-note`, `identities`, `add-identity`, `remove-identity`, `bulk-identities` |
| `concepts admin`     | `list`, `get`, `create`, `update`, `delete`, `trigger-lookback`                                                                                                                             |
| `request-redirects`  | `list`, `get`, `create`, `update`, `delete`                                                                                                                                                 |
| `segments`           | `list`, `get`, `create`, `delete`, `users`, `add-users`, `remove-users`                                                                                                                     |
| `billboards`         | `list`, `get`, `create`, `update`, `unpublish`                                                                                                                                              |
| `surveys`            | `list`, `get`, `poll-votes`, `poll-text-responses`                                                                                                                                          |
| `badges`             | `list`, `get`, `create`, `update`, `delete`                                                                                                                                                 |
| `badge-achievements` | `list`, `get`, `create`, `delete`                                                                                                                                                           |
| `recommended-lists`  | `list`, `get`, `create`, `update`                                                                                                                                                           |
| `pages`              | `list`, `get`, `create`, `update`, `delete`                                                                                                                                                 |
| `organizations`      | `list`, `get`, `articles`, `users`, `create`, `update`, `delete`                                                                                                                            |
| `feedback-messages`  | `devto feedback-messages <id> --status Resolved`                                                                                                                                            |

`users admin merge --into <id>` is irreversible.

## Public and instance data

`devto instance` · `devto subforems` · `devto health app` (also `database`,
`cache`) · `devto trends list` · `devto videos list` · `devto podcast-episodes
list` · `devto concepts list` · `devto listings list`

`listings` is the deprecated v0 API. `health` takes `--token` only if the
instance requires one.

## Commands that take `--data <json>`

These read a JSON file or stdin: `--data @file.json`, or `--data -` to pipe.

`organizations create|update` · `pages create|update` · `billboards
create|update` · `concepts admin create|update` · `concepts update` · `badges
create|update` · `recommended-lists create|update` · `users admin
bulk-identities`

## Nothing above matches

Use the escape hatch. It reaches every endpoint in the API, including ones with
no typed command:

```sh
devto api GET /api/articles --query tag=rust --query per_page=5
devto api GET /api/articles/me | jq '.username'
devto api POST /api/follows --data '{"user_ids":[1,2]}'
```

`api` always prints JSON. Query parameters use the API's own snake_case names,
not the camelCase the typed commands use. Anything other than `GET` confirms
first and needs `--yes` when stdin is not a terminal.

`devto api` is the fallback. A typed command does the same thing with the right
parameter names and the right confirmation.
