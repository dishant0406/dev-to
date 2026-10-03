import type { HttpClient } from "../http.js";
import type {
  AgentSession,
  AgentSessionDetail,
  AgentSessionPayload,
  Article,
  Badge,
  BadgeAchievement,
  BadgeAchievementPayload,
  BadgePayload,
  Concept,
  ConceptPayload,
  Listing,
  PollTextResponse,
  PollVote,
  PresignedUpload,
  RecommendedArticlesList,
  RecommendedArticlesListPayload,
  RequestRedirect,
  RequestRedirectPayload,
  Survey,
  SurveyWithPolls,
} from "../types.js";

export class ConceptsResource {
  constructor(private readonly http: HttpClient) {}

  /** `GET /api/concepts` */
  list(params: { page?: number; perPage?: number; days?: number } = {}) {
    return this.http.get<Concept[]>("/api/concepts", {
      query: { page: params.page, per_page: params.perPage, days: params.days },
    });
  }

  /** `GET /api/concepts/{id}` */
  get(id: number, days?: number) {
    return this.http.get<Concept>(`/api/concepts/${id}`, { query: { days } });
  }

  /** `PATCH /api/concepts/{id}` */
  update(id: number, payload: ConceptPayload) {
    return this.http.patch<Concept>(`/api/concepts/${id}`, { body: { concept: payload } });
  }

  /** `GET /api/concepts/{id}/articles` */
  articles(id: number, params: { sort?: string; page?: number; perPage?: number } = {}) {
    return this.http.get<Article[]>(`/api/concepts/${id}/articles`, {
      query: { sort: params.sort, page: params.page, per_page: params.perPage },
    });
  }

  // --- Admin. These need an admin key. ---

  /** `GET /api/admin/concepts` */
  adminList(params: { page?: number; perPage?: number } = {}) {
    return this.http.get<Concept[]>("/api/admin/concepts", {
      query: { page: params.page, per_page: params.perPage },
    });
  }

  /** `GET /api/admin/concepts/{id}` */
  adminGet(id: number) {
    return this.http.get<Concept>(`/api/admin/concepts/${id}`);
  }

  /** `POST /api/admin/concepts` */
  adminCreate(payload: ConceptPayload) {
    return this.http.post<Concept>("/api/admin/concepts", { body: { concept: payload } });
  }

  /** `PATCH /api/admin/concepts/{id}` */
  adminUpdate(id: number, payload: ConceptPayload) {
    return this.http.patch<Concept>(`/api/admin/concepts/${id}`, { body: { concept: payload } });
  }

  /** `DELETE /api/admin/concepts/{id}` */
  adminDelete(id: number) {
    return this.http.delete<void>(`/api/admin/concepts/${id}`);
  }

  /** `POST /api/admin/concepts/{id}/trigger_lookback` — re-scans past articles. */
  adminTriggerLookback(id: number, days: number) {
    return this.http.post<Concept>(`/api/admin/concepts/${id}/trigger_lookback`, {
      body: { days },
    });
  }
}

export class BadgesResource {
  constructor(private readonly http: HttpClient) {}

  /** `GET /api/badges` */
  list(params: { page?: number } = {}) {
    return this.http.get<Badge[]>("/api/badges", { query: { page: params.page } });
  }

  /** `GET /api/badges/{id}` */
  get(id: number) {
    return this.http.get<Badge>(`/api/badges/${id}`);
  }

  /** `POST /api/badges` */
  create(payload: BadgePayload) {
    return this.http.post<Badge>("/api/badges", { body: { badge: payload } });
  }

  /** `PATCH /api/badges/{id}` */
  update(id: number, payload: BadgePayload) {
    return this.http.patch<Badge>(`/api/badges/${id}`, { body: { badge: payload } });
  }

  /** `DELETE /api/badges/{id}` — returns 204. */
  delete(id: number) {
    return this.http.delete<void>(`/api/badges/${id}`);
  }
}

export class BadgeAchievementsResource {
  constructor(private readonly http: HttpClient) {}

  /** `GET /api/badge_achievements` */
  list(params: { page?: number } = {}) {
    return this.http.get<BadgeAchievement[]>("/api/badge_achievements", {
      query: { page: params.page },
    });
  }

  /** `GET /api/badge_achievements/{id}` */
  get(id: number) {
    return this.http.get<BadgeAchievement>(`/api/badge_achievements/${id}`);
  }

  /** `POST /api/badge_achievements` — award a badge to a user. */
  create(payload: BadgeAchievementPayload) {
    return this.http.post<BadgeAchievement>("/api/badge_achievements", {
      body: { badge_achievement: payload },
    });
  }

  /** `DELETE /api/badge_achievements/{id}` — returns 204. */
  delete(id: number) {
    return this.http.delete<void>(`/api/badge_achievements/${id}`);
  }
}

export class RecommendedListsResource {
  constructor(private readonly http: HttpClient) {}

  /** `GET /api/recommended_articles_lists` */
  list(params: { page?: number; search?: string } = {}) {
    return this.http.get<RecommendedArticlesList[]>("/api/recommended_articles_lists", {
      query: { page: params.page, search: params.search },
    });
  }

  /** `GET /api/recommended_articles_lists/{id}` */
  get(id: number) {
    return this.http.get<RecommendedArticlesList>(`/api/recommended_articles_lists/${id}`);
  }

  /** `POST /api/recommended_articles_lists` */
  create(payload: RecommendedArticlesListPayload) {
    return this.http.post<RecommendedArticlesList>("/api/recommended_articles_lists", {
      body: payload,
    });
  }

