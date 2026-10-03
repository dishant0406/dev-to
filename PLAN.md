# Plan: Granular dev.to / Forem CLI + TypeScript SDK

> **Historical design brief. The implementation is done.**
>
> Current sources of truth: [`AGENTS.md`](AGENTS.md) for how the code is written,
> [`docs/api-coverage.md`](docs/api-coverage.md) for what is implemented, and
> [`docs/cli-reference.md`](docs/cli-reference.md) for the command list.
>
> Three decisions changed while building, so the sections below are out of date on
> these points only:
>
> - **Types are hand-written** (`packages/sdk/src/types.ts`), not generated with
>   `openapi-typescript`. The 39 schemas are small enough to write by hand, and
>   dropping the generator removed a build step, a dependency and a generated file
>   from the repository. Spec drift is caught by `scripts/check-spec-drift.mjs`.
> - **No `spec/forem-api-v0.yaml`.** The four v0-only listing routes are written
>   directly into `resources/platform.ts`.
> - **Package names** are `@dishant0406/dev-to` (SDK) and `@dishant0406/dev-to-cli`
>   (CLI, bin `devto`), with `commander@14` to match the Node 20 floor.

**Original status:** Investigation complete. This document was the implementation brief.

**Target API:** Forem API V1 — https://developers.forem.com/api/v1
**Workspace:** `/Users/dishants/projects/dev-cli` (currently empty — greenfield, no git repo)

---

## 0. Reframing the brief ("root cause")

There is no bug here. The brief is a _build_ request, so "root cause" is reframed as
**why this does not exist yet and what the real constraints are.**

**What is actually happening:** `dev.to` is powered by Forem, an open-source Rails app. Forem
publishes a machine-readable OpenAPI 3.0.3 spec covering **92 paths / 126 operations** across
**29 resource groups**. Anyone can build on it, but:

- **No official SDK exists in any language.** Confirmed: `developers.forem.com/api` links no SDK;
  the npm registry has no `devto-node`, `@devto/sdk`, or equivalent (registry 404s).
- **Existing community clients are stale and article-only.** `devto-nodejs-sdk` (plain JS, wraps
  the _deprecated v0_ spec, ~2020), `sinedied/devto-cli` (JS, articles only), `shihanng/devto`
  (Go, articles only), Rust `devto-cli` (articles only). **None** cover analytics, concepts,
  segments, admin, agent sessions, surveys, or billboards.
- So the gap is real: **a typed TS SDK + CLI that covers the whole surface, not just publishing.**

**What should happen:** a single TypeScript monorepo that ships (a) a fully-typed SDK covering all
126 v1 operations (plus the v0-only endpoints), and (b) a granular CLI built on that SDK, including
a raw `api` escape hatch so no endpoint is ever unreachable.

**The real constraint that shapes the design — rate limits.** Forem runs `rack-attack`
(`config/initializers/rack_attack.rb`, verified against upstream `main`). Limits are _low_:

| Scope                    | Limit           | Key              |
| ------------------------ | --------------- | ---------------- |
| GET `/api/*`             | **3 / second**  | IP               |
| GET `/api/*`             | **30 / minute** | IP               |
| GET `/api/*`             | **3 / second**  | `api-key` header |
| GET `/api/*`             | **30 / minute** | `api-key` header |
| POST/PUT/DELETE `/api/*` | **1 / second**  | IP               |
| POST/PUT/DELETE `/api/*` | **1 / second**  | `api-key` header |

Admin/super_admin/tech_admin keys bypass all of the above. Throttled requests return **HTTP 429**
with a plain-text body `Retry later` and a `Retry-After` header. **No `X-RateLimit-*` headers and no
`Link` header are ever emitted.** This means a naive paginating client will hit 429 on the _third_
page. The SDK **must self-throttle** and the CLI **must serialize writes** — this is not optional
polish, it is the core correctness requirement of the project.

---

## 1. Evidence

All claims below were verified directly (live probes against `https://dev.to` on 2026-10-03, plus
primary sources). Raw artifacts produced during investigation: `/tmp/devto/spec.yaml`,
`/tmp/devto/spec0.yaml`, `/tmp/devto/ops.txt` (per-op param/auth/body map), `/tmp/devto/coverage.md`.

### 1.1 Primary sources

| Source                                                                                   | What it establishes                                                                                                                                                     |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `https://developers.forem.com/redocusaurus/plugin-redoc-1.yaml`                          | Canonical OpenAPI 3.0.3 spec for v1. 92 paths, 126 ops, 39 schemas.                                                                                                     |
| `https://developers.forem.com/redocusaurus/plugin-redoc-0.yaml`                          | Legacy v0 spec (27 paths). Contains endpoints **absent from v1**: `/listings`, `/listings/category/{category}`, `/listings/{id}`, `/organizations/{username}/listings`. |
| `https://raw.githubusercontent.com/forem/forem/main/config/initializers/rack_attack.rb`  | Exact rate limits (table above), `throttled_response_retry_after_header = true`, admin bypass logic.                                                                    |
| `https://developers.forem.com/api`                                                       | v1 requires `Accept: application/vnd.forem.api-v1+json`; "many endpoints (but not all) require api-key header".                                                         |
| `forem/forem` `config/routes.rb` + `app/controllers/api/v1/agent_sessions_controller.rb` | `POST /api/agent_sessions/presign` and `GET /api/agent_sessions/:id/raw_url` exist but are **undocumented** in the spec.                                                |

