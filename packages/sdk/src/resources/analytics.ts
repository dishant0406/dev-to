import type { HttpClient } from "../http.js";
import type {
  AnalyticsDashboard,
  AnalyticsFollowerEngagement,
  AnalyticsHeatmap,
  AnalyticsHistorical,
  AnalyticsPastDay,
  AnalyticsReferrer,
  AnalyticsTopContributor,
  AnalyticsTotals,
} from "../types.js";

export interface AnalyticsParams {
  start?: string;
  end?: string;
  articleId?: number;
  organizationId?: number;
}

function toQuery(params: AnalyticsParams) {
  return {
    start: params.start,
    end: params.end,
    article_id: params.articleId,
    organization_id: params.organizationId,
  };
}

/** All of these require an API key and only report on your own content. */
export class AnalyticsResource {
  constructor(private readonly http: HttpClient) {}

  /** `GET /api/analytics/totals` — lifetime totals. */
  totals(params: AnalyticsParams = {}) {
    return this.http.get<AnalyticsTotals>("/api/analytics/totals", { query: toQuery(params) });
  }

  /** `GET /api/analytics/historical` — daily counts. `start` is required. */
  historical(params: AnalyticsParams) {
    return this.http.get<AnalyticsHistorical>("/api/analytics/historical", {
      query: toQuery(params),
    });
  }

  /** `GET /api/analytics/past_day` — the last 24 hours. */
  pastDay(params: AnalyticsParams = {}) {
    return this.http.get<AnalyticsPastDay>("/api/analytics/past_day", { query: toQuery(params) });
  }

  /** `GET /api/analytics/referrers` — where readers came from. */
  referrers(params: AnalyticsParams = {}) {
    return this.http.get<AnalyticsReferrer[]>("/api/analytics/referrers", {
      query: toQuery(params),
    });
  }

  /** `GET /api/analytics/top_contributors` */
  topContributors(params: AnalyticsParams = {}) {
    return this.http.get<AnalyticsTopContributor[]>("/api/analytics/top_contributors", {
      query: toQuery(params),
    });
  }

  /** `GET /api/analytics/follower_engagement` */
  followerEngagement(params: AnalyticsParams = {}) {
    return this.http.get<AnalyticsFollowerEngagement>("/api/analytics/follower_engagement", {
      query: toQuery(params),
    });
  }

  /** `GET /api/analytics/dashboard` */
  dashboard(params: AnalyticsParams = {}) {
    return this.http.get<AnalyticsDashboard>("/api/analytics/dashboard", {
      query: toQuery(params),
    });
  }

  /** `GET /api/analytics/heatmap` */
  heatmap(params: AnalyticsParams = {}) {
    return this.http.get<AnalyticsHeatmap>("/api/analytics/heatmap", { query: toQuery(params) });
  }
}
