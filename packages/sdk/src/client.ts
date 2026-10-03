import { HttpClient, type HttpOptions, type RequestOptions } from "./http.js";
import { pageAll, paginate, type PageFetcher } from "./pagination.js";
import {
  AgentSessionsResource,
  BadgeAchievementsResource,
  BadgesResource,
  ConceptsResource,
  FeedbackMessagesResource,
  ListingsResource,
  RecommendedListsResource,
  RequestRedirectsResource,
  SurveysResource,
} from "./resources/platform.js";
import { AnalyticsResource } from "./resources/analytics.js";
import { ArticlesResource } from "./resources/articles.js";
import {
  BillboardsResource,
  OrganizationsResource,
  PagesResource,
  SegmentsResource,
} from "./resources/content.js";
import {
  HealthChecksResource,
  InstanceResource,
  PodcastEpisodesResource,
  ProfileImagesResource,
  SubforemsResource,
  TagsResource,
  TrendsResource,
  VideosResource,
} from "./resources/discovery.js";
import {
  CommentsResource,
  FollowersResource,
  FollowsResource,
  ReactionsResource,
  ReadingListResource,
} from "./resources/interactions.js";
import { UsersResource } from "./resources/users.js";

/**
 * The dev.to / Forem API client. Its options are the HTTP options: base URL,
 * API key, timeout, throttle settings and an injectable `fetch`.
 *
 * ```ts
 * const devto = new DevToClient({ apiKey: process.env.DEVTO_API_KEY });
 * const articles = await devto.articles.list({ tag: "javascript" });
 * ```
 */
export class DevToClient {
  readonly articles: ArticlesResource;
  readonly users: UsersResource;
  readonly comments: CommentsResource;
  readonly reactions: ReactionsResource;
  readonly readingList: ReadingListResource;
  readonly follows: FollowsResource;
  readonly followers: FollowersResource;
  readonly analytics: AnalyticsResource;
  readonly tags: TagsResource;
  readonly trends: TrendsResource;
  readonly videos: VideosResource;
  readonly podcastEpisodes: PodcastEpisodesResource;
  readonly profileImages: ProfileImagesResource;
  readonly instance: InstanceResource;
  readonly subforems: SubforemsResource;
  readonly healthChecks: HealthChecksResource;
  readonly organizations: OrganizationsResource;
  readonly pages: PagesResource;
  readonly segments: SegmentsResource;
  readonly billboards: BillboardsResource;
  readonly concepts: ConceptsResource;
  readonly badges: BadgesResource;
  readonly badgeAchievements: BadgeAchievementsResource;
  readonly recommendedLists: RecommendedListsResource;
  readonly surveys: SurveysResource;
  readonly requestRedirects: RequestRedirectsResource;
  readonly feedbackMessages: FeedbackMessagesResource;
  readonly agentSessions: AgentSessionsResource;
  readonly listings: ListingsResource;

  private readonly http: HttpClient;

  constructor(options: HttpOptions = {}) {
    this.http = new HttpClient(options);

    this.articles = new ArticlesResource(this.http);
    this.users = new UsersResource(this.http);
    this.comments = new CommentsResource(this.http);
    this.reactions = new ReactionsResource(this.http);
    this.readingList = new ReadingListResource(this.http);
    this.follows = new FollowsResource(this.http);
    this.followers = new FollowersResource(this.http);
    this.analytics = new AnalyticsResource(this.http);
    this.tags = new TagsResource(this.http);
    this.trends = new TrendsResource(this.http);
    this.videos = new VideosResource(this.http);
    this.podcastEpisodes = new PodcastEpisodesResource(this.http);
    this.profileImages = new ProfileImagesResource(this.http);
    this.instance = new InstanceResource(this.http);
    this.subforems = new SubforemsResource(this.http);
    this.healthChecks = new HealthChecksResource(this.http);
    this.organizations = new OrganizationsResource(this.http);
    this.pages = new PagesResource(this.http);
    this.segments = new SegmentsResource(this.http);
    this.billboards = new BillboardsResource(this.http);
    this.concepts = new ConceptsResource(this.http);
    this.badges = new BadgesResource(this.http);
    this.badgeAchievements = new BadgeAchievementsResource(this.http);
    this.recommendedLists = new RecommendedListsResource(this.http);
    this.surveys = new SurveysResource(this.http);
    this.requestRedirects = new RequestRedirectsResource(this.http);
    this.feedbackMessages = new FeedbackMessagesResource(this.http);
    this.agentSessions = new AgentSessionsResource(this.http);
    this.listings = new ListingsResource(this.http);
  }

  /** The base URL this client talks to. */
  get baseUrl(): string {
    return this.http.baseUrl;
  }

  /**
   * Send any request. This is the escape hatch: it reaches every endpoint,
   * including ones added after this SDK was published.
   *
   * ```ts
   * await devto.request("POST", "/api/agent_sessions/presign");
   * ```
   */
  request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
    return this.http.request<T>(method, path, options);
  }

  /** Walk every page of a list endpoint. See `paginate` in `pagination.ts`. */
  paginate<T>(fetchPage: PageFetcher<T>, perPage?: number) {
    return paginate(fetchPage, perPage);
  }

  /** Like `paginate`, but returns one array. */
  pageAll<T>(fetchPage: PageFetcher<T>, perPage?: number) {
    return pageAll(fetchPage, perPage);
  }
}
