import type { HttpClient } from "../http.js";
import type {
  Article,
  Comment,
  FollowedTag,
  ReactionCategory,
  ReactionResult,
  ReactableType,
  SharedUser,
} from "../types.js";

export interface ListCommentsParams {
  /** Article id. Required in practice: without it the API ignores `perPage`. */
  aId?: number;
  /** Parent comment id — returns the replies to that comment. */
  pId?: number;
  page?: number;
  /** A string, not a number. The API only accepts "10" or "30". */
  perPage?: "10" | "30";
}

export interface ReactionParams {
  category: ReactionCategory;
  reactableId: number;
  reactableType: ReactableType;
}

export interface FollowParams {
  userIds?: number[];
  organizationIds?: number[];
}

export class CommentsResource {
  constructor(private readonly http: HttpClient) {}

  /** `GET /api/comments` — comments on an article, or replies to a comment. */
  list(params: ListCommentsParams = {}) {
    return this.http.get<Comment[]>("/api/comments", {
      query: {
        a_id: params.aId,
        p_id: params.pId,
        page: params.page,
        per_page: params.perPage,
      },
    });
  }

  /** `GET /api/comments/{id}` — a single comment by its `id_code`. */
  get(idCode: string) {
    return this.http.get<Comment>(`/api/comments/${encodeURIComponent(idCode)}`);
  }
}

export class ReactionsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * `POST /api/reactions/toggle` — add the reaction if absent, remove it if present.
   * The parameters go in the query string, not the body.
   */
  toggle(params: ReactionParams) {
    return this.http.post<ReactionResult>("/api/reactions/toggle", { query: toQuery(params) });
  }

  /** `POST /api/reactions` — create a reaction. Fails if it already exists. */
  create(params: ReactionParams) {
    return this.http.post<ReactionResult>("/api/reactions", { query: toQuery(params) });
  }
}

function toQuery(params: ReactionParams) {
  return {
    category: params.category,
    reactable_id: params.reactableId,
    reactable_type: params.reactableType,
  };
}

export class ReadingListResource {
  constructor(private readonly http: HttpClient) {}

  /** `GET /api/readinglist` — the signed-in user's reading list. */
  list(params: { page?: number; perPage?: number } = {}) {
    return this.http.get<Article[]>("/api/readinglist", {
      query: { page: params.page, per_page: params.perPage },
    });
  }
}

export class FollowsResource {
  constructor(private readonly http: HttpClient) {}

  /** `POST /api/follows` — follow users and/or organizations. */
  create(params: FollowParams) {
    return this.http.post<SharedUser[]>("/api/follows", {
      body: { user_ids: params.userIds, organization_ids: params.organizationIds },
    });
  }

  /** `GET /api/follows/tags` — tags the signed-in user follows. */
  tags() {
    return this.http.get<FollowedTag[]>("/api/follows/tags");
  }
}

export class FollowersResource {
  constructor(private readonly http: HttpClient) {}

  /** `GET /api/followers/users` — users who follow the signed-in user. */
  list(params: { page?: number; perPage?: number; sort?: string } = {}) {
    return this.http.get<SharedUser[]>("/api/followers/users", {
      query: { page: params.page, per_page: params.perPage, sort: params.sort },
    });
  }
}
