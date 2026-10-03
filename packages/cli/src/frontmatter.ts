/**
 * Markdown articles with YAML front matter.
 *
 * A post looks like this:
 *
 * ```md
 * ---
 * title: My post
 * tags: javascript, typescript
 * published: false
 * ---
 *
 * Body goes here.
 * ```
 *
 * `devto articles push --file post.md` reads this, sends it to the API, and writes
 * the article `id` back into the front matter so the next run updates instead of
 * creating a duplicate.
 */

import { readFile, writeFile } from "node:fs/promises";
import matter from "gray-matter";
import type { ArticlePayload } from "@dishant0406/dev-to";

export interface ArticleFile {
  /** The article id from the front matter, if it has one. */
  id: number | undefined;
  payload: ArticlePayload;
}

/** Read a markdown file and turn its front matter into an API payload. */
export async function readArticleFile(path: string): Promise<ArticleFile> {
  const text = await readFile(path, "utf8");
  return parseArticleFile(text);
}

export function parseArticleFile(text: string): ArticleFile {
  const parsed = matter(text);
  const data = parsed.data as Record<string, unknown>;

  const payload: ArticlePayload = {
    title: stringOrUndefined(data["title"]),
    body_markdown: parsed.content.trim(),
    published: booleanOrUndefined(data["published"]),
    series: stringOrUndefined(data["series"]),
    description: stringOrUndefined(data["description"]),
    canonical_url: stringOrUndefined(data["canonical_url"]),
    // Both names are accepted; `cover_image` is what dev.to calls it in its own UI.
    main_image: stringOrUndefined(data["main_image"] ?? data["cover_image"]),
    tags: tagsToString(data["tags"]),
    organization_id: numberOrUndefined(data["organization_id"]),
  };

  return { id: numberOrUndefined(data["id"]), payload };
}

/** Put an article id into the front matter of a markdown file, replacing any existing one. */
export async function writeArticleId(path: string, id: number): Promise<void> {
  const text = await readFile(path, "utf8");
  await writeFile(path, addArticleId(text, id), "utf8");
}

export function addArticleId(text: string, id: number): string {
  const parsed = matter(text);
  // `id` goes last so it wins over any id already in the front matter.
  const data = { ...(parsed.data as Record<string, unknown>), id };
  return matter.stringify(parsed.content, data);
}

function tagsToString(value: unknown): string | undefined {
  if (Array.isArray(value)) return value.map(String).join(", ");
  return stringOrUndefined(value);
}

function stringOrUndefined(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return undefined;
}

function numberOrUndefined(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function booleanOrUndefined(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}
