/**
 * End-to-end tests that run the real CLI command tree against a fake HTTP server
 * on localhost. Nothing here touches dev.to.
 */

import { createServer, type Server } from "node:http";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

const cliPath = fileURLToPath(new URL("../dist/cli.js", import.meta.url));

interface RecordedRequest {
  method: string;
  url: string;
  apiKey: string | undefined;
  body: string;
}

let server: Server;
let baseUrl: string;
let requests: RecordedRequest[] = [];
let respond: (request: RecordedRequest) => { status: number; body: string };
let configDir: string;

beforeAll(async () => {
  server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      const recorded: RecordedRequest = {
        method: request.method ?? "GET",
        url: request.url ?? "/",
        apiKey: request.headers["api-key"] as string | undefined,
        body: Buffer.concat(chunks).toString("utf8"),
      };
      requests.push(recorded);

      const result = respond(recorded);
      response.writeHead(result.status, { "content-type": "application/json" });
      response.end(result.body);
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("Server did not start");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
  requests = [];
  respond = () => ({ status: 200, body: "[]" });
  configDir = mkdtempSync(join(tmpdir(), "devto-cli-"));
});

afterEach(() => {
  rmSync(configDir, { recursive: true, force: true });
});

interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

function run(args: string[], env: Record<string, string> = {}): Promise<RunResult> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [cliPath, ...args], {
      env: {
        ...process.env,
        DEVTO_CONFIG_DIR: configDir,
        DEVTO_BASE_URL: baseUrl,
        NO_COLOR: "1",
        ...env,
      },
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("close", (code) => resolve({ code: code ?? 0, stdout, stderr }));
  });
}