### 1.2 Live runtime observations

```
GET /api/articles?per_page=2   Accept: v1  -> 200, JSON array
GET /api/articles/me           no key      -> 401 {"error":"unauthorized","status":401}
GET /api/articles/999999999                -> 404 {"error":"not found","status":404}
POST /api/agent_sessions/presign  no key   -> 401  (NOT 404 -> route exists, confirmed)
GET  /api/agent_sessions/foo/raw_url       -> 401  (route exists, confirmed)
GET  /api/listings?per_page=1              -> 200, []   (v0-only route, still live)
GET  /api/articles?per_page=1000           -> 200, 1000 items
GET  /api/articles?per_page=1001           -> 200         (silently capped, no error)
GET  /api/articles (no Accept header)      -> 200         (Accept not strictly enforced on read)
6 rapid GETs, no api-key                   -> 200 x6      (3/s IP throttle not hit from this client)
No `Link:` header; no `X-RateLimit-*` header on any response.
```

### 1.3 Spec-vs-reality gaps that the SDK must paper over

These are the traps that a naive "generate everything from the spec" approach will ship broken.

1. **Response drift.** Spec `ArticleIndex` declares 25 props. The live `GET /api/articles/4766339`
   payload has **32**, including `collection_id`, `language`, `subforem_id`, `ai_disclosure_level`,
   `ai_disclosure_label`. The spec's `Comment` schema is 4 props; live `/api/comments?a_id=...`
   returns `type_of, id_code, created_at, body_html, user` — i.e. the spec is **wrong/incomplete**.
   → Generated types must be treated as a _baseline_, and the SDK must not strip unknown fields.
2. **Params literally named `undefined`.** `/api/articles` (`getArticles`), `/api/articles/latest`,
   `/api/articles/me*`, `/api/comments`, `/api/followers/users`, `/api/organizations/.../users`,
   `/api/readinglist`, `/api/surveys/...`, `/api/videos`, `/api/tags`, `/api/trends` all carry
   parameters whose `name` is the string `undefined`. **Params cannot be generated from the spec**;
   they must be hand-written.
3. **Missing `operationId`s.** Only ~50 of 126 ops have one; ~76 do not. Method names cannot be
   derived reliably from the spec.
4. **`/api/comments` has a duplicated `page` param** — one `integer` (`default 1`) and one `string`.
   Real behaviour: `per_page` is a **string enum** (`"10"`/`"30"`), not an integer, and is only
   honoured when `a_id` is present.
5. **Undocumented endpoints.** `POST /api/agent_sessions/presign` (returns
   `{s3_key, presigned_url}`; **503** `{"error":"S3 storage is not configured"}` when S3 is off) and
   `GET /api/agent_sessions/:id/raw_url` (returns `{raw_url}`). Required to complete the documented
   agent-session upload workflow. Also `POST /api/agent_sessions` body `curated_data` is a
   **JSON string**, not an object — easy to get wrong.
6. **Mixed auth reality.** Spec marks most endpoints `api-key` (inherited from the global
   `security` block) but `GET /api/profile_images/{username}` is marked `api-key` while
   **working without one (200)**. Conversely several "public" endpoints (`/api/comments`,
   `/api/organizations/*`, `/api/tags`, `/api/trends`, `/api/videos`) behave as public.
   → The client should **always send the key when it has one**, and never _require_ it except where
   the live 401 proves it is needed.
7. **`per_page` limits vary per endpoint and are not enforced.** Declared maxima range 30–1000;
   `per_page=1001` returns 200 (silently capped). `/api/articles` with `username` + `state=all`
   returns up to 1000 in one page.
8. **Error body shape is uniform but not JSON:API:** `{"error": <string>, "status": <int>}` — except
   throttling, which is **plain text** `Retry later`, so the error parser must handle both.

### 1.4 Complete endpoint inventory (the coverage contract)

