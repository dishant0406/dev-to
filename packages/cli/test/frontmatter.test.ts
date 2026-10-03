import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  addArticleId,
  parseArticleFile,
  readArticleFile,
  writeArticleId,
} from "../src/frontmatter.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "devto-frontmatter-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const post = `---
title: My post
tags:
  - javascript
  - typescript
published: false
description: A short summary
canonical_url: https://example.com/post
cover_image: https://example.com/cover.png
organization_id: 42
series: Building things
---

Hello **world**.
`;

describe("parseArticleFile", () => {
  it("maps front matter to the API payload", () => {
    const { payload, id } = parseArticleFile(post);

    expect(id).toBeUndefined();
    expect(payload).toEqual({
      title: "My post",
      body_markdown: "Hello **world**.",
      published: false,
      description: "A short summary",
      canonical_url: "https://example.com/post",
      main_image: "https://example.com/cover.png",
      organization_id: 42,
      series: "Building things",
      tags: "javascript, typescript",
    });
  });

  it("reads a comma-separated tag string too", () => {
    const { payload } = parseArticleFile("---\ntags: rust, wasm\n---\nBody");
    expect(payload.tags).toBe("rust, wasm");
  });

  it("accepts main_image as an alias for cover_image", () => {
    const { payload } = parseArticleFile("---\nmain_image: https://example.com/a.png\n---\nBody");
    expect(payload.main_image).toBe("https://example.com/a.png");
  });

  it("prefers main_image when both are present", () => {
    const { payload } = parseArticleFile(
      "---\nmain_image: https://example.com/a.png\ncover_image: https://example.com/b.png\n---\nBody",
    );
    expect(payload.main_image).toBe("https://example.com/a.png");
  });

  it("reads the article id when there is one", () => {
    const { id } = parseArticleFile("---\nid: 12345\ntitle: t\n---\nBody");
    expect(id).toBe(12345);
  });

  it("leaves out fields that are not present", () => {
    const { payload } = parseArticleFile("---\ntitle: Only a title\n---\nBody");
    expect(payload).toEqual({ title: "Only a title", body_markdown: "Body" });
  });

  it("works without any front matter", () => {
    const { payload, id } = parseArticleFile("Just a body");
    expect(id).toBeUndefined();
    expect(payload.body_markdown).toBe("Just a body");
    expect(payload.title).toBeUndefined();
  });

  it("trims surrounding whitespace from the body", () => {
    const { payload } = parseArticleFile("---\ntitle: t\n---\n\n\nBody\n\n\n");
    expect(payload.body_markdown).toBe("Body");
  });
});

describe("addArticleId", () => {
  it("adds the id to the front matter", () => {
    const updated = addArticleId(post, 999);
    expect(updated).toContain("id: 999");
    expect(parseArticleFile(updated).id).toBe(999);
  });

  it("keeps the body unchanged", () => {
    const updated = addArticleId(post, 999);
    expect(updated).toContain("Hello **world**.");
  });

  it("replaces an existing id rather than adding a second one", () => {
    const once = addArticleId(post, 111);
    const twice = addArticleId(once, 222);
    expect(twice.match(/^id:/gm)).toHaveLength(1);
    expect(parseArticleFile(twice).id).toBe(222);
  });

  it("keeps the other front-matter fields", () => {
    const { payload } = parseArticleFile(addArticleId(post, 1));
    expect(payload.title).toBe("My post");
    expect(payload.tags).toBe("javascript, typescript");
  });
});

describe("file helpers", () => {
  it("reads a file from disk", async () => {
    const path = join(dir, "post.md");
    writeFileSync(path, post);

    const { payload } = await readArticleFile(path);
    expect(payload.title).toBe("My post");
  });

  it("writes the id back to disk and is idempotent", async () => {
    const path = join(dir, "post.md");
    writeFileSync(path, post);

    await writeArticleId(path, 777);
    await writeArticleId(path, 777);

    const text = readFileSync(path, "utf8");
    expect(text.match(/^id:/gm)).toHaveLength(1);
    expect(parseArticleFile(text).id).toBe(777);
  });
});