describe("devto api", () => {
  it("sends a raw GET with query parameters", async () => {
    respond = () => ({ status: 200, body: '{"ok":true}' });
    const result = await run([
      "api",
      "GET",
      "/api/articles",
      "--query",
      "tag=rust",
      "--query",
      "per_page=5",
    ]);

    expect(result.code).toBe(0);
    expect(requests[0]!.method).toBe("GET");
    expect(requests[0]!.url).toBe("/api/articles?tag=rust&per_page=5");
    expect(JSON.parse(result.stdout)).toEqual({ ok: true });
  });

  it("sends a raw POST with a JSON body", async () => {
    respond = () => ({ status: 200, body: "{}" });
    const result = await run([
      "--yes",
      "api",
      "POST",
      "/api/follows",
      "--data",
      '{"user_ids":[1,2]}',
    ]);

    expect(result.code).toBe(0);
    expect(requests[0]!.method).toBe("POST");
    expect(requests[0]!.body).toBe('{"user_ids":[1,2]}');
  });

  it("rejects a malformed --query", async () => {
    const result = await run(["api", "GET", "/api/articles", "--query", "nope"]);
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("key=value");
  });

  it("rejects a malformed --data", async () => {
    const result = await run(["api", "POST", "/api/follows", "--data", "not-json"]);
    expect(result.code).toBe(2);
    expect(requests).toHaveLength(0);
  });

  it("--dry-run sends nothing, even for a write", async () => {
    const result = await run(["--dry-run", "api", "DELETE", "/api/articles/1"]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("[dry-run] DELETE /api/articles/1");
    expect(requests).toHaveLength(0);
  });

  it("asks for confirmation before a write, and refuses without a terminal", async () => {
    const result = await run(["api", "DELETE", "/api/articles/1"]);

    expect(result.code).toBe(2);
    expect(result.stderr).toContain("--yes");
    expect(requests).toHaveLength(0);
  });

  it("runs a write with --yes", async () => {
    respond = () => ({ status: 200, body: "{}" });
    const result = await run(["--yes", "api", "DELETE", "/api/articles/1"]);

    expect(result.code).toBe(0);
    expect(requests[0]!.method).toBe("DELETE");
  });

  it("does not ask before a GET", async () => {
    respond = () => ({ status: 200, body: "[]" });
    const result = await run(["api", "GET", "/api/articles"]);

    expect(result.code).toBe(0);
    expect(requests).toHaveLength(1);
  });
});

describe("input validation", () => {
  it("rejects a comments --per-page that is not 10 or 30", async () => {
    const result = await run(["comments", "list", "--article", "1", "--per-page", "99"]);

    expect(result.code).toBe(2);
    expect(result.stderr).toContain("10");
    expect(requests).toHaveLength(0);
  });

  it("accepts the two values the API allows", async () => {
    respond = () => ({ status: 200, body: "[]" });
    const result = await run(["comments", "list", "--article", "1", "--per-page", "30"]);

    expect(result.code).toBe(0);
    expect(requests[0]!.url).toBe("/api/comments?a_id=1&per_page=30");
  });

  it("requires --email for users admin create", async () => {
    const result = await run(["users", "admin", "create"]);

    expect(result.code).toBe(2);
    expect(result.stderr).toContain("--email");
    expect(requests).toHaveLength(0);
  });

  it("does not send page=1 when --page is omitted", async () => {
    respond = () => ({ status: 200, body: "[]" });
    await run(["articles", "mine"]);

    expect(requests[0]!.url).toBe("/api/articles/me");
  });
});

describe("redaction", () => {
  it("masks the API key in --dry-run output", async () => {
    const result = await run(
      ["--dry-run", "api", "GET", "/api/articles", "--query", "note=secret-key-1234"],
      { DEVTO_API_KEY: "secret-key-1234" },
    );

    expect(result.code).toBe(0);
    expect(result.stdout).not.toContain("secret-key-1234");
    expect(result.stdout).toContain("****1234");
  });

  it("masks the API key in a table cell", async () => {
    respond = () => ({ status: 200, body: '[{"id":1,"note":"secret-key-1234"}]' });
    const result = await run(["articles", "list"], { DEVTO_API_KEY: "secret-key-1234" });

    expect(result.stdout).not.toContain("secret-key-1234");
  });

  it("masks the API key in --json output", async () => {
    respond = () => ({ status: 200, body: '[{"id":1,"note":"secret-key-1234"}]' });
    const result = await run(["--json", "articles", "list"], { DEVTO_API_KEY: "secret-key-1234" });

    expect(result.stdout).not.toContain("secret-key-1234");
  });
});

describe("auth and config", () => {
  it("saves a key with auth login and sends it on later requests", async () => {
    const login = await run(["auth", "login", "--key", "secret-key-1234"]);
    expect(login.code).toBe(0);
    expect(login.stderr).toContain("****1234");
    expect(login.stdout).not.toContain("secret-key-1234");

    const stored = readFileSync(join(configDir, "config.json"), "utf8");
    expect(stored).toContain("secret-key-1234");

    await run(["instance"]);
    expect(requests[0]!.apiKey).toBe("secret-key-1234");
  });

  it("masks the key in config list", async () => {
    await run(["auth", "login", "--key", "secret-key-1234"]);
    const result = await run(["config", "list"]);

    expect(result.stdout).toContain("****1234");
    expect(result.stdout).not.toContain("secret-key-1234");
  });

  it("never prints the key when --verbose is on", async () => {
    const result = await run(["--verbose", "instance"], { DEVTO_API_KEY: "verbose-secret-9999" });

    expect(result.stdout).not.toContain("verbose-secret-9999");
    expect(result.stderr).not.toContain("verbose-secret-9999");
  });

  it("prefers the flag over the environment", async () => {
    await run(["--api-key", "flag-key", "instance"], { DEVTO_API_KEY: "env-key" });
    expect(requests[0]!.apiKey).toBe("flag-key");
  });

  it("removes the key with auth logout", async () => {
    await run(["auth", "login", "--key", "secret-key-1234"]);
    const logout = await run(["auth", "logout"]);
    expect(logout.code).toBe(0);

    await run(["instance"]);
    expect(requests[0]!.apiKey).toBeUndefined();
  });
});

describe("articles", () => {
  it("prints a table by default and raw JSON with --json", async () => {
    respond = () => ({ status: 200, body: '[{"id":1,"title":"Hello","url":"https://dev.to/x"}]' });

    const table = await run(["articles", "list"]);
    expect(table.stdout).toContain("Hello");

    const json = await run(["articles", "list", "--json"]);
    expect(JSON.parse(json.stdout)).toEqual([{ id: 1, title: "Hello", url: "https://dev.to/x" }]);
  });

  it("creates an article from a markdown file", async () => {
    const file = join(configDir, "post.md");
    writeFileSync(file, "---\ntitle: From a file\ntags: rust\npublished: false\n---\nBody text");
    respond = () => ({
      status: 201,
      body: '{"id":42,"url":"https://dev.to/x","title":"From a file"}',
    });

    const result = await run(["articles", "create", "--file", file]);

    expect(result.code).toBe(0);
    expect(requests[0]!.method).toBe("POST");
    expect(requests[0]!.url).toBe("/api/articles");
    expect(JSON.parse(requests[0]!.body)).toEqual({
      article: { title: "From a file", tags: "rust", published: false, body_markdown: "Body text" },
    });
  });

  it("push writes the new id back into the file", async () => {
    const file = join(configDir, "post.md");
    writeFileSync(file, "---\ntitle: Draft\n---\nBody");
    respond = () => ({ status: 201, body: '{"id":55,"url":"https://dev.to/y","title":"Draft"}' });

    const result = await run(["articles", "push", "--file", file]);
    expect(result.code).toBe(0);
    expect(readFileSync(file, "utf8")).toContain("id: 55");
  });

  it("push updates instead of creating once the file has an id", async () => {
    const file = join(configDir, "post.md");
    writeFileSync(file, "---\nid: 55\ntitle: Draft\n---\nBody");
    respond = () => ({ status: 200, body: '{"id":55,"url":"https://dev.to/y","title":"Draft"}' });

    await run(["articles", "push", "--file", file]);

    expect(requests[0]!.method).toBe("PUT");
    expect(requests[0]!.url).toBe("/api/articles/55");
  });

  it("--dry-run sends nothing", async () => {
    const file = join(configDir, "post.md");
    writeFileSync(file, "---\ntitle: Draft\n---\nBody");

    const result = await run(["--dry-run", "articles", "create", "--file", file]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("dry-run");
    expect(result.stdout).toContain("Draft");
    expect(requests).toHaveLength(0);
  });

  it("--all walks every page", async () => {
    let page = 0;
    respond = () => {
      page += 1;
      return page === 1
        ? { status: 200, body: '[{"id":1},{"id":2}]' }
        : { status: 200, body: '[{"id":3}]' };
    };

    const result = await run(["articles", "list", "--per-page", "2", "--all", "--json"]);
    expect(JSON.parse(result.stdout)).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    expect(requests).toHaveLength(2);
  });
});

describe("safety", () => {
  it("refuses a destructive command without --yes when stdin is not a terminal", async () => {
    const result = await run(["articles", "unpublish", "1"]);

    expect(result.code).toBe(2);
    expect(result.stderr).toContain("--yes");
    expect(requests).toHaveLength(0);
  });

  it("runs a destructive command with --yes", async () => {
    respond = () => ({ status: 204, body: "" });
    const result = await run(["--yes", "articles", "unpublish", "1"]);

    expect(result.code).toBe(0);
    expect(requests[0]!.method).toBe("PUT");
    expect(requests[0]!.url).toBe("/api/articles/1/unpublish");
  });

  it("--dry-run on a destructive command sends nothing and needs no --yes", async () => {
    const result = await run(["--dry-run", "users", "suspend", "9"]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("suspend user 9");
    expect(requests).toHaveLength(0);
  });
});

describe("errors and exit codes", () => {
  it("exits 1 on an API error", async () => {
    respond = () => ({ status: 404, body: '{"error":"not found","status":404}' });
    const result = await run(["articles", "get", "1"]);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("Not found");
  });

  it("reports 401 clearly", async () => {
    respond = () => ({ status: 401, body: '{"error":"unauthorized","status":401}' });
    const result = await run(["users", "me"]);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("Authentication failed");
  });

  it("exits 2 on a usage error", async () => {
    const result = await run(["articles", "get", "not-a-number"]);
    expect(result.code).toBe(2);
    expect(requests).toHaveLength(0);
  });

  it("exits 2 when commander rejects the input, not 1", async () => {
    // Commander must not call process.exit() itself; the CLI decides the code.
    expect((await run(["articles", "list", "--nope"])).code).toBe(2);
    expect((await run(["users", "admin", "create"])).code).toBe(2);
    expect((await run(["nope"])).code).toBe(2);
    expect(requests).toHaveLength(0);
  });

  it("exits 0 for --help", async () => {
    expect((await run(["--help"])).code).toBe(0);
  });

  it("emits a JSON error object with --json", async () => {
    respond = () => ({ status: 404, body: '{"error":"not found","status":404}' });
    const result = await run(["--json", "articles", "get", "1"]);

    expect(JSON.parse(result.stderr)).toMatchObject({ status: 404, path: "/api/articles/1" });
  });
});

describe("quiet", () => {
  it("prints nothing on success", async () => {
    respond = () => ({ status: 200, body: '[{"id":1}]' });
    const result = await run(["--quiet", "articles", "list"]);

    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
  });
});