126 operations, 29 tags. This is the authoritative checklist the SDK and CLI must satisfy.
Counts per tag: `users 25, articles 12, concepts 10, analytics 8, organizations 8, segments 7,
badges 5, billboards 5, pages 5, request_redirects 5, badge_achievements 4,
recommended_articles_lists 4, surveys 4, agent_sessions 3, health_checks 3, trends 3, comments 2,
reactions 2, feedback_messages 1, followed_tags 1, followers 1, follows 1, instance 1,
podcast_episodes 1, profile_images 1, readinglist 1, subforems 1, tags 1, videos 1.

Full method/path/auth table is in `/tmp/devto/coverage.md` and must be copied into the repo as
`docs/api-coverage.md` (checked in, ticked off as implemented).

Notable per-endpoint quirks to encode:

- `PUT /api/articles/{id}/unpublish` → **204 no body** (client must not try to parse JSON).
- `PUT /api/users/{id}/unpublish` → 204; `DELETE /api/segments/{id}` → can return **409** if the
  segment is attached to a live billboard.
- `POST /api/reactions` (create) vs `POST /api/reactions/toggle` (idempotent toggle) — params go in
  the **query string**, not the body.
- `POST /api/follows` takes `{user_ids[], organization_ids[]}`.
- `GET /api/users/search?email=` requires an **admin** key.
- `/api/admin/*` endpoints (users, concepts, request_redirects) are admin-only; the CLI must mark
  them clearly and gate destructive ones.
- `GET /api/organizations/{organization_id_or_username}/users` accepts **id or username**.
- `GET /api/trends/{id_or_slug}/articles`, `/api/surveys/{id_or_slug}` — polymorphic path params.

---

## 2. Proposed solution

**One TypeScript monorepo, two published packages, one shared client core. No new architecture
beyond that.**

```
dev-cli/
├── package.json                 # npm workspaces root; scripts: build, test, lint, typecheck, spec:sync
├── tsconfig.base.json
├── PLAN.md                      # this file
├── README.md
├── docs/
│   ├── api-coverage.md          # the 126-op checklist, ticked off as implemented
│   └── cli-reference.md         # generated/curated CLI command reference
├── spec/
│   ├── forem-api-v1.yaml        # vendored copy of plugin-redoc-1.yaml
│   └── forem-api-v0.yaml        # vendored copy of plugin-redoc-0.yaml (v0-only endpoints)
├── scripts/
│   └── sync-spec.mjs            # re-download spec -> regenerate types -> fail CI on drift
└── packages/
    ├── sdk/                     # the SDK (library, typed, publishable)
    └── cli/                     # the `devto` binary (depends on packages/sdk)
```

### 2.1 Why two packages, not one or three

- **Not one:** shipping `commander` + table renderers inside the library package bloats every
  consumer's install. Library users want ~0 deps.
- **Not three:** a separate `core` package is only justified if a third consumer exists. It does
  not. The HTTP client, errors, throttle, pagination and types all live **inside `packages/sdk`**.
- **Two** gives a clean boundary, and the CLI consuming the SDK's _public_ API is free dogfooding:
  if a command is awkward to write, the SDK ergonomics are wrong.

### 2.2 Codegen vs hand-written — the decision, and why

| Option                                                  | Verdict                                                                                                                                                                                                                                                    |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Generate **everything** (types + methods) from the spec | **Rejected.** 76/126 ops have no `operationId`; params are literally named `undefined`; `Comment`/`ArticleIndex` schemas are wrong; the presign/raw_url endpoints are absent. Generated methods would be broken or absurdly named.                         |
| Hand-write **everything** (types + methods)             | **Rejected.** 126 ops × response shapes is too much drift risk; the spec is the source of truth for _shapes_.                                                                                                                                              |
| **Generated types + hand-written thin methods** ✅      | **Chosen.** `openapi-typescript` generates the shape baseline (free, accurate, refreshable). ~126 two-to-four-line methods are hand-written so names are ergonomic and every quirk above is expressible. Drift is caught by `scripts/sync-spec.mjs` in CI. |
| Table-driven generic endpoints                          | **Rejected.** Loses per-method param/return typing, which is the whole point of a "granular" SDK.                                                                                                                                                          |

Types are generated from the **vendored** spec, not fetched at build time — builds must be
reproducible and offline. `spec:sync` is an explicit, reviewed action.

### 2.3 SDK shape

```ts
import { DevToClient } from "@scope/devto";

const devto = new DevToClient({ apiKey: process.env.DEVTO_API_KEY });

// granular, typed, one method per operation
const articles = await devto.articles.list({ tag: "javascript", perPage: 30, state: "rising" });
const me = await devto.users.me();
const stats = await devto.analytics.totals({ articleId: 123 });
await devto.reactions.toggle({ category: "like", reactableId: 123, reactableType: "Article" });
await devto.articles.unpublish(123, { note: "superseded" }); // handles 204

// pagination as an async iterator (self-throttled, no 429)
for await (const page of devto.paginate(devto.articles.list, { tag: "rust" })) {
  /* ... */
}

// raw escape hatch — any path, incl. undocumented/future endpoints
await devto.request("POST", "/api/agent_sessions/presign");
```

Layers inside `packages/sdk/src`:

- `client.ts` — `DevToClient`. Owns: base URL (default `https://dev.to`, overridable for
  self-hosted Forem), `api-key` + `Accept: application/vnd.forem.api-v1+json` headers, timeout via
  `AbortSignal.timeout`, and delegation to the throttle + error layers.
- `http.ts` — `HttpClient.request()`: single choke point for every call. Native `fetch` (Node ≥20).
  Normalises: query-string building (skips `undefined`, serialises arrays as CSV), JSON body,
  `204`/empty-body handling, and response parsing.