  /** `PATCH /api/recommended_articles_lists/{id}` */
  update(id: number, payload: RecommendedArticlesListPayload) {
    return this.http.patch<RecommendedArticlesList>(`/api/recommended_articles_lists/${id}`, {
      body: payload,
    });
  }
}

export class SurveysResource {
  constructor(private readonly http: HttpClient) {}

  /** `GET /api/surveys` */
  list(params: { page?: number; perPage?: number; active?: boolean } = {}) {
    return this.http.get<Survey[]>("/api/surveys", {
      query: { page: params.page, per_page: params.perPage, active: params.active },
    });
  }

  /** `GET /api/surveys/{id_or_slug}` — includes the polls. */
  get(idOrSlug: number | string) {
    return this.http.get<SurveyWithPolls>(`/api/surveys/${encodeURIComponent(String(idOrSlug))}`);
  }

  /** `GET /api/surveys/{id_or_slug}/poll_votes` */
  pollVotes(idOrSlug: number | string, params: { perPage?: number; after?: number } = {}) {
    return this.http.get<PollVote[]>(
      `/api/surveys/${encodeURIComponent(String(idOrSlug))}/poll_votes`,
      { query: { per_page: params.perPage, after: params.after } },
    );
  }

  /** `GET /api/surveys/{id_or_slug}/poll_text_responses` */
  pollTextResponses(idOrSlug: number | string, params: { perPage?: number; after?: number } = {}) {
    return this.http.get<PollTextResponse[]>(
      `/api/surveys/${encodeURIComponent(String(idOrSlug))}/poll_text_responses`,
      { query: { per_page: params.perPage, after: params.after } },
    );
  }
}

export class RequestRedirectsResource {
  constructor(private readonly http: HttpClient) {}

  /** `GET /api/admin/request_redirects` */
  list(params: { page?: number; perPage?: number } = {}) {
    return this.http.get<RequestRedirect[]>("/api/admin/request_redirects", {
      query: { page: params.page, per_page: params.perPage },
    });
  }

  /** `GET /api/admin/request_redirects/{id}` */
  get(id: number) {
    return this.http.get<RequestRedirect>(`/api/admin/request_redirects/${id}`);
  }

  /** `POST /api/admin/request_redirects` */
  create(payload: RequestRedirectPayload) {
    return this.http.post<RequestRedirect>("/api/admin/request_redirects", {
      body: { request_redirect: payload },
    });
  }

  /** `PATCH /api/admin/request_redirects/{id}` */
  update(id: number, payload: RequestRedirectPayload) {
    return this.http.patch<RequestRedirect>(`/api/admin/request_redirects/${id}`, {
      body: { request_redirect: payload },
    });
  }

  /** `DELETE /api/admin/request_redirects/{id}` — returns 204. */
  delete(id: number) {
    return this.http.delete<void>(`/api/admin/request_redirects/${id}`);
  }
}

export class FeedbackMessagesResource {
  constructor(private readonly http: HttpClient) {}

  /** `PATCH /api/feedback_messages/{id}` — usually `status: "Resolved"`. */
  update(id: number, status: string) {
    return this.http.patch<Record<string, unknown>>(`/api/feedback_messages/${id}`, {
      body: { feedback_message: { status } },
    });
  }
}

export class AgentSessionsResource {
  constructor(private readonly http: HttpClient) {}

  /** `GET /api/agent_sessions` */
  list() {
    return this.http.get<AgentSession[]>("/api/agent_sessions");
  }

  /** `GET /api/agent_sessions/{id}` — includes the messages and slices. */
  get(id: number) {
    return this.http.get<AgentSessionDetail>(`/api/agent_sessions/${id}`);
  }

  /**
   * `POST /api/agent_sessions`
   * Remember: `curated_data` is a JSON *string*, not an object.
   */
  create(payload: AgentSessionPayload) {
    return this.http.post<AgentSession>("/api/agent_sessions", { body: payload });
  }

  /**
   * `POST /api/agent_sessions/presign` — not in the published spec, but it is a
   * real route. Returns 503 when the instance has no S3 bucket configured.
   */
  presign() {
    return this.http.post<PresignedUpload>("/api/agent_sessions/presign");
  }

  /**
   * `GET /api/agent_sessions/{id}/raw_url` — also undocumented. Returns the URL
   * of the raw transcript that was uploaded to S3.
   */
  rawUrl(id: number) {
    return this.http.get<{ raw_url: string }>(`/api/agent_sessions/${id}/raw_url`);
  }
}

/**
 * The `/listings` routes only exist in the deprecated v0 API. They still respond
 * today, but they can be removed by Forem at any time. Everything listing-related
 * lives in this one class so that removing it is a single change.
 */
export class ListingsResource {
  constructor(private readonly http: HttpClient) {}

  /** `GET /listings` */
  list(params: { page?: number; perPage?: number; category?: string } = {}) {
    return this.http.get<Listing[]>("/api/listings", {
      query: { page: params.page, per_page: params.perPage, category: params.category },
    });
  }

  /** `GET /listings/category/{category}` */
  byCategory(category: string) {
    return this.http.get<Listing[]>(`/api/listings/category/${encodeURIComponent(category)}`);
  }

  /** `GET /listings/{id}` */
  get(id: number) {
    return this.http.get<Listing>(`/api/listings/${id}`);
  }

  /** `GET /organizations/{username}/listings` */
  byOrganization(username: string) {
    return this.http.get<Listing[]>(`/api/organizations/${encodeURIComponent(username)}/listings`);
  }
}
