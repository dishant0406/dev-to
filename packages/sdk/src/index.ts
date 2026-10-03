/**
 * @dishant0406/dev-to — a typed TypeScript SDK for the Forem / dev.to API v1.
 *
 * The whole public surface is re-exported here. Nothing else is part of the API.
 */

export { DevToClient } from "./client.js";
export {
  HttpClient,
  buildUrl,
  API_VERSION_HEADER,
  DEFAULT_BASE_URL,
  DEFAULT_USER_AGENT,
} from "./http.js";
export type { HttpOptions, QueryParams, QueryValue, RequestOptions } from "./http.js";
export { Throttle, type ThrottleOptions } from "./throttle.js";
export { paginate, pageAll, DEFAULT_PER_PAGE } from "./pagination.js";
export type { PageFetcher, PageParams } from "./pagination.js";
export {
  AuthenticationError,
  ConflictError,
  ConnectionError,
  DevToError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  ServerError,
  ValidationError,
  type ErrorDetails,
} from "./errors.js";

export * from "./types.js";

export { ArticlesResource } from "./resources/articles.js";
export type {
  ListArticlesParams,
  PaginationParams,
  SearchArticlesParams,
} from "./resources/articles.js";
export { UsersResource } from "./resources/users.js";
export type {
  AdminBulkIdentityPayload,
  AdminCreateUserPayload,
  AdminIdentity,
  AdminIdentityPayload,
  AdminListUsersParams,
  AdminNote,
  AdminNotePayload,
  AdminNotificationSettingsPayload,
  AdminUpdateUserPayload,
  AdminUserStatusPayload,
} from "./resources/users.js";
export {
  CommentsResource,
  FollowersResource,
  FollowsResource,
  ReactionsResource,
  ReadingListResource,
} from "./resources/interactions.js";
export type { FollowParams, ListCommentsParams, ReactionParams } from "./resources/interactions.js";
export { AnalyticsResource } from "./resources/analytics.js";
export type { AnalyticsParams } from "./resources/analytics.js";
export {
  BillboardsResource,
  OrganizationsResource,
  PagesResource,
  SegmentsResource,
} from "./resources/content.js";
export type { OrganizationArticlesParams } from "./resources/content.js";
export {
  HealthChecksResource,
  InstanceResource,
  PodcastEpisodesResource,
  ProfileImagesResource,
  SubforemsResource,
  TagsResource,
  TrendsResource,
  VideosResource,
} from "./resources/discovery.js";
export type { HealthCheckName } from "./resources/discovery.js";
export {
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