- `errors.ts` — `DevToError` base (`status`, `error`, `method`, `path`, `body`) plus
  `AuthenticationError` (401), `NotFoundError` (404), `ValidationError` (422, carries field errors),
  `ConflictError` (409), `RateLimitError` (429, carries `retryAfter` from the header),
  `ServerError` (5xx). Parser handles **both** the JSON `{error,status}` shape and the plain-text
  `Retry later` body.
- `throttle.ts` — client-side token bucket mirroring `rack_attack.rb`:
  reads `3/s + 30/min`, writes `1/s`. A `Retry-After`-aware backoff on 429. **This is what makes
  pagination and bulk operations actually work.**
- `pagination.ts` — `paginate()` async generator + `pageAll()` helper. Stops when a page returns
  fewer items than `per_page` or an empty array (no `Link` header exists to rely on).
- `types/generated.ts` — output of `openapi-typescript` (do not edit by hand; header comment says so).
- `types/index.ts` — curated aliases (`Article`, `User`, `Comment`, …) and **hand-written types for
  the fields the spec is missing** (`collection_id`, `language`, `subforem_id`,
  `ai_disclosure_level`, `ai_disclosure_label`, real `Comment`) and for v0-only resources
  (`Listing`).
- `resources/*.ts` — one file per tag group (~29 files). Each exports a small class
  (`ArticlesResource`, `UsersResource`, …) holding the thin methods.
- `index.ts` — public surface: `DevToClient`, error classes, types. Nothing else.

### 2.4 CLI shape

Two layers, so granularity is guaranteed regardless of SDK coverage:

**Layer 1 — resource commands** (`devto <resource> <action>`), ergonomic and typed.

**Layer 2 — raw escape hatch:** `devto api <METHOD> <path> [--query k=v]... [--data @f.json|-]`.
This alone makes every current _and future_ endpoint reachable — it is the safety net that
guarantees the "completely granular" requirement can never be invalidated by an API addition.

Full command tree (every one of the 126 ops maps to a command):

```
devto
├── auth login --key <k> [--base-url <u>] | logout | whoami
├── config get|set|list
├── api <METHOD> <path> [--query k=v]... [--data @file|-] [--header k=v]...
├── instance get
├── health app|database|cache
├── articles list|latest|search|get|get-by-path|mine|create|update|unpublish|push
├── comments list --article <id> | --parent <id>;  comments get <id_code>
├── reactions toggle|create --type Article|Comment|User --id <n> --category <c>
├── readinglist list
├── follows tags | follows create --users 1,2 --orgs 3
├── followers list [--sort]
├── tags list | trends list|get|articles | videos list | podcast-episodes list
├── users me|get|search|unpublish|suspend|limited|spam|trusted
├── organizations list|get|articles|users|create|update|delete
├── profile-images get <username>
├── analytics totals|historical|past-day|referrers|top-contributors|follower-engagement|dashboard|heatmap
├── segments list|get|create|delete|users|add-users|remove-users
├── concepts list|get|articles|update
├── badges list|get|create|update|delete
├── badge-achievements list|get|create|delete
├── billboards list|get|create|update|unpublish
├── pages list|get|create|update|delete
├── surveys list|get|poll-votes|poll-text-responses
├── subforems list
├── recommended-lists list|get|create|update
├── request-redirects list|get|create|update|delete
├── feedback-messages update <id> --status <s>
├── agent-sessions list|get|upload --file <transcript>
└── admin users ... | admin concepts ...
```

**Global flags:** `--api-key`, `--base-url`, `--json`, `--quiet`, `--verbose`, `--no-color`,
`--timeout <ms>`, `--dry-run` (writes only), `--yes` (skip confirmations), `--all` (auto-paginate).

**Safety (must-have, not polish):** destructive commands (`delete`, `suspend`, `merge`, `spam`,
`unpublish-user`) prompt for confirmation unless `--yes`; `--dry-run` prints the exact request
(method, URL, body) without sending; API keys are redacted from all output, including `--verbose`
and error traces.

**Markdown authoring (the flagship workflow):**

- `devto articles create --file post.md` — parses YAML front-matter (`title`, `tags`, `published`,
  `series`, `canonical_url`, `cover_image`/`main_image`, `description`, `organization_id`) via
  `gray-matter`, maps it to the API body, and prints the created article URL + id.
- `devto articles push --file post.md` — create-or-update: if front-matter has `id`, PUT; else POST
  and **write the returned id back into the front-matter** (idempotent re-runs, matches the
  `sinedied/devto-cli` convention so files stay portable).
- `devto articles update <id> --file post.md`.

### 2.5 Configuration & auth resolution

Precedence (highest first):

1. `--api-key` / `--base-url` CLI flags
2. `DEVTO_API_KEY` / `DEVTO_BASE_URL` environment variables
3. Config file at `<env-paths('devto')>/config.json` (mode `0600`), written by `devto auth login`

Config file content: `{ "apiKey": "...", "baseUrl": "https://dev.to" }`. Written with `0600` perms;
never logged. `devto config list` shows the key **masked**.

### 2.6 Tooling choices (with rationale)

