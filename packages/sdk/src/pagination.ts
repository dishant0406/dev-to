/**
 * Pagination.
 *
 * The API sends no `Link` header, so the only way to know a page is the last one
 * is that it came back short (or empty). That is exactly what these helpers do.
 */

/** The parameters a paged list method understands. */
export interface PageParams {
  page: number;
  perPage?: number;
}

/** Any list method, adapted to the shape `paginate` needs. */
export type PageFetcher<T> = (params: PageParams) => Promise<T[]>;

export const DEFAULT_PER_PAGE = 30;

/**
 * Walk every page of a list endpoint.
 *
 * ```ts
 * for await (const article of devto.paginate((p) => devto.articles.list({ tag: "rust", ...p }))) {
 *   console.log(article.title);
 * }
 * ```
 */
export async function* paginate<T>(
  fetchPage: PageFetcher<T>,
  perPage: number = DEFAULT_PER_PAGE,
): AsyncGenerator<T, void, undefined> {
  let page = 1;

  for (;;) {
    const items = await fetchPage({ page, perPage });
    for (const item of items) yield item;
    if (items.length < perPage) return;
    page += 1;
  }
}

/** Like `paginate`, but collects everything into one array. */
export async function pageAll<T>(
  fetchPage: PageFetcher<T>,
  perPage: number = DEFAULT_PER_PAGE,
): Promise<T[]> {
  const all: T[] = [];
  for await (const item of paginate(fetchPage, perPage)) all.push(item);
  return all;
}
