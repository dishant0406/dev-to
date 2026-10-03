# AGENTS.md

How this repository is written, and how you should write code in it.

Read this before changing anything. The rules here are not suggestions — the
whole point of this project is that a naive developer can open any file and
understand it in one pass.

---

## 1. What this project is

Two npm packages in one repo, both talking to the **Forem / dev.to API V1**
(https://developers.forem.com/api/v1):

| Package        | What it is                                                                      | Who uses it                |
| -------------- | ------------------------------------------------------------------------------- | -------------------------- |
| `packages/sdk` | `@dishant0406/dev-to` — a typed TypeScript client, one method per API operation | TypeScript/JavaScript apps |
| `packages/cli` | `devto` — a command line tool built **on top of the SDK**                       | Humans and shell scripts   |

The SDK is the product. The CLI is the first consumer of the SDK. If a CLI
command is awkward to write, the SDK design is wrong — fix the SDK.

---

## 2. The one rule that matters most

> **Write the boring version.**

Simple beats clever. Always.

- Prefer one plain function over a class hierarchy.
- Prefer a `for` loop over a pipeline of three helpers.
- Prefer a `switch` over a plugin registry.
- Prefer copying four lines over inventing an abstraction to avoid copying four lines.
- Prefer an explicit `if` over a boolean parameter with a clever default.

If you catch yourself writing something that would need a diagram to explain,
stop and write the dull version instead.

**Never add** — unless there is a concrete, current requirement for it:

- factories, managers, providers, registries, dependency-injection containers
- base classes that exist "so we can extend later"
- generic wrappers that just forward arguments
- event buses, caches, queues, state machines
- new dependencies
- new configuration layers
- new files (one file that does one job beats five files that each do a fifth)

### Before adding anything, ask three questions

1. **Does something already in this repo do this?** Look first. Reuse it.
2. **Will a new developer understand it on first read?** If not, rewrite it.
3. **Would deleting it lose anything real?** If not, delete it.

---

## 3. Repository layout

```
dev-cli/
├── AGENTS.md              <- you are here
├── README.md              <- what it is, how to install, quickstart
├── PLAN.md                <- the original design brief (history, not a spec)
├── package.json           <- npm workspaces root; all scripts live here
├── tsconfig.base.json     <- one TypeScript config, extended by both packages
├── docs/
│   ├── api-coverage.md    <- the checklist of every API operation
│   └── cli-reference.md   <- every CLI command, with examples
├── spec/
│   └── forem-api-v1.yaml  <- vendored copy of the official OpenAPI spec
├── scripts/
│   └── check-spec-drift.mjs  <- re-downloads the spec and fails on changes
├── packages/
│   ├── sdk/
│   │   ├── src/
│   │   │   ├── index.ts        <- the public API (this is the SDK's surface)
│   │   │   ├── client.ts       <- DevToClient: wires everything together
│   │   │   ├── http.ts         <- builds URLs, sends fetch, parses responses
│   │   │   ├── errors.ts       <- one error class per HTTP failure
│   │   │   ├── throttle.ts     <- client-side rate limiting (REQUIRED, see §6)
│   │   │   ├── pagination.ts   <- page through list endpoints safely
│   │   │   ├── types.ts        <- every API type, hand-written and small
│   │   │   └── resources/      <- one file per API resource group
│   │   └── test/               <- vitest tests, no network access
│   └── cli/
│       ├── src/
│       │   ├── cli.ts          <- entry point; builds the command tree
│       │   ├── context.ts      <- resolves API key/base URL, makes the client
│       │   ├── config.ts       <- reads/writes the config file
│       │   ├── output.ts       <- prints tables, JSON, errors; redacts keys
│       │   ├── helpers.ts      <- confirm(), dryRun(), collect(), parseIntArg()
│       │   └── commands/       <- one file per CLI resource group
│       └── test/
```

Nothing else belongs at the top level. Do not add a `packages/core`, a
`packages/types`, or a `packages/utils`. If a shared helper is genuinely needed
by both packages, it lives in the SDK and the CLI imports it.

---

## 4. How the SDK is written

### One method per API operation

`packages/sdk/src/resources/*.ts` — each file is a class with plain methods.
No method does anything clever; they build arguments and call `this.http`.

```ts
export class ArticlesResource {
  constructor(private http: HttpClient) {}

  list(params: ListArticlesParams = {}) {
    return this.http.get<Article[]>("/api/articles", { query: params });
  }

  get(id: number) {
    return this.http.get<Article>(`/api/articles/${id}`);
  }
}
```

Rules for resource methods:

- **One line of body, usually.** If a method needs more than ~5 lines, it is
  doing something the API layer should do instead.
- **Explicit types on parameters and returns.** The types _are_ the documentation.
- **No try/catch.** Errors are thrown by `http.ts` as typed errors. Let them
  propagate. Do not swallow, do not log, do not wrap.
- **No validation of responses.** The published spec is known to be incomplete
  (see §6). Never reject a response because it has unexpected fields.
- **Path parameters are positional, everything else is an options object.**
  `get(id)` not `get({ id })`. `list({ tag, perPage })`.
- **Names are camelCase.** API names like `past_day` become `pastDay`,
  `per_page` becomes `perPage`. No exceptions.
- **204 No Content returns `undefined`.** Methods that delete or unpublish are
  typed `Promise<void>`.

### The HTTP layer is the only place that talks to the Forem API

Every request to the API goes through `http.ts`. If you need a new behaviour
(a header, a retry, a timeout), add it there — not in a resource method.

**One documented exception:** `devto agent-sessions upload` PUTs the transcript
straight to a presigned S3 URL (`packages/cli/src/commands/agentSessions.ts`).
That is a different service with its own URL, so it cannot go through the client.
It is the only other `fetch()` in the repository.

### Adding a new endpoint

1. Add the method to the right file in `resources/`.
2. Add its types to `types.ts` if it has a new response shape.
3. Add a row to `docs/api-coverage.md` (or tick the existing row).
4. Add a test in `packages/sdk/test/`.
5. Add a CLI command in `packages/cli/src/commands/`.

The raw escape hatch (`devto api GET /api/anything` and `client.request(...)`)
must keep working for endpoints that are not wrapped yet. Never remove it.

---

## 5. How the CLI is written

- **One file per resource group** in `src/commands/`. Each exports a single
  `register<Group>Commands(program)` function.
- **Commands call the SDK.** A CLI command must never call `fetch` directly.
  That is how the SDK gets tested in real use.
- **Exit codes are meaningful:** `0` success, `1` API error, `2` usage error.
- **Human output is a table; `--json` output is exactly the API response.**
  Never restructure JSON output, and never mix progress messages into stdout.
- **Destructive commands confirm first.** Anything that deletes, suspends,
  merges, spams, or unpublishes must call `confirm()` unless `--yes` was passed.
  Never default to `--yes`. Never document an example that uses `--yes`.
- **The API key is a secret.** It is read from a flag, an environment variable,
  or the config file — and it is **redacted everywhere**: in `--verbose` output,
  in `--dry-run` output, and in error messages. `redact()` in `output.ts` is the
  single place that decides this.
- **`--dry-run` sends nothing.** It prints the method, URL, and body that would
  be sent, then exits `0`. This includes `devto api`, which can reach any endpoint.
- **`devto api` confirms writes.** Because the escape hatch can call anything, any
  method other than `GET` asks for confirmation unless `--yes` was passed.
- **`exitOverride()` is set in `buildProgram()`, before the command tree is built.**
  Subcommands copy the exit callback when they are created, so setting it later
  means commander calls `process.exit()` itself and the exit codes go wrong.

### Command shape

```
devto <resource> <action> [args] [options]
```

Always add `--help` text that a human can act on. Always document new commands
in `docs/cli-reference.md`.

---

## 6. Things that are true about this API, and will bite you

These were discovered by reading the Forem source and probing the live API.
They are the reason several design choices look the way they do.

1. **Rate limits are low and invisible.** The API allows **3 requests/second and
   30 requests/minute** for reads, and **1 request/second** for writes. It sends
   **no rate-limit headers at all**. When you exceed the limit you get `429` with
   a plain-text body `Retry later`. A naive client that pages through results
   gets throttled on the third page.
   → `throttle.ts` is not polish. It is required for correctness. Every request
   goes through it. Do not bypass it, do not "optimise" it away.

2. **Errors come in two shapes.** Usually JSON: `{"error": "...", "status": 401}`.
   But `429` is **plain text**. Any error parser must handle both.

3. **The published spec is incomplete.** Live article payloads contain fields the
   spec does not mention (`collection_id`, `language`, `subforem_id`,
   `ai_disclosure_level`, ...). The spec's `Comment` schema is simply wrong.
   → Types are a _baseline_, not a contract. Never strip or reject unknown fields.

4. **Some query parameters are strings, not numbers.** `/api/comments` takes
   `per_page` as `"10"` or `"30"`. Check the spec before assuming `number`.

5. **`per_page` is silently capped.** Asking for 1001 items returns 1000 with no
   error.

6. **There is no `Link` header.** Pagination must stop when a page returns fewer
   items than requested, or an empty array. Do not look for a `next` link.

7. **Some endpoints are undocumented** (`/api/agent_sessions/presign`,
   `/api/agent_sessions/{id}/raw_url`). They exist and work. They are implemented
   in `resources/agentSessions.ts` with a comment saying so.

8. **`/listings` only exists in the deprecated v0 API.** It lives alone in
   `resources/listings.ts` so that removing it later is a one-file change.

---

## 7. Testing rules

- Tests **never touch the network**. `http.ts` accepts an injectable `fetch`
  function; tests pass a fake. See `packages/sdk/test/fakeFetch.ts`.
- One test file per source file, named `<name>.test.ts`.
- Test **behaviour**, not implementation. Assert the URL, method, and body that
  were sent — that is the SDK's real contract.
- Every bug fix gets a test that fails before the fix.
- Run everything from the repository root: `npm test`, `npm run typecheck`,
  `npm run lint`, `npm run build`.

---

## 8. Definition of done

A change is done when **all** of these are true:

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] `npm run build` passes
- [ ] `docs/api-coverage.md` is accurate if API coverage changed
- [ ] `docs/cli-reference.md` is accurate if commands changed
- [ ] No commented-out code, no `TODO`, no debug `console.log`
- [ ] No unused exports, files, types, or dependencies
- [ ] The change is documented in the README if it is user-visible

### When you finish a piece of work, ask:

> "What did this make unnecessary?"

Then delete it. Dead code is not "safe to keep" — it is a lie about what the
project does. Git remembers.

---

## 9. Style

- TypeScript, `strict: true`. No `any`. Use `unknown` and narrow it.
- Double quotes, semicolons, 2-space indent, trailing commas, 100-column lines.
- `import type` for type-only imports.
- Names: `camelCase` for values, `PascalCase` for types/classes,
  `SCREAMING_SNAKE_CASE` for module-level constants.
- Comments explain **why**, never **what**. If the code needs a comment to
  explain what it does, rewrite the code.
- No barrel files except `src/index.ts`. Import from the actual file.
- Errors: throw typed errors from `errors.ts`. Never throw a bare string.