| Concern      | Choice                                                      | Why                                                                                                                                                                          |
| ------------ | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build        | **tsup** (or tsdown)                                        | One config → ESM + CJS + `.d.ts` + CLI shebang. Most widely adopted.                                                                                                         |
| CLI parser   | **commander**                                               | Zero-dep, bundled types, best fit for a deep but shallow subcommand tree. _Pin the major that matches the minimum supported Node version._                                   |
| HTTP         | **native `fetch`**                                          | Node ≥20 has it; zero deps for the library. `undici` only if pooling is later needed.                                                                                        |
| Validation   | **none at runtime for responses; `zod` only for CLI input** | Responses are untrusted-but-tolerant (spec is wrong). Runtime schema validation of responses would reject valid payloads. CLI input validation is where zod earns its place. |
| Types        | **openapi-typescript** (types only)                         | Accurate baseline, offline, drift-checkable.                                                                                                                                 |
| Tests        | **vitest** + **msw**                                        | `msw`'s `setupServer` intercepts global `fetch` — works with our zero-dep native-fetch client.                                                                               |
| Front-matter | **gray-matter** (CLI only)                                  | De-facto standard.                                                                                                                                                           |
| Lint/format  | eslint (or oxlint) + prettier                               | Match whatever the repo adopts; keep default.                                                                                                                                |

Library `packages/sdk` dependencies: **zero runtime deps.** CLI deps: `commander`, `gray-matter`,
a small table renderer (hand-rolled or `cli-table3`), `zod` (input validation), `env-paths`.

---

## 3. Implementation steps

Ordered. Each step is independently verifiable. Do not start step _n+1_ before _n_ is green.

### Phase 0 — Scaffold

1. **Init repo + workspaces.** `git init`; root `package.json` with `"workspaces": ["packages/*"]`;
   scripts `build`, `test`, `lint`, `typecheck`, `spec:sync`. Root `tsconfig.base.json`
   (`strict: true`, `target: ES2022`, `module: NodeNext`). Add `.gitignore`, `.editorconfig`,
   `.npmrc`.
   _Why:_ everything else assumes this exists.
2. **Vendor the specs.** Copy `plugin-redoc-1.yaml` → `spec/forem-api-v1.yaml` and
   `plugin-redoc-0.yaml` → `spec/forem-api-v0.yaml` (both fetched during this investigation).
   _Why:_ reproducible, offline, reviewable builds; drift is explicit.
3. **Copy the coverage checklist.** `docs/api-coverage.md` from the 126-op inventory.
   _Why:_ it is the definition of "done" for coverage.

### Phase 1 — SDK core (no endpoints yet)

4. **Generate types.** Add `openapi-typescript` as a devDependency; `spec:gen` script writes
   `packages/sdk/src/types/generated.ts` from `spec/forem-api-v1.yaml` (and a v0 file). Add the
   "do not edit" header.
   _Why:_ gives every endpoint a shape baseline without hand-typing 39 schemas.
5. **Write `http.ts`.** Single `request()` choke point: URL/query builder (drops `undefined`,
   arrays → CSV, `Date` → `YYYY-MM-DD`), default headers, `AbortSignal.timeout`, `204`/empty-body
   handling, JSON parse, and raw-response option.
   _Why:_ all 126 methods must share one code path or quirks get re-solved 126 times.
6. **Write `errors.ts`.** Error taxonomy + dual-shape parser (JSON `{error,status}` **and** plain-text
   `Retry later`). Extract `Retry-After`.
   _Why:_ throttling returns non-JSON; a JSON-only parser throws a confusing `SyntaxError` instead of
   a useful `RateLimitError`.
7. **Write `throttle.ts`.** Token buckets: reads `3/s`, `30/min`; writes `1/s`; `Retry-After` backoff.
   Make it injectable/disableable (`throttle: false`) for tests and for admin keys (which bypass
   server limits).
   _Why:_ **the single most important correctness feature** — without it, pagination 429s by page 3.
8. **Write `client.ts`.** `DevToClient` wiring http + errors + throttle, exposing `request()`.
   _Why:_ the raw escape hatch and the base for all resources.

### Phase 2 — SDK resources (the 126 ops)

9. **Write resource classes, one file per tag** (~29 files under `src/resources/`), in this order —
   ordered by user value, so the SDK is usable early:
   1. `articles` (12) — incl. the `me*` family and `unpublish`
   2. `users` (25) — incl. `me`, `search`, moderation verbs, and all `/admin/users/*`
   3. `comments` (2), `reactions` (2), `readinglist` (1), `follows` (1), `followers` (1),
      `followed_tags` (1)
   4. `analytics` (8) — note the endpoint is `past_day`, method name `pastDay`
   5. `tags`, `trends` (3), `videos`, `podcast_episodes`, `profile_images`, `instance`,
      `subforems`, `health_checks` (3)
   6. `organizations` (8), `pages` (5), `segments` (7)
   7. `concepts` (10), `badges` (5), `badge_achievements` (4), `billboards` (5),
      `recommended_articles_lists` (4), `surveys` (4), `request_redirects` (5),
      `feedback_messages` (1)
   8. `agent_sessions` (3 + the 2 undocumented ones: `presign()`, `rawUrl()`)
   9. `listings` (v0-only: `/listings`, `/listings/category/{category}`, `/listings/{id}`)
      _Why this order:_ articles+users are 37 of 126 ops and cover 90 % of real usage.
