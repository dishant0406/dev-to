import type { HttpClient } from "../http.js";
import type {
  Article,
  Instance,
  PodcastEpisode,
  ProfileImage,
  Subforem,
  Tag,
  Trend,
  VideoArticle,
} from "../types.js";

export class TagsResource {
  constructor(private readonly http: HttpClient) {}

  /** `GET /api/tags` */
  list(params: { page?: number; perPage?: number } = {}) {
    return this.http.get<Tag[]>("/api/tags", {
      query: { page: params.page, per_page: params.perPage },
    });
  }
}

export class TrendsResource {
  constructor(private readonly http: HttpClient) {}

  /** `GET /api/trends` */
  list(params: { page?: number; perPage?: number } = {}) {
    return this.http.get<Trend[]>("/api/trends", {
      query: { page: params.page, per_page: params.perPage },
    });
  }

  /** `GET /api/trends/{id_or_slug}` */
  get(idOrSlug: number | string) {
    return this.http.get<Trend>(`/api/trends/${encodeURIComponent(String(idOrSlug))}`);
  }

  /** `GET /api/trends/{trend_id_or_slug}/articles` */
  articles(idOrSlug: number | string, params: { page?: number; perPage?: number } = {}) {
    return this.http.get<Article[]>(
      `/api/trends/${encodeURIComponent(String(idOrSlug))}/articles`,
      { query: { page: params.page, per_page: params.perPage } },
    );
  }
}

export class VideosResource {
  constructor(private readonly http: HttpClient) {}

  /** `GET /api/videos` */
  list(params: { page?: number; perPage?: number } = {}) {
    return this.http.get<VideoArticle[]>("/api/videos", {
      query: { page: params.page, per_page: params.perPage },
    });
  }
}

export class PodcastEpisodesResource {
  constructor(private readonly http: HttpClient) {}

  /** `GET /api/podcast_episodes` */
  list(params: { page?: number; perPage?: number; username?: string } = {}) {
    return this.http.get<PodcastEpisode[]>("/api/podcast_episodes", {
      query: { page: params.page, per_page: params.perPage, username: params.username },
    });
  }
}

export class ProfileImagesResource {
  constructor(private readonly http: HttpClient) {}

  /** `GET /api/profile_images/{username}` — works without an API key. */
  get(username: string) {
    return this.http.get<ProfileImage>(`/api/profile_images/${encodeURIComponent(username)}`);
  }
}

export class InstanceResource {
  constructor(private readonly http: HttpClient) {}

  /** `GET /api/instance` — metadata about the Forem instance. */
  get() {
    return this.http.get<Instance>("/api/instance");
  }
}

export class SubforemsResource {
  constructor(private readonly http: HttpClient) {}

  /** `GET /api/subforems` */
  list() {
    return this.http.get<Subforem[]>("/api/subforems");
  }
}

export type HealthCheckName = "app" | "database" | "cache";

/** Public health checks. They return the plain string `"ok"` when healthy. */
export class HealthChecksResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * `GET /api/health_checks/{app|database|cache}`
   *
   * The token goes in a `health-check-token` header, which is what the spec
   * declares, not in the query string.
   */
  check(name: HealthCheckName, healthCheckToken?: string) {
    return this.http.get<string>(`/api/health_checks/${name}`, {
      headers:
        healthCheckToken === undefined ? undefined : { "health-check-token": healthCheckToken },
    });
  }

  app(healthCheckToken?: string) {
    return this.check("app", healthCheckToken);
  }

  database(healthCheckToken?: string) {
    return this.check("database", healthCheckToken);
  }

  cache(healthCheckToken?: string) {
    return this.check("cache", healthCheckToken);
  }
}
