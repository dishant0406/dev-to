import type { HttpClient } from "../http.js";
import type { Article, ArticleDetail, ArticlePayload } from "../types.js";

export interface ListArticlesParams {
  page?: number;
  perPage?: number;
  tag?: string;
  /** Comma-separated list of tags that must all be present. */
  tags?: string;
  /** Comma-separated list of tags to exclude. */
  tagsExclude?: string;
  username?: string;
  state?: "fresh" | "rising" | "all";
  /** Number of days back to look. Only used with `tag`. */
  top?: number;
  collectionId?: number;
}

export interface PaginationParams {
  page?: number;
  perPage?: number;
}

export interface SearchArticlesParams extends PaginationParams {
  q?: string;
  top?: number;
}

export class ArticlesResource {
  constructor(private readonly http: HttpClient) {}

  /** `GET /api/articles` — the main article feed. */
  list(params: ListArticlesParams = {}) {
    return this.http.get<Article[]>("/api/articles", {
      query: {
        page: params.page,
        per_page: params.perPage,
        tag: params.tag,
        tags: params.tags,
        tags_exclude: params.tagsExclude,
        username: params.username,
        state: params.state,
        top: params.top,
        collection_id: params.collectionId,
      },
    });
  }

  /** `GET /api/articles/search` — full-text search. */
  search(params: SearchArticlesParams = {}) {
    return this.http.get<Article[]>("/api/articles/search", {
      query: { q: params.q, top: params.top, page: params.page, per_page: params.perPage },
    });
  }

  /** `GET /api/articles/latest` — most recently published articles. */
  latest(params: PaginationParams = {}) {
    return this.http.get<Article[]>("/api/articles/latest", {
      query: { page: params.page, per_page: params.perPage },
    });
  }

  /** `GET /api/articles/{id}` */
  get(id: number) {
    return this.http.get<ArticleDetail>(`/api/articles/${id}`);
  }

  /** `GET /api/articles/{username}/{slug}` */
  getByPath(username: string, slug: string) {
    return this.http.get<ArticleDetail>(
      `/api/articles/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`,
    );
  }

  /** `POST /api/articles` — create an article. */
  create(article: ArticlePayload) {
    return this.http.post<ArticleDetail>("/api/articles", { body: { article } });
  }

  /** `PUT /api/articles/{id}` — update an article. */
  update(id: number, article: ArticlePayload) {
    return this.http.put<ArticleDetail>(`/api/articles/${id}`, { body: { article } });
  }

  /** `PUT /api/articles/{id}/unpublish` — returns 204, so there is no body. */
  unpublish(id: number, note?: string) {
    return this.http.put<void>(`/api/articles/${id}/unpublish`, { query: { note } });
  }

  /** `GET /api/articles/me` */
  mine(params: PaginationParams = {}) {
    return this.http.get<Article[]>("/api/articles/me", {
      query: { page: params.page, per_page: params.perPage },
    });
  }

  /** `GET /api/articles/me/published` */
  minePublished(params: PaginationParams = {}) {
    return this.http.get<Article[]>("/api/articles/me/published", {
      query: { page: params.page, per_page: params.perPage },
    });
  }

  /** `GET /api/articles/me/unpublished` */
  mineUnpublished(params: PaginationParams = {}) {
    return this.http.get<Article[]>("/api/articles/me/unpublished", {
      query: { page: params.page, per_page: params.perPage },
    });
  }

  /** `GET /api/articles/me/all` */
  mineAll(params: PaginationParams = {}) {
    return this.http.get<Article[]>("/api/articles/me/all", {
      query: { page: params.page, per_page: params.perPage },
    });
  }
}