10. **Tick off `docs/api-coverage.md`** as each resource lands. Add a test that asserts the
    coverage file has no unticked rows at the end.
    _Why:_ converts "did we cover everything?" into a machine-checked fact.
11. **Export the public surface** from `src/index.ts` (client, errors, curated types). Add
    `exports` map + `types` + `engines: { node: ">=20" }`.
    _Why:_ packaging correctness; prevents deep-import lock-in.

### Phase 3 — CLI

12. **Scaffold `packages/cli`.** `bin: { devto: "./dist/cli.js" }`, shebang banner in tsup config,
    dependency on `packages/sdk` via workspace protocol.
13. **Write `config.ts`** (env-paths location, `0600` write, masking) and **`context.ts`**
    (resolve key/baseUrl from flag > env > file; construct `DevToClient`).
    _Why:_ every command needs this; doing it once avoids 126 copies.
14. **Write `output.ts`** — `--json` passthrough, human table renderer, color handling, key
    redaction, `--quiet`.
15. **Write global option handling** + `confirm()` helper (`--yes`) + `dryRun()` helper.
16. **Implement commands group by group**, mirroring the SDK order in step 9. Use the SDK, never
    raw fetch — that is what proves the SDK works.
17. **Implement `devto api <METHOD> <path>`** early (it is ~30 lines) so unmapped endpoints are
    never blocked on CLI work.
18. **Implement the markdown workflows** (`articles create|update|push --file`), front-matter
    mapping, and id write-back.
19. **Implement `agent-sessions upload --file`** — the 3-step flow: `presign()` → `PUT` the raw
    transcript to `presigned_url` (S3, _not_ the Forem API) → `POST /api/agent_sessions` with
    `s3_key` + `curated_data` as a **JSON string**. Handle the `503` "S3 storage is not configured"
    case with a clear message.
    _Why:_ it is the only multi-service flow in the API and the easiest to get wrong.

### Phase 4 — Docs, CI, release

20. **READMEs**: root (what/why/quickstart), `packages/sdk` (API tour + pagination + errors),
    `packages/cli` (full command reference).
21. **CI** (GitHub Actions): `lint` → `typecheck` → `test` → `build` on Node 20/22. Plus a
    **scheduled `spec:sync` job** that re-downloads the upstream spec, regenerates types, and fails
    if the checked-in generated file differs.
    _Why:_ the API changes without warning (this investigation already found 7 undocumented fields);
    drift must be _loud_, not silent.
22. **Release**: changesets (or manual), `publishConfig.access`, verify the chosen npm names are
    actually free before publishing.

---

## 4. Files affected

**Created** (no existing files — greenfield workspace):

| Path                                                                                                  | Purpose                        |
| ----------------------------------------------------------------------------------------------------- | ------------------------------ |
| `package.json`, `tsconfig.base.json`, `.gitignore`, `.editorconfig`, `.npmrc`, `README.md`, `PLAN.md` | Root scaffold                  |
| `spec/forem-api-v1.yaml`, `spec/forem-api-v0.yaml`                                                    | Vendored specs                 |
| `scripts/sync-spec.mjs`                                                                               | Drift detection / regeneration |
| `docs/api-coverage.md`, `docs/cli-reference.md`                                                       | Coverage contract + CLI docs   |
| `packages/sdk/package.json`, `tsconfig.json`, `tsup.config.ts`                                        | SDK package                    |
| `packages/sdk/src/{index,client,http,errors,throttle,pagination}.ts`                                  | SDK core                       |
| `packages/sdk/src/types/{generated.ts,index.ts}`                                                      | Types                          |
| `packages/sdk/src/resources/*.ts` (~30 files)                                                         | One per tag                    |
| `packages/sdk/test/*.test.ts`                                                                         | Unit + fixture tests           |
| `packages/cli/package.json`, `tsconfig.json`, `tsup.config.ts`                                        | CLI package                    |
| `packages/cli/src/{cli,context,config,output,helpers}.ts`                                             | CLI core                       |
| `packages/cli/src/commands/*.ts` (~30 files)                                                          | One per tag                    |
| `packages/cli/test/*.test.ts`                                                                         | CLI tests                      |
| `.github/workflows/ci.yml`, `.github/workflows/spec-drift.yml`                                        | CI                             |

**Modified:** none (empty workspace).
**Removed:** none.

> Note: `PLAN.md` at the repo root is a working document. Either keep it (it is genuinely useful as
> a design record) or delete it at the end of Phase 4 — decide explicitly, do not leave it by accident.

---

## 5. Testing and verification

### 5.1 Reproducing "the issue"

There is no defect to reproduce. The equivalent verification is: **prove the API's real behaviour,
then prove the client matches it.** Reproduce the _baseline_ with these commands (all run during
this investigation, all still valid):

```sh
A="Accept: application/vnd.forem.api-v1+json"
curl -s "https://dev.to/api/articles?per_page=2" -H "$A"                      # 200, array
curl -s "https://dev.to/api/articles/me" -H "$A"                              # 401 {"error":"unauthorized","status":401}
curl -s "https://dev.to/api/articles/999999999" -H "$A"                       # 404 {"error":"not found","status":404}
curl -s -o /dev/null -w "%{http_code}\n" -X POST "https://dev.to/api/agent_sessions/presign" -H "$A"  # 401 (route exists)
curl -s "https://dev.to/api/listings?per_page=1" -H "$A"                      # 200, v0-only route still live
```

### 5.2 Unit tests (vitest + msw, no network)

- `http.test.ts` — query serialisation (drops `undefined`, arrays→CSV, `Date`→`YYYY-MM-DD`), header
  injection, `204` empty-body → `undefined`, non-JSON body handling, timeout abort.
- `errors.test.ts` — **both** error shapes: JSON `{"error":"not found","status":404}` →
  `NotFoundError`; **plain text `Retry later` + `Retry-After: 2`** → `RateLimitError` with
  `retryAfter === 2`. This is the regression test for the highest-risk parser.
- `throttle.test.ts` — with fake timers: 5 back-to-back GETs take ≥ ~1.7 s (3/s bucket);
  2 back-to-back writes take ≥ 1 s; `Retry-After` is honoured; `throttle: false` disables.
- `pagination.test.ts` — iterates until a short/empty page; asserts request count and that the
  throttle was applied; asserts it stops on `[]`.
- `resources/*.test.ts` — per resource, assert **method + path + query + body** against an msw
  handler. Table-driven: one row per operation, all 126 covered. This is the coverage proof.
- `types.test.ts` (compile-time) — assert a real live payload (fixture with all 32 article fields)
  is assignable to the exported `Article` type. Catches the spec-drift trap.

### 5.3 CLI tests

- `config.test.ts` — precedence flag > env > file; file written `0600`; key masked in
  `config list`; key redacted in `--verbose` output and in thrown error messages.
- `output.test.ts` — `--json` emits exact API shape; table renderer handles empty arrays.
- Command tests — invoke the CLI in-process (or via `execa`) against msw, assert exit codes
  (`0` ok, `1` API error, `2` usage error) and stdout.
- `dry-run.test.ts` — `articles create --file x.md --dry-run` prints method/URL/body and makes
  **zero** network calls.
- `confirm.test.ts` — destructive command without `--yes` and without a TTY does not execute.
- `frontmatter.test.ts` — golden files: front-matter → API body mapping, and id write-back is
  idempotent (running `push` twice produces one article).

### 5.4 Fixture corpus (recorded during this investigation, commit them)

Real payloads to use as fixtures: `GET /api/articles?per_page=2` (32-field article),
`GET /api/articles/4766339` (single article with `body_html`/`body_markdown`),
`GET /api/comments?a_id=4766339` (the 5-field comment that contradicts the spec),
`GET /api/tags`, `GET /api/instance`, `GET /api/subforems`, `GET /api/organizations`,
`GET /api/trends`, `GET /api/podcast_episodes`, and the four error shapes
(401/404/429-text/`{"error","status"}`).

### 5.5 Live smoke tests (opt-in, never in default CI)

Gate behind `DEVTO_LIVE_TEST=1` + `DEVTO_API_KEY`; `describe.skip` otherwise. Read-only assertions
only (`users.me()`, `articles.list({tag})`, `analytics.totals()`) — **never** publish or delete in
tests. This is also how the "no `Link` header" and throttle assumptions get re-confirmed over time.

### 5.6 Build / type / lint gates

`npm run typecheck` (`tsc --noEmit`), `npm run lint`, `npm run build`, then a **packaging test**:
`npm pack` the SDK into a temp dir and import it from a scratch CJS **and** ESM project — this
catches broken `exports` maps, which typecheck cannot.

### 5.7 Edge cases that must have explicit tests

- 204-no-body (`articles.unpublish`, `users.unpublish`, segment/badge deletes).
- 409 on `DELETE /api/segments/{id}` (segment attached to a billboard).
- 503 `S3 storage is not configured` on `agent_sessions.presign()`.
- `per_page: 1001` — the client should clamp or warn rather than silently accept.
- `/api/comments` `per_page` as a **string** (`"10"`/`"30"`) and the `page` integer/string ambiguity.
- `organizationIdOrUsername` accepting both a number and a string.
- `curated_data` being a JSON **string**, not an object.
- `analytics.pastDay()` path is `/api/analytics/past_day`.
- Response tolerance: an article payload with **unknown extra fields** must pass through untouched.

---

## 6. Cleanup

Nothing to remove — the workspace is empty. Cleanup obligations that apply _during_ the build:

- **Delete the temporary `/tmp/devto` scratch** (specs, `ops.txt`, `coverage.md`, `inv.mjs`,
  `deep.mjs`, `ops.mjs`, `schemas.mjs`, `cover.mjs`, `node_modules/` from `npm install js-yaml`).
  The two specs and `coverage.md` are **copied into the repo first**; nothing else is needed.
- Do **not** commit generated `dist/`, `node_modules/`, or `.tsbuildinfo`.
- Do **not** hand-edit `types/generated.ts` — if it needs changing, the _spec_ or the _curated
  overlay_ is what changes.
- Remove any `--dry-run`/debug scaffolding before release (a `console.log` of the resolved API key
  would be a leak; the redaction test must catch it).
- Resolve the `PLAN.md` question explicitly at the end of Phase 4 (keep as design record, or delete).

---

## 7. Risks

1. **Rate limits are the real risk.** 3 req/s and 30 req/min for reads; **1 req/s for writes**. Any
   bulk operation (re-publishing 50 articles, walking every page of a tag) will 429 without the
   throttle layer. Mitigation: throttle is Phase-1 work, not polish, and is unit-tested with fake
   timers. Residual: dev.to production limits may differ from upstream `main`; treat the numbers as
   configurable constants in one place.
2. **Spec drift.** This investigation already found 7 undocumented article fields and a `Comment`
   schema that is simply wrong. Mitigation: tolerant types + scheduled `spec:sync` CI job + the
   "unknown fields pass through" test. Do **not** add strict runtime response validation.
3. **Admin endpoints are untestable.** No admin key is available, so `/api/admin/*` (25 of the 126
   ops, ~20 %) can only be verified against msw mocks, not live. They may be wrong in shape.
   Mitigation: mark them `@experimental` in docs; keep them in the CLI but clearly labelled.
4. **Destructive CLI verbs.** `delete`, `suspend`, `spam`, `merge`, `unpublish-user` are real,
   irreversible actions on a real account. Mitigation: confirmation prompt + `--dry-run` + no
   `--yes` in any documented example. **The CLI must never default to `--yes`.**
5. **npm naming.** `devto` (bin name is fine locally) is taken by a deprecated package; `@devto/*`
   may be a taken/claimed scope. Pick and verify package names before Phase 4.
6. **`commander` major vs Node floor.** Recent commander majors raise the Node engine floor.
   Pin a commander major compatible with the chosen minimum Node (target Node ≥20), and record the
   decision — otherwise `npm i` fails on older CI images.
7. **Undocumented endpoints are undocumented.** `agent_sessions/presign` + `raw_url` were confirmed
   from source _and_ live (401, not 404), but their payload shapes come from the Rails controller,
   not the spec. Low blast radius (3 ops) but flag them.
8. **v0 dependency.** `/listings` (4 paths) exists only in the deprecated v0 API and could be removed
   by Forem at any time. Isolate it in its own resource file so its removal is a one-file change.

---

## 8. Decisions needed before implementation starts

These are the only genuinely open choices. Everything else in this plan is determined by the
evidence above.

1. **Package names / npm scope** for `packages/sdk` and `packages/cli` (and whether to publish at all
   vs keep private).
2. **Minimum Node version** — recommended **≥ 20** (native `fetch`, LTS); drives the commander major.
3. **Bundler** — tsup (battle-tested) vs tsdown (2026 successor). Recommended: **tsup**, revisit later.
4. **Whether to include the 25 `/admin/*` ops** in v1.0, or ship them behind an `admin` subcommand
   flagged experimental. Recommended: include, clearly marked.

---

## 9. Self-review of this diagnosis

- _Could I be fixing a symptom?_ No defect exists; the deliverable is a new tool. The plan targets
  the real constraint (rate limits + spec inaccuracy), not a cosmetic layer.
- _Did I inspect enough of the code path?_ There is no local code. The equivalent was done on the
  API: all 126 ops enumerated, all 39 schemas extracted, auth/pagination/error/rate-limit behaviour
  probed live, and the two undocumented endpoints confirmed from both source and a live 401.
- _Did I actually reproduce it?_ Yes — the runtime baseline in §5.1 was executed, and every
  claim in §1.2/§1.3 is an observed result, not an inference.
- _Is another component causing this?_ The rate limiter is the hidden component. It is invisible
  (no headers), which is exactly why a naive client fails silently at page 3.
- _Is there an existing implementation I missed?_ Checked: no official SDK exists; community clients
  are stale and article-only. Reusing them was considered and rejected — they cover the deprecated
  v0 spec and ~10 % of the surface.
- _Does the fix introduce a regression?_ Greenfield, so no. The one real risk introduced is
  destructive CLI verbs, which §7.4 mitigates.
- _Simpler solution?_ Considered and rejected: full codegen (broken by `undefined` params and
  missing `operationId`s), a single package (bloats library installs), a three-package split
  (speculative abstraction). The two-package, generated-types + hand-written-methods design is the
  smallest thing that satisfies "granular SDK + granular CLI".

**Explicitly uncertain (not verified):**

- dev.to _production_ rate-limit values (upstream `main` used as the source of truth; production
  may differ).
- Exact payload shapes of the `/api/admin/*` endpoints (no admin key available).
- Whether `@devto`-style npm names are available.
